import { createAbstraction } from "#common";
import type { Readable } from "node:stream";

export interface NdJsonRow {
    /** The parsed JSON record. */
    data: Record<string, unknown>;
    /**
     * 1-based physical line number where this record was completed.
     * Pass `line + 1` as `fromLine` to resume reading after this record.
     */
    line: number;
}

export interface NdJsonReaderOptions {
    /**
     * Skip all physical lines before this 1-based line number.
     * Use the `line` value from the last yielded row plus one to resume a previous run.
     */
    fromLine?: number;
}

export interface INdJsonReaderTool {
    /**
     * Yield parsed records from an NDJSON file.
     * Handles multi-line JSON values via line accumulation.
     */
    parseFile(path: string, options?: NdJsonReaderOptions): AsyncGenerator<NdJsonRow>;

    /**
     * Yield parsed records from a Readable stream of NDJSON data.
     * Handles multi-line JSON values via line accumulation.
     */
    parseStream(stream: Readable, options?: NdJsonReaderOptions): AsyncGenerator<NdJsonRow>;

    /**
     * Yield parsed records from an iterable of NDJSON lines.
     * Synchronous; useful for in-memory parsing and testing.
     */
    parseLines(lines: Iterable<string>, options?: NdJsonReaderOptions): Generator<NdJsonRow>;
}

export const NdJsonReaderTool = createAbstraction<INdJsonReaderTool>("Node/NdJsonReaderTool");

export namespace NdJsonReaderTool {
    export type Interface = INdJsonReaderTool;
    export type Row = NdJsonRow;
    export type Options = NdJsonReaderOptions;
}
