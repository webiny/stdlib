import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
    WorkspaceTool as WorkspaceToolAbstraction,
    type ListWorkspacesParams,
    type WorkspaceInfo
} from "./abstractions/WorkspaceTool.js";
import { WorkspaceRootNotFoundError } from "./abstractions/errors.js";
import { createGlobTool } from "~/node/features/GlobTool/index.js";

function getWorkspacePatterns(workspaces: unknown): string[] | null {
    if (Array.isArray(workspaces)) {
        return workspaces;
    }
    if (workspaces !== null && typeof workspaces === "object" && "packages" in workspaces) {
        const packages = (workspaces as Record<string, unknown>)["packages"];
        if (Array.isArray(packages)) {
            return packages as string[];
        }
    }
    return null;
}

function findWorkspaceRoot(from: string): { root: string; patterns: string[] } {
    let current = resolve(from);

    while (true) {
        const pkgPath = join(current, "package.json");
        if (existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
                const patterns = getWorkspacePatterns(pkg["workspaces"]);
                if (patterns !== null) {
                    return { root: current, patterns };
                }
            } catch {
                // malformed package.json, keep walking
            }
        }

        const parent = dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }

    throw new WorkspaceRootNotFoundError({
        message: `No package.json with a workspaces field found from "${from}"`
    });
}

function readWorkspaceName(dir: string): string {
    const pkgPath = join(dir, "package.json");
    try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
        const name = pkg["name"];
        if (typeof name === "string" && name.length > 0) {
            return name;
        }
    } catch {
        // fall through to folder name
    }
    return basename(dir);
}

class WorkspaceToolImpl implements WorkspaceToolAbstraction.Interface {
    private readonly glob;

    public constructor() {
        this.glob = createGlobTool();
    }

    public list(params?: ListWorkspacesParams): WorkspaceInfo[] {
        const cwd = params?.cwd ?? process.cwd();
        const { root, patterns } = findWorkspaceRoot(cwd);

        const globPatterns = patterns.map(p => p.replace(/\\/g, "/"));
        const matched = this.glob.findDirectories(globPatterns, {
            cwd: root,
            absolute: true
        });

        const workspaces: WorkspaceInfo[] = [];
        for (const dir of matched) {
            if (!existsSync(join(dir, "package.json"))) {
                continue;
            }
            workspaces.push({
                name: readWorkspaceName(dir),
                path: dir
            });
        }

        return workspaces;
    }
}

export const WorkspaceTool = WorkspaceToolAbstraction.createImplementation({
    implementation: WorkspaceToolImpl,
    dependencies: []
});

export function createWorkspaceTool(): WorkspaceToolAbstraction.Interface {
    return new WorkspaceToolImpl();
}

export function listWorkspaces(params?: ListWorkspacesParams): WorkspaceInfo[] {
    return new WorkspaceToolImpl().list(params);
}
