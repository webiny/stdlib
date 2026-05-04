import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const getYarnWorkspaces = require("get-yarn-workspaces") as (from: string) => string[];

export interface Workspace {
    dir: string;
    name: string;
}

interface WorkspacePackageJson {
    name: string;
}

/**
 * Returns the list of Yarn workspaces derived from the root package.json.
 * Each entry contains the package directory name and its npm package name.
 */
export function getWorkspaces(rootDir: string): Workspace[] {
    return getYarnWorkspaces(rootDir).map(absPath => {
        const dir = basename(absPath);
        const pkgJson = JSON.parse(
            readFileSync(join(absPath, "package.json"), "utf8")
        ) as WorkspacePackageJson;
        return { dir, name: pkgJson.name };
    });
}
