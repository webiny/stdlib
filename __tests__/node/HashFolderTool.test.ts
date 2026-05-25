import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import {
    HashFolderTool,
    HashFolderToolFeature,
    createHashFolderTool,
    hashFolder,
    hashFolderAsync
} from "../../src/node/features/HashFolderTool/index.js";

function makeContainer(): Container {
    const container = new Container();
    HashFolderToolFeature.register(container);
    return container;
}

describe("HashFolderTool", () => {
    let tmpDir: string;
    let tool: HashFolderTool.Interface;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-hash-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
        tool = makeContainer().resolve(HashFolderTool);
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    describe("hash (sync)", () => {
        it("returns a result with a hex hash", () => {
            writeFileSync(join(tmpDir, "a.txt"), "hello");
            writeFileSync(join(tmpDir, "b.txt"), "world");

            const result = tool.hash(tmpDir);
            expect(result).toEqual({ hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
        });

        it("returns a deterministic hash for the same content", () => {
            writeFileSync(join(tmpDir, "file.txt"), "content");

            const result1 = tool.hash(tmpDir);
            const result2 = tool.hash(tmpDir);
            expect(result1).toEqual(result2);
        });

        it("produces different hashes when file content changes", () => {
            writeFileSync(join(tmpDir, "file.txt"), "version1");
            const result1 = tool.hash(tmpDir);

            writeFileSync(join(tmpDir, "file.txt"), "version2");
            const result2 = tool.hash(tmpDir);

            expect(result1).not.toEqual(result2);
        });

        it("includes files in nested subdirectories", () => {
            mkdirSync(join(tmpDir, "sub"), { recursive: true });
            writeFileSync(join(tmpDir, "sub", "nested.txt"), "deep");

            const result1 = tool.hash(tmpDir);

            writeFileSync(join(tmpDir, "sub", "nested.txt"), "changed");
            const result2 = tool.hash(tmpDir);

            expect(result1).not.toEqual(result2);
        });

        it("excludes specified folders", () => {
            writeFileSync(join(tmpDir, "keep.txt"), "kept");
            mkdirSync(join(tmpDir, "dist"), { recursive: true });
            writeFileSync(join(tmpDir, "dist", "bundle.js"), "compiled");

            const result1 = tool.hash(tmpDir, { excludeFolders: ["dist"] });

            writeFileSync(join(tmpDir, "dist", "bundle.js"), "recompiled");
            const result2 = tool.hash(tmpDir, { excludeFolders: ["dist"] });

            expect(result1).toEqual(result2);
        });

        it("excludes specified files", () => {
            writeFileSync(join(tmpDir, "source.ts"), "code");
            writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "info");

            const result1 = tool.hash(tmpDir, {
                excludeFiles: ["tsconfig.build.tsbuildinfo"]
            });

            writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "updated-info");
            const result2 = tool.hash(tmpDir, {
                excludeFiles: ["tsconfig.build.tsbuildinfo"]
            });

            expect(result1).toEqual(result2);
        });

        it("excludes multiple folders and files together", () => {
            writeFileSync(join(tmpDir, "source.ts"), "code");
            mkdirSync(join(tmpDir, "dist"), { recursive: true });
            mkdirSync(join(tmpDir, "node_modules"), { recursive: true });
            writeFileSync(join(tmpDir, "dist", "out.js"), "compiled");
            writeFileSync(join(tmpDir, "node_modules", "dep.js"), "dep");
            writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "info");

            const result1 = tool.hash(tmpDir, {
                excludeFolders: ["dist", "node_modules"],
                excludeFiles: ["tsconfig.build.tsbuildinfo"]
            });

            writeFileSync(join(tmpDir, "dist", "out.js"), "recompiled");
            writeFileSync(join(tmpDir, "node_modules", "dep.js"), "updated-dep");
            writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "new-info");

            const result2 = tool.hash(tmpDir, {
                excludeFolders: ["dist", "node_modules"],
                excludeFiles: ["tsconfig.build.tsbuildinfo"]
            });

            expect(result1).toEqual(result2);
        });

        it("is order-independent — same files in different creation order produce same hash", () => {
            const dir1 = join(tmpDir, "dir1");
            const dir2 = join(tmpDir, "dir2");
            mkdirSync(dir1, { recursive: true });
            mkdirSync(dir2, { recursive: true });

            writeFileSync(join(dir1, "a.txt"), "alpha");
            writeFileSync(join(dir1, "b.txt"), "beta");

            writeFileSync(join(dir2, "b.txt"), "beta");
            writeFileSync(join(dir2, "a.txt"), "alpha");

            const result1 = tool.hash(dir1);
            const result2 = tool.hash(dir2);
            expect(result1).toEqual(result2);
        });

        it("returns a hash for an empty folder", () => {
            const result = tool.hash(tmpDir);
            expect(result).toEqual({ hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
        });

        it("includes relative path in the hash so renames are detected", () => {
            writeFileSync(join(tmpDir, "original.txt"), "content");
            const result1 = tool.hash(tmpDir);

            rmSync(join(tmpDir, "original.txt"));
            writeFileSync(join(tmpDir, "renamed.txt"), "content");
            const result2 = tool.hash(tmpDir);

            expect(result1).not.toEqual(result2);
        });
    });

    describe("hashAsync (parallel)", () => {
        it("returns a result with a hex hash", async () => {
            writeFileSync(join(tmpDir, "a.txt"), "hello");
            writeFileSync(join(tmpDir, "b.txt"), "world");

            const result = await tool.hashAsync(tmpDir);
            expect(result).toEqual({ hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
        });

        it("returns a deterministic hash for the same content", async () => {
            writeFileSync(join(tmpDir, "file.txt"), "content");

            const result1 = await tool.hashAsync(tmpDir);
            const result2 = await tool.hashAsync(tmpDir);
            expect(result1).toEqual(result2);
        });

        it("excludes specified folders and files", async () => {
            writeFileSync(join(tmpDir, "source.ts"), "code");
            mkdirSync(join(tmpDir, "dist"), { recursive: true });
            writeFileSync(join(tmpDir, "dist", "out.js"), "compiled");
            writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "info");

            const result1 = await tool.hashAsync(tmpDir, {
                excludeFolders: ["dist"],
                excludeFiles: ["tsconfig.build.tsbuildinfo"]
            });

            writeFileSync(join(tmpDir, "dist", "out.js"), "recompiled");
            writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "new-info");

            const result2 = await tool.hashAsync(tmpDir, {
                excludeFolders: ["dist"],
                excludeFiles: ["tsconfig.build.tsbuildinfo"]
            });

            expect(result1).toEqual(result2);
        });

        it("produces the same result as the sync method", async () => {
            writeFileSync(join(tmpDir, "a.txt"), "alpha");
            mkdirSync(join(tmpDir, "sub"), { recursive: true });
            writeFileSync(join(tmpDir, "sub", "b.txt"), "beta");

            const syncResult = tool.hash(tmpDir);
            const asyncResult = await tool.hashAsync(tmpDir);
            expect(asyncResult).toEqual(syncResult);
        });

        it("returns a hash for an empty folder", async () => {
            const result = await tool.hashAsync(tmpDir);
            expect(result).toEqual({ hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
        });
    });
});

describe("createHashFolderTool", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-hash-factory-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("creates a working tool (sync)", () => {
        const tool = createHashFolderTool();
        writeFileSync(join(tmpDir, "file.txt"), "content");
        const result = tool.hash(tmpDir);
        expect(result).toEqual({ hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    });

    it("creates a working tool (async)", async () => {
        const tool = createHashFolderTool();
        writeFileSync(join(tmpDir, "file.txt"), "content");
        const result = await tool.hashAsync(tmpDir);
        expect(result).toEqual({ hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    });
});

describe("hashFolder (sync standalone)", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-hash-standalone-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns a result object", () => {
        writeFileSync(join(tmpDir, "file.txt"), "content");
        const result = hashFolder(tmpDir);
        expect(result).toEqual({ hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    });

    it("supports exclude options", () => {
        writeFileSync(join(tmpDir, "source.ts"), "code");
        mkdirSync(join(tmpDir, "dist"), { recursive: true });
        writeFileSync(join(tmpDir, "dist", "out.js"), "compiled");

        const result1 = hashFolder(tmpDir, { excludeFolders: ["dist"] });

        writeFileSync(join(tmpDir, "dist", "out.js"), "recompiled");
        const result2 = hashFolder(tmpDir, { excludeFolders: ["dist"] });

        expect(result1).toEqual(result2);
    });

    it("produces the same result as the DI tool", () => {
        writeFileSync(join(tmpDir, "file.txt"), "content");

        const tool = createHashFolderTool();
        const diResult = tool.hash(tmpDir);
        const standaloneResult = hashFolder(tmpDir);

        expect(standaloneResult).toEqual(diResult);
    });
});

describe("hashFolderAsync (async standalone)", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-hash-async-standalone-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns a result object", async () => {
        writeFileSync(join(tmpDir, "file.txt"), "content");
        const result = await hashFolderAsync(tmpDir);
        expect(result).toEqual({ hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    });

    it("supports exclude options", async () => {
        writeFileSync(join(tmpDir, "source.ts"), "code");
        mkdirSync(join(tmpDir, "dist"), { recursive: true });
        writeFileSync(join(tmpDir, "dist", "out.js"), "compiled");

        const result1 = await hashFolderAsync(tmpDir, { excludeFolders: ["dist"] });

        writeFileSync(join(tmpDir, "dist", "out.js"), "recompiled");
        const result2 = await hashFolderAsync(tmpDir, { excludeFolders: ["dist"] });

        expect(result1).toEqual(result2);
    });

    it("produces the same result as sync standalone", async () => {
        writeFileSync(join(tmpDir, "file.txt"), "content");
        mkdirSync(join(tmpDir, "sub"), { recursive: true });
        writeFileSync(join(tmpDir, "sub", "nested.txt"), "nested");

        const syncResult = hashFolder(tmpDir);
        const asyncResult = await hashFolderAsync(tmpDir);

        expect(asyncResult).toEqual(syncResult);
    });
});
