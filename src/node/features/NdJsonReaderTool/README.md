# NdJsonReaderTool

Parses [NDJSON](https://ndjson.org/) (newline-delimited JSON) data from a file path, a Node.js `Readable` stream, or an in-memory iterable of lines. Handles malformed input where a single JSON value is split across multiple lines by attempting newline-join and concatenation strategies before discarding and moving on.

Each yielded row includes the parsed record and its 1-based physical line number, so processing can be resumed from any checkpoint by passing `fromLine` on the next call.

## Interface

```ts
interface NdJsonRow {
  /** The parsed JSON record. */
  data: Record<string, unknown>;
  /**
   * 1-based physical line number where this record was completed.
   * Pass `line + 1` as `fromLine` to resume reading after this record.
   */
  line: number;
}

interface NdJsonReaderOptions {
  /**
   * Skip all physical lines before this 1-based line number.
   * Use the `line` value from the last yielded row plus one to resume a previous run.
   */
  fromLine?: number;
}

interface INdJsonReaderTool {
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
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import {
  NdJsonReaderTool,
  NdJsonReaderToolFeature,
  ReadStreamFactoryFeature,
  PinoLoggerFeature
} from "@webiny/stdlib/node";

const container = new Container();
PinoLoggerFeature.register(container);
ReadStreamFactoryFeature.register(container);
NdJsonReaderToolFeature.register(container);

const reader = container.resolve(NdJsonReaderTool);
for await (const { data, line } of reader.parseFile("/data/events.ndjson")) {
  console.log(line, data);
}
```

### Without DI

```ts
import { createNdJsonReaderTool } from "@webiny/stdlib/node";

const reader = createNdJsonReaderTool();

// First run — record the last line processed.
let checkpoint = 0;
for await (const { data, line } of reader.parseFile("/data/events.ndjson")) {
  process(data);
  checkpoint = line;
}

// Resume from where we left off.
for await (const { data, line } of reader.parseFile("/data/events.ndjson", {
  fromLine: checkpoint + 1
})) {
  process(data);
  checkpoint = line;
}
```
