import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import {
    JsonFileTool,
    JsonFileToolFeature,
    createJsonFileTool,
    type JsonSchema
} from "../../src/node/features/JsonFileTool/index.js";
import { FileTool, FileToolFeature } from "../../src/node/features/FileTool/index.js";
import { DirectoryToolFeature } from "../../src/node/features/DirectoryTool/index.js";
import { GlobToolFeature } from "../../src/node/features/GlobTool/index.js";
import { PinoLoggerConfig, PinoLoggerFeature } from "../../src/node/features/PinoLogger/index.js";

function makeContainer(): Container {
    const container = new Container();
    container.registerInstance(PinoLoggerConfig, {
        getConfig: () => ({ logLevel: "error" as const, transport: "json" as const })
    });
    PinoLoggerFeature.register(container);
    GlobToolFeature.register(container);
    DirectoryToolFeature.register(container);
    FileToolFeature.register(container);
    JsonFileToolFeature.register(container);
    return container;
}

function makeSchema<T>(validate: (data: unknown) => T): JsonSchema<T> {
    return {
        parse(data: unknown): T {
            return validate(data);
        }
    };
}

describe("JsonFileTool", () => {
    let tmpDir: string;
    let tool: JsonFileTool.Interface;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-json-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
        tool = createJsonFileTool();
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    describe("readJson", () => {
        it("returns null for a missing file", () => {
            expect(tool.readJson(join(tmpDir, "missing.json"))).toBeNull();
        });

        it("parses and returns a valid JSON object", () => {
            const file = join(tmpDir, "data.json");
            writeFileSync(file, JSON.stringify({ name: "webiny", version: 1 }));
            expect(tool.readJson(file)).toEqual({ name: "webiny", version: 1 });
        });

        it("parses arrays and primitives", () => {
            const file = join(tmpDir, "arr.json");
            writeFileSync(file, JSON.stringify([1, 2, 3]));
            expect(tool.readJson(file)).toEqual([1, 2, 3]);
        });

        it("throws on malformed JSON", () => {
            const file = join(tmpDir, "bad.json");
            writeFileSync(file, "{ not json }");
            expect(() => tool.readJson(file)).toThrow();
        });

        it("returns schema-validated data when schema is provided", () => {
            const file = join(tmpDir, "data.json");
            writeFileSync(file, JSON.stringify({ name: "webiny" }));
            const schema = makeSchema<{ name: string }>(data => {
                const d = data as { name: string };
                if (typeof d.name !== "string") {
                    throw new Error("invalid");
                }
                return d;
            });
            expect(tool.readJson(file, { schema })).toEqual({ name: "webiny" });
        });

        it("throws when schema rejects the data", () => {
            const file = join(tmpDir, "data.json");
            writeFileSync(file, JSON.stringify({ count: 42 }));
            const schema = makeSchema<{ name: string }>(_ => {
                throw new Error("schema error");
            });
            expect(() => tool.readJson(file, { schema })).toThrow("schema error");
        });

        it("returns null (not schema error) when file is missing and schema is provided", () => {
            const schema = makeSchema<{ name: string }>(_ => {
                throw new Error("should not be called");
            });
            expect(tool.readJson(join(tmpDir, "missing.json"), { schema })).toBeNull();
        });
    });

    describe("readJsonOrThrow", () => {
        it("parses and returns a valid JSON object", () => {
            const file = join(tmpDir, "data.json");
            writeFileSync(file, JSON.stringify({ id: 99 }));
            expect(tool.readJsonOrThrow(file)).toEqual({ id: 99 });
        });

        it("throws for a missing file", () => {
            expect(() => tool.readJsonOrThrow(join(tmpDir, "missing.json"))).toThrow();
        });

        it("throws on malformed JSON", () => {
            const file = join(tmpDir, "bad.json");
            writeFileSync(file, "not json");
            expect(() => tool.readJsonOrThrow(file)).toThrow();
        });

        it("returns schema-validated data when schema is provided", () => {
            const file = join(tmpDir, "data.json");
            writeFileSync(file, JSON.stringify({ count: 5 }));
            const schema = makeSchema<{ count: number }>(data => data as { count: number });
            expect(tool.readJsonOrThrow(file, { schema })).toEqual({ count: 5 });
        });

        it("throws when schema rejects the data", () => {
            const file = join(tmpDir, "data.json");
            writeFileSync(file, JSON.stringify({ wrong: true }));
            const schema = makeSchema<{ count: number }>(_ => {
                throw new Error("validation failed");
            });
            expect(() => tool.readJsonOrThrow(file, { schema })).toThrow("validation failed");
        });
    });

    describe("writeJson", () => {
        it("writes JSON with 2-space indentation", () => {
            const file = join(tmpDir, "out.json");
            tool.writeJson(file, { key: "value" });
            expect(readFileSync(file, "utf-8")).toBe(JSON.stringify({ key: "value" }, null, 2));
        });

        it("creates parent directories as needed", () => {
            const file = join(tmpDir, "nested", "deep", "out.json");
            tool.writeJson(file, { ok: true });
            expect(tool.readJson(file)).toEqual({ ok: true });
        });

        it("overwrites existing content", () => {
            const file = join(tmpDir, "out.json");
            writeFileSync(file, JSON.stringify({ old: true }));
            tool.writeJson(file, { new: true });
            expect(tool.readJson(file)).toEqual({ new: true });
        });

        it("round-trips data written with readJson", () => {
            const file = join(tmpDir, "rt.json");
            const data = { a: 1, b: ["x", "y"], c: { nested: true } };
            tool.writeJson(file, data);
            expect(tool.readJson(file)).toEqual(data);
        });
    });

    describe("writeJsonOrThrow", () => {
        it("writes JSON with 2-space indentation", () => {
            const file = join(tmpDir, "out.json");
            tool.writeJsonOrThrow(file, { key: "value" });
            expect(readFileSync(file, "utf-8")).toBe(JSON.stringify({ key: "value" }, null, 2));
        });

        it("creates parent directories as needed", () => {
            const file = join(tmpDir, "nested", "out.json");
            tool.writeJsonOrThrow(file, { ok: true });
            expect(tool.readJson(file)).toEqual({ ok: true });
        });
    });

    describe("createJsonFileTool", () => {
        it("works without arguments", () => {
            const t = createJsonFileTool();
            expect(typeof t.readJson).toBe("function");
        });

        it("accepts a custom fileTool", () => {
            const container = makeContainer();
            const fileTool = container.resolve(FileTool);
            const t = createJsonFileTool({ fileTool });
            const file = join(tmpDir, "custom.json");
            writeFileSync(file, JSON.stringify({ via: "custom" }));
            expect(t.readJson(file)).toEqual({ via: "custom" });
        });
    });

    describe("DI wiring", () => {
        it("resolves from container and reads JSON", () => {
            const file = join(tmpDir, "di.json");
            writeFileSync(file, JSON.stringify({ di: true }));
            const t = makeContainer().resolve(JsonFileTool);
            expect(t.readJson(file)).toEqual({ di: true });
        });
    });
});
