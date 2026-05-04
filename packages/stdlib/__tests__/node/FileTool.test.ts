import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import { FileTool, FileToolFeature, createFileTool } from "../../src/node/features/FileTool/index.js";
import { DirectoryToolFeature, createDirectoryTool } from "../../src/node/features/DirectoryTool/index.js";
import { PinoLoggerConfig, PinoLoggerFeature } from "../../src/node/features/PinoLogger/index.js";

function makeContainer(): Container {
    const container = new Container();
    container.registerInstance(PinoLoggerConfig, {
        getConfig: () => ({ logLevel: "error" as const, transport: "json" as const })
    });
    PinoLoggerFeature.register(container);
    DirectoryToolFeature.register(container);
    FileToolFeature.register(container);
    return container;
}

describe("FileTool", () => {
    let tmpDir: string;
    let tool: FileTool.Interface;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-file-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
        tool = makeContainer().resolve(FileTool);
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    describe("exists", () => {
        it("returns true for an existing file", () => {
            const file = join(tmpDir, "test.txt");
            writeFileSync(file, "content");
            expect(tool.exists(file)).toBe(true);
        });

        it("returns false for a missing file", () => {
            expect(tool.exists(join(tmpDir, "missing.txt"))).toBe(false);
        });
    });

    describe("readFile", () => {
        it("returns file content as a string", () => {
            const file = join(tmpDir, "test.txt");
            writeFileSync(file, "hello world");
            expect(tool.readFile(file)).toBe("hello world");
        });

        it("returns null for a missing file", () => {
            expect(tool.readFile(join(tmpDir, "missing.txt"))).toBeNull();
        });
    });

    describe("readFileOrThrow", () => {
        it("returns content for an existing file", () => {
            const file = join(tmpDir, "test.txt");
            writeFileSync(file, "data");
            expect(tool.readFileOrThrow(file)).toBe("data");
        });

        it("throws for a missing file", () => {
            expect(() => tool.readFileOrThrow(join(tmpDir, "missing.txt"))).toThrow();
        });
    });

    describe("writeFile", () => {
        it("creates a file with the given content", () => {
            const file = join(tmpDir, "new.txt");
            tool.writeFile(file, "written");
            expect(tool.readFile(file)).toBe("written");
        });

        it("creates parent directories as needed", () => {
            const file = join(tmpDir, "nested", "deep", "file.txt");
            tool.writeFile(file, "deep content");
            expect(existsSync(file)).toBe(true);
        });

        it("overwrites existing content", () => {
            const file = join(tmpDir, "file.txt");
            writeFileSync(file, "old");
            tool.writeFile(file, "new");
            expect(tool.readFile(file)).toBe("new");
        });
    });

    describe("writeFileOrThrow", () => {
        it("creates a file with the given content", () => {
            const file = join(tmpDir, "new.txt");
            tool.writeFileOrThrow(file, "content");
            expect(tool.readFile(file)).toBe("content");
        });
    });

    describe("remove", () => {
        it("deletes an existing file", () => {
            const file = join(tmpDir, "to-remove.txt");
            writeFileSync(file, "x");
            tool.remove(file);
            expect(existsSync(file)).toBe(false);
        });

        it("does not throw for a missing file", () => {
            expect(() => tool.remove(join(tmpDir, "missing.txt"))).not.toThrow();
        });
    });

    describe("copy", () => {
        it("duplicates a file", () => {
            const src = join(tmpDir, "src.txt");
            const dest = join(tmpDir, "dest.txt");
            writeFileSync(src, "content");
            tool.copy(src, dest);
            expect(tool.readFile(dest)).toBe("content");
        });

        it("creates parent directories for the destination", () => {
            const src = join(tmpDir, "src.txt");
            const dest = join(tmpDir, "nested", "dest.txt");
            writeFileSync(src, "content");
            tool.copy(src, dest);
            expect(existsSync(dest)).toBe(true);
        });

        it("does not throw when source is missing", () => {
            expect(() =>
                tool.copy(join(tmpDir, "missing.txt"), join(tmpDir, "dest.txt"))
            ).not.toThrow();
        });
    });

    describe("copyOrThrow", () => {
        it("throws when source is missing", () => {
            expect(() =>
                tool.copyOrThrow(join(tmpDir, "missing.txt"), join(tmpDir, "dest.txt"))
            ).toThrow();
        });
    });
});

describe("createFileTool", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-file-factory-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("creates a working tool without arguments", () => {
        const tool = createFileTool();
        const file = join(tmpDir, "factory.txt");
        tool.writeFile(file, "hello");
        expect(tool.readFile(file)).toBe("hello");
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
        const tool = createFileTool({ logger });
        tool.readFile(join(tmpDir, "missing.txt"));
        expect(messages.length).toBeGreaterThan(0);
    });

    it("accepts a custom directoryTool", () => {
        const directoryTool = createDirectoryTool();
        const tool = createFileTool({ directoryTool });
        const file = join(tmpDir, "nested", "custom.txt");
        tool.writeFile(file, "content");
        expect(tool.readFile(file)).toBe("content");
    });
});
