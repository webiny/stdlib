import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import {
    GlobTool,
    GlobToolFeature,
    createGlobTool
} from "../../src/node/features/GlobTool/index.js";

function makeContainer(): Container {
    const container = new Container();
    GlobToolFeature.register(container);
    return container;
}

describe("GlobTool", () => {
    let tmpDir: string;
    let tool: GlobTool.Interface;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-glob-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
        tool = makeContainer().resolve(GlobTool);
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    describe("findFiles", () => {
        it("returns files matching a pattern", () => {
            writeFileSync(join(tmpDir, "a.ts"), "");
            writeFileSync(join(tmpDir, "b.ts"), "");
            writeFileSync(join(tmpDir, "c.json"), "{}");

            const result = tool.findFiles("**/*.ts", { cwd: tmpDir });
            expect(result.sort()).toEqual(["a.ts", "b.ts"]);
        });

        it("returns empty array when nothing matches", () => {
            writeFileSync(join(tmpDir, "a.txt"), "");
            const result = tool.findFiles("**/*.ts", { cwd: tmpDir });
            expect(result).toEqual([]);
        });

        it("supports nested directory patterns", () => {
            mkdirSync(join(tmpDir, "src", "lib"), { recursive: true });
            writeFileSync(join(tmpDir, "src", "index.ts"), "");
            writeFileSync(join(tmpDir, "src", "lib", "utils.ts"), "");

            const result = tool.findFiles("src/**/*.ts", { cwd: tmpDir });
            expect(result.sort()).toEqual(["src/index.ts", "src/lib/utils.ts"]);
        });

        it("respects ignore option", () => {
            mkdirSync(join(tmpDir, "node_modules"), { recursive: true });
            writeFileSync(join(tmpDir, "index.ts"), "");
            writeFileSync(join(tmpDir, "node_modules", "dep.ts"), "");

            const result = tool.findFiles("**/*.ts", {
                cwd: tmpDir,
                ignore: ["node_modules/**"]
            });
            expect(result).toEqual(["index.ts"]);
        });

        it("finds dot files when dot option is set", () => {
            writeFileSync(join(tmpDir, ".hidden.ts"), "");
            writeFileSync(join(tmpDir, "visible.ts"), "");

            const withDot = tool.findFiles("**/*.ts", { cwd: tmpDir, dot: true });
            expect(withDot.sort()).toEqual([".hidden.ts", "visible.ts"]);

            const withoutDot = tool.findFiles("**/*.ts", { cwd: tmpDir, dot: false });
            expect(withoutDot).toEqual(["visible.ts"]);
        });

        it("accepts an array of patterns", () => {
            writeFileSync(join(tmpDir, "a.ts"), "");
            writeFileSync(join(tmpDir, "b.json"), "{}");
            writeFileSync(join(tmpDir, "c.txt"), "");

            const result = tool.findFiles(["**/*.ts", "**/*.json"], { cwd: tmpDir });
            expect(result.sort()).toEqual(["a.ts", "b.json"]);
        });
    });

    describe("findDirectories", () => {
        it("returns directories matching a pattern", () => {
            mkdirSync(join(tmpDir, "src"), { recursive: true });
            mkdirSync(join(tmpDir, "lib"), { recursive: true });
            writeFileSync(join(tmpDir, "file.ts"), "");

            const result = tool.findDirectories("*", { cwd: tmpDir });
            expect(result.sort()).toEqual(["lib", "src"]);
        });

        it("returns empty array when no directories match", () => {
            writeFileSync(join(tmpDir, "file.ts"), "");
            const result = tool.findDirectories("nonexistent*", { cwd: tmpDir });
            expect(result).toEqual([]);
        });

        it("finds nested directories", () => {
            mkdirSync(join(tmpDir, "a", "b", "c"), { recursive: true });

            const result = tool.findDirectories("**/*", { cwd: tmpDir });
            expect(result.sort()).toEqual(["a", "a/b", "a/b/c"]);
        });
    });

    describe("findAll", () => {
        it("returns all matching entries", () => {
            writeFileSync(join(tmpDir, "a.ts"), "");
            writeFileSync(join(tmpDir, "b.ts"), "");

            const result = tool.findAll("**/*.ts", { cwd: tmpDir });
            expect(result.sort()).toEqual(["a.ts", "b.ts"]);
        });

        it("returns empty array when nothing matches", () => {
            const result = tool.findAll("nonexistent*", { cwd: tmpDir });
            expect(result).toEqual([]);
        });

        it("can include both files and directories with onlyFiles: false", () => {
            mkdirSync(join(tmpDir, "subdir"), { recursive: true });
            writeFileSync(join(tmpDir, "file.ts"), "");

            const result = tool.findAll("*", { cwd: tmpDir, onlyFiles: false });
            expect(result.sort()).toEqual(["file.ts", "subdir"]);
        });
    });
});

describe("createGlobTool", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-glob-factory-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("creates a working tool without DI", () => {
        const tool = createGlobTool();
        writeFileSync(join(tmpDir, "test.ts"), "");
        const result = tool.findFiles("**/*.ts", { cwd: tmpDir });
        expect(result).toEqual(["test.ts"]);
    });
});
