import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { Container } from "@webiny/di";
import { PinoLoggerConfig, PinoLoggerFeature } from "../../src/node/features/PinoLogger/index.js";
import {
    WorkspaceTool,
    WorkspaceToolFeature,
    createWorkspaceTool,
    listWorkspaces,
    WorkspaceRootNotFoundError
} from "../../src/node/features/WorkspaceTool/index.js";

function makeContainer(): Container {
    const container = new Container();
    container.registerInstance(PinoLoggerConfig, {
        getConfig: () => ({ logLevel: "error" as const, transport: "json" as const })
    });
    PinoLoggerFeature.register(container);
    WorkspaceToolFeature.register(container);
    return container;
}

function writePackageJson(dir: string, content: Record<string, unknown>): void {
    writeFileSync(join(dir, "package.json"), JSON.stringify(content, null, 2));
}

let tmpDir: string;

beforeEach(() => {
    tmpDir = join(tmpdir(), `wby-test-workspace-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    tmpDir = realpathSync(tmpDir);
});

afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
});

describe("WorkspaceTool", () => {
    let tool: WorkspaceTool.Interface;

    beforeEach(() => {
        tool = makeContainer().resolve(WorkspaceTool);
    });

    describe("list", () => {
        it("should list workspaces from flat array format", () => {
            writePackageJson(tmpDir, {
                name: "root",
                workspaces: ["packages/*"]
            });

            const pkgA = join(tmpDir, "packages", "pkg-a");
            const pkgB = join(tmpDir, "packages", "pkg-b");
            mkdirSync(pkgA, { recursive: true });
            mkdirSync(pkgB, { recursive: true });
            writePackageJson(pkgA, { name: "@scope/pkg-a" });
            writePackageJson(pkgB, { name: "@scope/pkg-b" });

            const result = tool.list({ cwd: tmpDir });

            expect(result).toHaveLength(2);
            expect(result).toEqual(
                expect.arrayContaining([
                    { name: "@scope/pkg-a", path: pkgA },
                    { name: "@scope/pkg-b", path: pkgB }
                ])
            );
        });

        it("should list workspaces from { packages: [] } format", () => {
            writePackageJson(tmpDir, {
                name: "root",
                workspaces: { packages: ["packages/*"] }
            });

            const pkgA = join(tmpDir, "packages", "pkg-a");
            mkdirSync(pkgA, { recursive: true });
            writePackageJson(pkgA, { name: "pkg-a" });

            const result = tool.list({ cwd: tmpDir });

            expect(result).toEqual([{ name: "pkg-a", path: pkgA }]);
        });

        it("should skip directories without package.json", () => {
            writePackageJson(tmpDir, {
                name: "root",
                workspaces: ["packages/*"]
            });

            const withPkg = join(tmpDir, "packages", "has-pkg");
            const noPkg = join(tmpDir, "packages", "no-pkg");
            mkdirSync(withPkg, { recursive: true });
            mkdirSync(noPkg, { recursive: true });
            writePackageJson(withPkg, { name: "has-pkg" });

            const result = tool.list({ cwd: tmpDir });

            expect(result).toEqual([{ name: "has-pkg", path: withPkg }]);
        });

        it("should fall back to folder name when package.json has no name", () => {
            writePackageJson(tmpDir, {
                name: "root",
                workspaces: ["packages/*"]
            });

            const pkg = join(tmpDir, "packages", "unnamed-pkg");
            mkdirSync(pkg, { recursive: true });
            writePackageJson(pkg, { version: "1.0.0" });

            const result = tool.list({ cwd: tmpDir });

            expect(result).toEqual([{ name: "unnamed-pkg", path: pkg }]);
        });

        it("should walk up to find root package.json with workspaces", () => {
            writePackageJson(tmpDir, {
                name: "root",
                workspaces: ["packages/*"]
            });

            const pkgA = join(tmpDir, "packages", "pkg-a");
            mkdirSync(pkgA, { recursive: true });
            writePackageJson(pkgA, { name: "pkg-a" });

            const nested = join(tmpDir, "packages", "pkg-a", "src");
            mkdirSync(nested, { recursive: true });

            const result = tool.list({ cwd: nested });

            expect(result).toEqual([{ name: "pkg-a", path: pkgA }]);
        });

        it("should handle multiple glob patterns", () => {
            writePackageJson(tmpDir, {
                name: "root",
                workspaces: ["packages/*", "apps/*"]
            });

            const pkg = join(tmpDir, "packages", "lib");
            const app = join(tmpDir, "apps", "web");
            mkdirSync(pkg, { recursive: true });
            mkdirSync(app, { recursive: true });
            writePackageJson(pkg, { name: "lib" });
            writePackageJson(app, { name: "web" });

            const result = tool.list({ cwd: tmpDir });

            expect(result).toHaveLength(2);
            expect(result).toEqual(
                expect.arrayContaining([
                    { name: "lib", path: pkg },
                    { name: "web", path: app }
                ])
            );
        });

        it("should return empty array when workspaces pattern matches nothing", () => {
            writePackageJson(tmpDir, {
                name: "root",
                workspaces: ["nonexistent/*"]
            });

            const result = tool.list({ cwd: tmpDir });

            expect(result).toEqual([]);
        });

        it("should throw WorkspaceRootNotFoundError when no root with workspaces found", () => {
            const isolated = join(tmpDir, "isolated");
            mkdirSync(isolated, { recursive: true });
            writePackageJson(isolated, { name: "no-workspaces" });

            expect(() => tool.list({ cwd: isolated })).toThrow(WorkspaceRootNotFoundError);
        });

        it("should default cwd to process.cwd() when no params given", () => {
            const originalCwd = process.cwd();
            try {
                writePackageJson(tmpDir, {
                    name: "root",
                    workspaces: ["packages/*"]
                });
                const pkg = join(tmpDir, "packages", "my-pkg");
                mkdirSync(pkg, { recursive: true });
                writePackageJson(pkg, { name: "my-pkg" });

                process.chdir(tmpDir);

                const result = tool.list();

                expect(result).toEqual([{ name: "my-pkg", path: pkg }]);
            } finally {
                process.chdir(originalCwd);
            }
        });

        it("should return absolute paths", () => {
            writePackageJson(tmpDir, {
                name: "root",
                workspaces: ["packages/*"]
            });

            const pkg = join(tmpDir, "packages", "abs-test");
            mkdirSync(pkg, { recursive: true });
            writePackageJson(pkg, { name: "abs-test" });

            const result = tool.list({ cwd: tmpDir });

            for (const ws of result) {
                expect(ws.path).toMatch(/^\//);
            }
        });
    });
});

describe("createWorkspaceTool (factory)", () => {
    it("should create a working tool instance", () => {
        writePackageJson(tmpDir, {
            name: "root",
            workspaces: ["packages/*"]
        });

        const pkg = join(tmpDir, "packages", "factory-test");
        mkdirSync(pkg, { recursive: true });
        writePackageJson(pkg, { name: "factory-test" });

        const tool = createWorkspaceTool();
        const result = tool.list({ cwd: tmpDir });

        expect(result).toEqual([{ name: "factory-test", path: pkg }]);
    });
});

describe("listWorkspaces (standalone)", () => {
    it("should work identically to DI version", () => {
        writePackageJson(tmpDir, {
            name: "root",
            workspaces: ["packages/*"]
        });

        const pkg = join(tmpDir, "packages", "standalone-test");
        mkdirSync(pkg, { recursive: true });
        writePackageJson(pkg, { name: "standalone-test" });

        const result = listWorkspaces({ cwd: tmpDir });

        expect(result).toEqual([{ name: "standalone-test", path: pkg }]);
    });
});
