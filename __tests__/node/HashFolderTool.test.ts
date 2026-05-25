import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import {
    HashFolderTool,
    HashFolderToolFeature,
    createHashFolderTool,
    hashFolder
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

    it("returns a hex string for a folder with files", async () => {
        writeFileSync(join(tmpDir, "a.txt"), "hello");
        writeFileSync(join(tmpDir, "b.txt"), "world");

        const result = await tool.hash(tmpDir);
        expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it("returns a deterministic hash for the same content", async () => {
        writeFileSync(join(tmpDir, "file.txt"), "content");

        const hash1 = await tool.hash(tmpDir);
        const hash2 = await tool.hash(tmpDir);
        expect(hash1).toBe(hash2);
    });

    it("produces different hashes when file content changes", async () => {
        writeFileSync(join(tmpDir, "file.txt"), "version1");
        const hash1 = await tool.hash(tmpDir);

        writeFileSync(join(tmpDir, "file.txt"), "version2");
        const hash2 = await tool.hash(tmpDir);

        expect(hash1).not.toBe(hash2);
    });

    it("includes files in nested subdirectories", async () => {
        mkdirSync(join(tmpDir, "sub"), { recursive: true });
        writeFileSync(join(tmpDir, "sub", "nested.txt"), "deep");

        const hashWithNested = await tool.hash(tmpDir);

        writeFileSync(join(tmpDir, "sub", "nested.txt"), "changed");
        const hashAfterChange = await tool.hash(tmpDir);

        expect(hashWithNested).not.toBe(hashAfterChange);
    });

    it("excludes specified folders", async () => {
        writeFileSync(join(tmpDir, "keep.txt"), "kept");
        mkdirSync(join(tmpDir, "dist"), { recursive: true });
        writeFileSync(join(tmpDir, "dist", "bundle.js"), "compiled");

        const hashWithExclude = await tool.hash(tmpDir, { excludeFolders: ["dist"] });

        writeFileSync(join(tmpDir, "dist", "bundle.js"), "recompiled");
        const hashAfterDistChange = await tool.hash(tmpDir, { excludeFolders: ["dist"] });

        expect(hashWithExclude).toBe(hashAfterDistChange);
    });

    it("excludes specified files", async () => {
        writeFileSync(join(tmpDir, "source.ts"), "code");
        writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "info");

        const hashWithExclude = await tool.hash(tmpDir, {
            excludeFiles: ["tsconfig.build.tsbuildinfo"]
        });

        writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "updated-info");
        const hashAfterInfoChange = await tool.hash(tmpDir, {
            excludeFiles: ["tsconfig.build.tsbuildinfo"]
        });

        expect(hashWithExclude).toBe(hashAfterInfoChange);
    });

    it("excludes multiple folders and files together", async () => {
        writeFileSync(join(tmpDir, "source.ts"), "code");
        mkdirSync(join(tmpDir, "dist"), { recursive: true });
        mkdirSync(join(tmpDir, "node_modules"), { recursive: true });
        writeFileSync(join(tmpDir, "dist", "out.js"), "compiled");
        writeFileSync(join(tmpDir, "node_modules", "dep.js"), "dep");
        writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "info");

        const hash1 = await tool.hash(tmpDir, {
            excludeFolders: ["dist", "node_modules"],
            excludeFiles: ["tsconfig.build.tsbuildinfo"]
        });

        writeFileSync(join(tmpDir, "dist", "out.js"), "recompiled");
        writeFileSync(join(tmpDir, "node_modules", "dep.js"), "updated-dep");
        writeFileSync(join(tmpDir, "tsconfig.build.tsbuildinfo"), "new-info");

        const hash2 = await tool.hash(tmpDir, {
            excludeFolders: ["dist", "node_modules"],
            excludeFiles: ["tsconfig.build.tsbuildinfo"]
        });

        expect(hash1).toBe(hash2);
    });

    it("is order-independent — same files in different creation order produce same hash", async () => {
        const dir1 = join(tmpDir, "dir1");
        const dir2 = join(tmpDir, "dir2");
        mkdirSync(dir1, { recursive: true });
        mkdirSync(dir2, { recursive: true });

        writeFileSync(join(dir1, "a.txt"), "alpha");
        writeFileSync(join(dir1, "b.txt"), "beta");

        writeFileSync(join(dir2, "b.txt"), "beta");
        writeFileSync(join(dir2, "a.txt"), "alpha");

        const hash1 = await tool.hash(dir1);
        const hash2 = await tool.hash(dir2);
        expect(hash1).toBe(hash2);
    });

    it("returns a hash for an empty folder", async () => {
        const result = await tool.hash(tmpDir);
        expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it("includes relative path in the hash so renames are detected", async () => {
        writeFileSync(join(tmpDir, "original.txt"), "content");
        const hash1 = await tool.hash(tmpDir);

        rmSync(join(tmpDir, "original.txt"));
        writeFileSync(join(tmpDir, "renamed.txt"), "content");
        const hash2 = await tool.hash(tmpDir);

        expect(hash1).not.toBe(hash2);
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

    it("creates a working tool without arguments", async () => {
        const tool = createHashFolderTool();
        writeFileSync(join(tmpDir, "file.txt"), "content");
        const result = await tool.hash(tmpDir);
        expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces a deterministic hash", async () => {
        writeFileSync(join(tmpDir, "file.txt"), "content");
        const hash1 = await createHashFolderTool().hash(tmpDir);
        const hash2 = await createHashFolderTool().hash(tmpDir);
        expect(hash1).toBe(hash2);
    });
});

describe("hashFolder", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-hash-standalone-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns a hash string directly", async () => {
        writeFileSync(join(tmpDir, "file.txt"), "content");
        const result = await hashFolder(tmpDir);
        expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it("supports exclude options", async () => {
        writeFileSync(join(tmpDir, "source.ts"), "code");
        mkdirSync(join(tmpDir, "dist"), { recursive: true });
        writeFileSync(join(tmpDir, "dist", "out.js"), "compiled");

        const hash1 = await hashFolder(tmpDir, { excludeFolders: ["dist"] });

        writeFileSync(join(tmpDir, "dist", "out.js"), "recompiled");
        const hash2 = await hashFolder(tmpDir, { excludeFolders: ["dist"] });

        expect(hash1).toBe(hash2);
    });

    it("produces the same hash as the DI tool", async () => {
        writeFileSync(join(tmpDir, "file.txt"), "content");

        const tool = createHashFolderTool();
        const diHash = await tool.hash(tmpDir);
        const standaloneHash = await hashFolder(tmpDir);

        expect(standaloneHash).toBe(diHash);
    });
});
