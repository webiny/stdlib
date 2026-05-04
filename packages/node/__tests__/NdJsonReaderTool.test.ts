import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import { Container } from "@webiny/di";
import {
    NdJsonReaderTool,
    NdJsonReaderToolFeature,
    createNdJsonReaderTool
} from "../src/features/NdJsonReaderTool/index.js";
import { PinoLoggerConfig, PinoLoggerFeature } from "../src/features/PinoLogger/index.js";
import { ReadStreamFactoryFeature } from "../src/features/ReadStreamFactory/index.js";

function makeContainer(): Container {
    const container = new Container();
    container.registerInstance(PinoLoggerConfig, {
        getConfig: () => ({ logLevel: "error" as const, transport: "json" as const })
    });
    PinoLoggerFeature.register(container);
    ReadStreamFactoryFeature.register(container);
    NdJsonReaderToolFeature.register(container);
    return container;
}

function collectSync<T>(gen: Generator<T>): T[] {
    const items: T[] = [];
    for (const item of gen) {
        items.push(item);
    }
    return items;
}

async function collectAsync<T>(gen: AsyncGenerator<T>): Promise<T[]> {
    const items: T[] = [];
    for await (const item of gen) {
        items.push(item);
    }
    return items;
}

describe("NdJsonReaderTool", () => {
    let tmpDir: string;
    let tool: NdJsonReaderTool.Interface;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-ndjson-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
        tool = createNdJsonReaderTool();
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    describe("parseLines", () => {
        it("yields one row per valid NDJSON line with correct line numbers", () => {
            const lines = [
                JSON.stringify({ id: 1 }),
                JSON.stringify({ id: 2 }),
                JSON.stringify({ id: 3 })
            ];
            expect(collectSync(tool.parseLines(lines))).toEqual([
                { data: { id: 1 }, line: 1 },
                { data: { id: 2 }, line: 2 },
                { data: { id: 3 }, line: 3 }
            ]);
        });

        it("skips blank lines and counts them in physical line numbers", () => {
            const lines = [JSON.stringify({ a: 1 }), "", "   ", JSON.stringify({ a: 2 })];
            expect(collectSync(tool.parseLines(lines))).toEqual([
                { data: { a: 1 }, line: 1 },
                { data: { a: 2 }, line: 4 }
            ]);
        });

        it("returns no rows for an empty iterable", () => {
            expect(collectSync(tool.parseLines([]))).toEqual([]);
        });

        it("reassembles a JSON object split across lines with a newline inside a string value", () => {
            const record = { msg: "hello\nworld" };
            const raw = JSON.stringify(record);
            const splitAt = raw.indexOf("\\n") + 2;
            const line1 = raw.slice(0, splitAt);
            const line2 = raw.slice(splitAt);
            expect(collectSync(tool.parseLines([line1, line2]))).toEqual([
                { data: record, line: 2 }
            ]);
        });

        it("reassembles a record split across lines via empty-string join", () => {
            const record = { x: 42 };
            const raw = JSON.stringify(record);
            const mid = Math.floor(raw.length / 2);
            const line1 = raw.slice(0, mid);
            const line2 = raw.slice(mid);
            expect(collectSync(tool.parseLines([line1, line2]))).toEqual([
                { data: record, line: 2 }
            ]);
        });

        it("discards accumulated lines and yields the next parseable line", () => {
            const valid = JSON.stringify({ ok: true });
            const lines = ["not-json", "{broken", "still-broken", valid];
            expect(collectSync(tool.parseLines(lines))).toEqual([{ data: { ok: true }, line: 4 }]);
        });

        it("flushes a valid record left in the accumulator after the last line", () => {
            const record = { flushed: true };
            const raw = JSON.stringify(record);
            const third = Math.floor(raw.length / 3);
            const lines = [raw.slice(0, third), raw.slice(third, third * 2), raw.slice(third * 2)];
            expect(collectSync(tool.parseLines(lines))).toEqual([{ data: record, line: 3 }]);
        });

        it("yields nothing and discards when accumulated lines never form valid JSON", () => {
            const lines = ["{incomplete", "still-broken"];
            expect(collectSync(tool.parseLines(lines))).toEqual([]);
        });

        it("handles multiple records in sequence correctly", () => {
            const records = [{ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }];
            const lines = records.map(r => JSON.stringify(r));
            expect(collectSync(tool.parseLines(lines))).toEqual([
                { data: { a: 1 }, line: 1 },
                { data: { b: 2 }, line: 2 },
                { data: { c: 3 }, line: 3 },
                { data: { d: 4 }, line: 4 }
            ]);
        });

        it("skips lines before fromLine", () => {
            const lines = [
                JSON.stringify({ id: 1 }),
                JSON.stringify({ id: 2 }),
                JSON.stringify({ id: 3 })
            ];
            expect(collectSync(tool.parseLines(lines, { fromLine: 2 }))).toEqual([
                { data: { id: 2 }, line: 2 },
                { data: { id: 3 }, line: 3 }
            ]);
        });

        it("fromLine equal to 1 processes all lines", () => {
            const lines = [JSON.stringify({ id: 1 }), JSON.stringify({ id: 2 })];
            expect(collectSync(tool.parseLines(lines, { fromLine: 1 }))).toEqual([
                { data: { id: 1 }, line: 1 },
                { data: { id: 2 }, line: 2 }
            ]);
        });

        it("fromLine beyond last line yields nothing", () => {
            const lines = [JSON.stringify({ id: 1 }), JSON.stringify({ id: 2 })];
            expect(collectSync(tool.parseLines(lines, { fromLine: 10 }))).toEqual([]);
        });

        it("last yielded line number can be used to resume", () => {
            const lines = [
                JSON.stringify({ id: 1 }),
                JSON.stringify({ id: 2 }),
                JSON.stringify({ id: 3 }),
                JSON.stringify({ id: 4 })
            ];
            const firstRun = collectSync(tool.parseLines(lines));
            const checkpoint = firstRun[1]!.line; // line of second record
            const secondRun = collectSync(tool.parseLines(lines, { fromLine: checkpoint + 1 }));
            expect(secondRun.map(r => r.data)).toEqual([{ id: 3 }, { id: 4 }]);
        });
    });

    describe("parseFile", () => {
        it("yields rows with line numbers from a valid NDJSON file", async () => {
            const file = join(tmpDir, "data.ndjson");
            const records = [
                { id: 1, name: "alice" },
                { id: 2, name: "bob" }
            ];
            writeFileSync(file, records.map(r => JSON.stringify(r)).join("\n"));
            expect(await collectAsync(tool.parseFile(file))).toEqual([
                { data: { id: 1, name: "alice" }, line: 1 },
                { data: { id: 2, name: "bob" }, line: 2 }
            ]);
        });

        it("skips blank lines and reflects them in line numbers", async () => {
            const file = join(tmpDir, "sparse.ndjson");
            writeFileSync(
                file,
                [JSON.stringify({ x: 1 }), "", JSON.stringify({ x: 2 }), ""].join("\n")
            );
            expect(await collectAsync(tool.parseFile(file))).toEqual([
                { data: { x: 1 }, line: 1 },
                { data: { x: 2 }, line: 3 }
            ]);
        });

        it("handles a file with a single record", async () => {
            const file = join(tmpDir, "single.ndjson");
            writeFileSync(file, JSON.stringify({ only: true }));
            expect(await collectAsync(tool.parseFile(file))).toEqual([
                { data: { only: true }, line: 1 }
            ]);
        });

        it("throws when the file does not exist", async () => {
            const gen = tool.parseFile(join(tmpDir, "missing.ndjson"));
            await expect(collectAsync(gen)).rejects.toThrow();
        });

        it("respects fromLine option", async () => {
            const file = join(tmpDir, "resume.ndjson");
            const records = [{ id: 1 }, { id: 2 }, { id: 3 }];
            writeFileSync(file, records.map(r => JSON.stringify(r)).join("\n"));
            expect(await collectAsync(tool.parseFile(file, { fromLine: 2 }))).toEqual([
                { data: { id: 2 }, line: 2 },
                { data: { id: 3 }, line: 3 }
            ]);
        });
    });

    describe("parseStream", () => {
        it("yields rows with line numbers from a Readable stream", async () => {
            const records = [{ stream: true }, { index: 2 }];
            const content = records.map(r => JSON.stringify(r)).join("\n");
            const stream = Readable.from([content]);
            expect(await collectAsync(tool.parseStream(stream))).toEqual([
                { data: { stream: true }, line: 1 },
                { data: { index: 2 }, line: 2 }
            ]);
        });

        it("handles a stream with no data", async () => {
            const stream = Readable.from([]);
            expect(await collectAsync(tool.parseStream(stream))).toEqual([]);
        });

        it("respects fromLine option", async () => {
            const records = [{ a: 1 }, { b: 2 }, { c: 3 }];
            const content = records.map(r => JSON.stringify(r)).join("\n");
            const stream = Readable.from([content]);
            expect(await collectAsync(tool.parseStream(stream, { fromLine: 3 }))).toEqual([
                { data: { c: 3 }, line: 3 }
            ]);
        });
    });

    describe("createNdJsonReaderTool", () => {
        it("works without arguments", () => {
            const t = createNdJsonReaderTool();
            expect(typeof t.parseLines).toBe("function");
            expect(typeof t.parseFile).toBe("function");
            expect(typeof t.parseStream).toBe("function");
        });
    });

    describe("DI wiring", () => {
        it("resolves from container and parses lines", () => {
            const t = makeContainer().resolve(NdJsonReaderTool);
            const lines = [JSON.stringify({ di: true })];
            expect(collectSync(t.parseLines(lines))).toEqual([{ data: { di: true }, line: 1 }]);
        });
    });
});
