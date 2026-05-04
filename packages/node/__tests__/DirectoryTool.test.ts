import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import {
    DirectoryTool,
    DirectoryToolFeature,
    createDirectoryTool
} from "../src/features/DirectoryTool/index.js";
import { PinoLoggerConfig, PinoLoggerFeature } from "../src/features/PinoLogger/index.js";

function makeContainer(): Container {
    const container = new Container();
    container.registerInstance(PinoLoggerConfig, {
        getConfig: () => ({ logLevel: "error" as const, transport: "json" as const })
    });
    PinoLoggerFeature.register(container);
    DirectoryToolFeature.register(container);
    return container;
}

describe("DirectoryTool", () => {
    let tmpDir: string;
    let tool: DirectoryTool.Interface;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-dir-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
        tool = makeContainer().resolve(DirectoryTool);
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    describe("exists", () => {
        it("returns true for an existing directory", () => {
            expect(tool.exists(tmpDir)).toBe(true);
        });

        it("returns false for a missing path", () => {
            expect(tool.exists(join(tmpDir, "nonexistent"))).toBe(false);
        });
    });

    describe("create", () => {
        it("creates a new directory", () => {
            const dir = join(tmpDir, "new-dir");
            tool.create(dir);
            expect(existsSync(dir)).toBe(true);
        });

        it("creates nested directories", () => {
            const dir = join(tmpDir, "a", "b", "c");
            tool.create(dir);
            expect(existsSync(dir)).toBe(true);
        });

        it("is idempotent on existing directories", () => {
            tool.create(tmpDir);
            expect(() => tool.create(tmpDir)).not.toThrow();
        });
    });

    describe("readDir", () => {
        it("returns file and directory names", () => {
            mkdirSync(join(tmpDir, "alpha"));
            writeFileSync(join(tmpDir, "beta.txt"), "x");
            const entries = tool.readDir(tmpDir);
            expect(entries).toContain("alpha");
            expect(entries).toContain("beta.txt");
        });

        it("returns null for a missing directory", () => {
            expect(tool.readDir(join(tmpDir, "missing"))).toBeNull();
        });
    });

    describe("readDirOrThrow", () => {
        it("returns entries for an existing directory", () => {
            mkdirSync(join(tmpDir, "item"));
            expect(tool.readDirOrThrow(tmpDir)).toContain("item");
        });

        it("throws for a missing directory", () => {
            expect(() => tool.readDirOrThrow(join(tmpDir, "missing"))).toThrow();
        });
    });

    describe("remove", () => {
        it("deletes a directory and its contents", () => {
            const dir = join(tmpDir, "to-remove");
            mkdirSync(join(dir, "nested"), { recursive: true });
            tool.remove(dir);
            expect(existsSync(dir)).toBe(false);
        });

        it("does not throw for a missing path", () => {
            expect(() => tool.remove(join(tmpDir, "missing"))).not.toThrow();
        });
    });

    describe("copy", () => {
        it("duplicates a directory tree", () => {
            const src = join(tmpDir, "src");
            const dest = join(tmpDir, "dest");
            mkdirSync(join(src, "sub"), { recursive: true });
            writeFileSync(join(src, "file.txt"), "content");
            tool.copy(src, dest);
            expect(existsSync(join(dest, "sub"))).toBe(true);
            expect(existsSync(join(dest, "file.txt"))).toBe(true);
        });

        it("does not throw when source is missing", () => {
            expect(() => tool.copy(join(tmpDir, "missing"), join(tmpDir, "dest"))).not.toThrow();
        });
    });

    describe("copyOrThrow", () => {
        it("throws when source is missing", () => {
            expect(() => tool.copyOrThrow(join(tmpDir, "missing"), join(tmpDir, "dest"))).toThrow();
        });
    });

    describe("glob", () => {
        beforeEach(() => {
            mkdirSync(join(tmpDir, "src"), { recursive: true });
            mkdirSync(join(tmpDir, "src", "nested"), { recursive: true });
            writeFileSync(join(tmpDir, "src", "index.ts"), "");
            writeFileSync(join(tmpDir, "src", "util.ts"), "");
            writeFileSync(join(tmpDir, "src", "nested", "deep.ts"), "");
            writeFileSync(join(tmpDir, "src", ".hidden"), "");
        });

        it("returns matching files relative to cwd", () => {
            const result = tool.glob(join(tmpDir, "src"), "*.ts");
            expect(result).toContain("index.ts");
            expect(result).toContain("util.ts");
            expect(result).not.toContain("nested/deep.ts");
        });

        it("matches recursively with **", () => {
            const result = tool.glob(join(tmpDir, "src"), "**/*.ts");
            expect(result).toContain("index.ts");
            expect(result).toContain("nested/deep.ts");
        });

        it("returns empty array for non-existent cwd", () => {
            expect(tool.glob(join(tmpDir, "missing"), "**/*")).toEqual([]);
        });

        it("returns empty array when nothing matches", () => {
            expect(tool.glob(join(tmpDir, "src"), "*.json")).toEqual([]);
        });

        it("excludes dotfiles by default", () => {
            const result = tool.glob(join(tmpDir, "src"), "*");
            expect(result).not.toContain(".hidden");
        });

        it("includes dotfiles when dot: true", () => {
            const result = tool.glob(join(tmpDir, "src"), "*", { dot: true });
            expect(result).toContain(".hidden");
        });

        it("respects ignore option", () => {
            const result = tool.glob(join(tmpDir, "src"), "**/*.ts", { ignore: ["nested/**"] });
            expect(result).not.toContain("nested/deep.ts");
            expect(result).toContain("index.ts");
        });

        it("returns absolute paths when absolute: true", () => {
            const result = tool.glob(join(tmpDir, "src"), "*.ts", { absolute: true });
            expect(result[0]).toMatch(/^\//);
        });

        it("accepts an array of patterns", () => {
            const result = tool.glob(join(tmpDir, "src"), ["index.ts", "util.ts"]);
            expect(result).toContain("index.ts");
            expect(result).toContain("util.ts");
        });
    });
});

describe("createDirectoryTool", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-dir-factory-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("creates a working tool without arguments", () => {
        const tool = createDirectoryTool();
        const dir = join(tmpDir, "factory-dir");
        tool.create(dir);
        expect(existsSync(dir)).toBe(true);
    });

    it("accepts a custom logger", () => {
        const messages: string[] = [];
        const logger = {
            debug: () => {},
            info: () => {},
            warn: (msg: string) => {
                messages.push(msg);
            },
            error: () => {},
            fatal: () => {},
            child: () => logger
        };
        const tool = createDirectoryTool({ logger });
        tool.readDir(join(tmpDir, "missing"));
        expect(messages.length).toBeGreaterThan(0);
    });
});
