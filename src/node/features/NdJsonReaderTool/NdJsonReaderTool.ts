import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import { Logger, ConsoleLogger } from "../../../index.js";
import {
    NdJsonReaderTool as NdJsonReaderToolAbstraction,
    type NdJsonRow,
    type NdJsonReaderOptions
} from "./abstractions/NdJsonReaderTool.js";
import { LineAccumulator } from "./LineAccumulator.js";
import { ReadStreamFactory } from "../ReadStreamFactory/abstractions/ReadStreamFactory.js";
import { createReadStreamFactory } from "../ReadStreamFactory/ReadStreamFactory.js";

class NdJsonReaderToolImpl implements NdJsonReaderToolAbstraction.Interface {
    public constructor(
        private readonly logger: Logger.Interface,
        private readonly readStreamFactory: ReadStreamFactory.Interface
    ) {}

    public async *parseFile(
        path: string,
        options?: NdJsonReaderOptions
    ): AsyncGenerator<NdJsonRow> {
        await using rs = this.readStreamFactory.create(path);
        yield* this.parseStream(rs.getStream(), options);
    }

    public async *parseStream(
        stream: Readable,
        options?: NdJsonReaderOptions
    ): AsyncGenerator<NdJsonRow> {
        const rl = createInterface({ input: stream, crlfDelay: Infinity });
        const accumulator = new LineAccumulator(this.logger);
        const fromLine = options?.fromLine ?? 1;
        let lineNumber = 0;

        for await (const line of rl) {
            lineNumber++;
            if (lineNumber < fromLine) {
                continue;
            }
            if (line.trim().length === 0) {
                continue;
            }
            const record = accumulator.feed(line);
            if (record !== null) {
                yield { data: record, line: lineNumber };
            }
        }

        const flushed = accumulator.flush();
        if (flushed !== null) {
            yield { data: flushed, line: lineNumber };
        }
    }

    public *parseLines(
        lines: Iterable<string>,
        options?: NdJsonReaderOptions
    ): Generator<NdJsonRow> {
        const accumulator = new LineAccumulator(this.logger);
        const fromLine = options?.fromLine ?? 1;
        let lineNumber = 0;

        for (const line of lines) {
            lineNumber++;
            if (lineNumber < fromLine) {
                continue;
            }
            if (line.trim().length === 0) {
                continue;
            }
            const record = accumulator.feed(line);
            if (record !== null) {
                yield { data: record, line: lineNumber };
            }
        }

        const flushed = accumulator.flush();
        if (flushed !== null) {
            yield { data: flushed, line: lineNumber };
        }
    }
}

export const NdJsonReaderTool = NdJsonReaderToolAbstraction.createImplementation({
    implementation: NdJsonReaderToolImpl,
    dependencies: [Logger, ReadStreamFactory]
});

export interface CreateNdJsonReaderToolParams {
    logger?: Logger.Interface;
    readStreamFactory?: ReadStreamFactory.Interface;
}

export function createNdJsonReaderTool(
    params?: CreateNdJsonReaderToolParams
): NdJsonReaderToolAbstraction.Interface {
    const logger = params?.logger ?? new ConsoleLogger();
    const readStreamFactory = params?.readStreamFactory ?? createReadStreamFactory();
    return new NdJsonReaderToolImpl(logger, readStreamFactory);
}
