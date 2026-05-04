# ReadStreamFactory & Per-Feature READMEs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the internal `ReadStream` helper into a public `ReadStreamFactory` DI feature, wire it into `NdJsonReaderTool` as an injected dependency, and add a Level-B `README.md` to every feature folder in `utils-node`.

**Architecture:** Standard 4-file DI layout for `ReadStreamFactory` (abstraction + implementation + feature + index). `NdJsonReaderTool` drops its internal `ReadStream.ts` and declares `ReadStreamFactory` as a constructor dependency. All seven features in `packages/node/src/features/` get a `README.md` with a description, interface listing, and usage examples.

**Tech Stack:** TypeScript, `node:fs`, `node:stream`, `@webiny/di`, `@webiny/utils-common`, Vitest.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `packages/node/src/features/ReadStreamFactory/abstractions/ReadStreamFactory.ts` | DI token + `IReadStream` + `IReadStreamFactory` interfaces |
| Create | `packages/node/src/features/ReadStreamFactory/abstractions/index.ts` | Abstraction barrel |
| Create | `packages/node/__tests__/ReadStreamFactory.test.ts` | All ReadStreamFactory tests |
| Create | `packages/node/src/features/ReadStreamFactory/ReadStreamFactory.ts` | `ReadStreamImpl`, `ReadStreamFactoryImpl`, `createReadStreamFactory()` |
| Create | `packages/node/src/features/ReadStreamFactory/feature.ts` | DI feature registration |
| Create | `packages/node/src/features/ReadStreamFactory/index.ts` | Public barrel |
| Create | `packages/node/src/features/ReadStreamFactory/README.md` | Feature README |
| Delete | `packages/node/src/features/NdJsonReaderTool/ReadStream.ts` | Replaced by ReadStreamFactory |
| Modify | `packages/node/src/features/NdJsonReaderTool/NdJsonReaderTool.ts` | Inject `ReadStreamFactory`; update factory params |
| Modify | `packages/node/__tests__/NdJsonReaderTool.test.ts` | Register `ReadStreamFactoryFeature` in `makeContainer` |
| Modify | `packages/node/src/index.ts` | Export `ReadStreamFactory`, `ReadStreamFactoryFeature`, `createReadStreamFactory` |
| Create | `packages/node/src/features/FileTool/README.md` | Feature README |
| Create | `packages/node/src/features/DirectoryTool/README.md` | Feature README |
| Create | `packages/node/src/features/JsonFileTool/README.md` | Feature README |
| Create | `packages/node/src/features/PathTool/README.md` | Feature README |
| Create | `packages/node/src/features/PinoLogger/README.md` | Feature README |
| Create | `packages/node/src/features/NdJsonReaderTool/README.md` | Feature README |

---

## Task 1: Create the ReadStreamFactory abstraction

**Files:**
- Create: `packages/node/src/features/ReadStreamFactory/abstractions/ReadStreamFactory.ts`
- Create: `packages/node/src/features/ReadStreamFactory/abstractions/index.ts`

- [ ] **Step 1: Create `abstractions/ReadStreamFactory.ts`**

```ts
import { createAbstraction } from "@webiny/utils-common";
import type { Readable } from "node:stream";
import type { PathLike, ReadStreamOptions } from "node:fs";

export interface IReadStream extends AsyncDisposable {
    /** Returns the underlying Node.js Readable stream. */
    getStream(): Readable;
}

export interface IReadStreamFactory {
    /**
     * Creates a disposable read stream for the given path.
     * Mirrors node:fs createReadStream exactly — all native options are supported.
     * Use `await using` to guarantee the stream is destroyed on scope exit.
     */
    create(path: PathLike, options?: BufferEncoding | ReadStreamOptions): IReadStream;
}

export const ReadStreamFactory = createAbstraction<IReadStreamFactory>("Node/ReadStreamFactory");

export namespace ReadStreamFactory {
    export type Interface = IReadStreamFactory;
    /** The disposable stream handle returned by `create()`. */
    export type Stream = IReadStream;
}
```

- [ ] **Step 2: Create `abstractions/index.ts`**

```ts
export { ReadStreamFactory } from "./ReadStreamFactory.js";
```

- [ ] **Step 3: Verify types compile**

```sh
yarn typecheck
```

Expected: no errors.

---

## Task 2: Write failing ReadStreamFactory tests

**Files:**
- Create: `packages/node/__tests__/ReadStreamFactory.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import {
    ReadStreamFactory,
    ReadStreamFactoryFeature,
    createReadStreamFactory
} from "../src/features/ReadStreamFactory/index.js";

function makeContainer(): Container {
    const container = new Container();
    ReadStreamFactoryFeature.register(container);
    return container;
}

describe("ReadStreamFactory", () => {
    let tmpDir: string;
    let factory: ReadStreamFactory.Interface;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-rsf-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
        factory = makeContainer().resolve(ReadStreamFactory);
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("streams file contents", async () => {
        const filePath = join(tmpDir, "test.txt");
        writeFileSync(filePath, "hello world");

        await using rs = factory.create(filePath);
        const chunks: Buffer[] = [];
        for await (const chunk of rs.getStream()) {
            chunks.push(chunk as Buffer);
        }
        expect(Buffer.concat(chunks).toString()).toBe("hello world");
    });

    it("destroys the stream on dispose", async () => {
        const filePath = join(tmpDir, "test.txt");
        writeFileSync(filePath, "hello");

        let capturedStream;
        {
            await using rs = factory.create(filePath);
            capturedStream = rs.getStream();
            // drain it so the stream ends naturally before dispose
            const chunks: Buffer[] = [];
            for await (const chunk of capturedStream) {
                chunks.push(chunk as Buffer);
            }
        }
        expect(capturedStream.destroyed).toBe(true);
    });

    it("respects ReadStreamOptions (start/end byte range)", async () => {
        const filePath = join(tmpDir, "test.txt");
        writeFileSync(filePath, "hello world");

        await using rs = factory.create(filePath, { start: 6, end: 10 });
        const chunks: Buffer[] = [];
        for await (const chunk of rs.getStream()) {
            chunks.push(chunk as Buffer);
        }
        expect(Buffer.concat(chunks).toString()).toBe("world");
    });
});

describe("createReadStreamFactory", () => {
    it("creates a working factory without DI", async () => {
        const dir = join(tmpdir(), `wby-rsf-direct-${Date.now()}`);
        mkdirSync(dir, { recursive: true });
        try {
            const filePath = join(dir, "direct.txt");
            writeFileSync(filePath, "direct");
            const f = createReadStreamFactory();
            await using rs = f.create(filePath);
            const chunks: Buffer[] = [];
            for await (const chunk of rs.getStream()) {
                chunks.push(chunk as Buffer);
            }
            expect(Buffer.concat(chunks).toString()).toBe("direct");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
```

- [ ] **Step 2: Run the tests — verify they fail**

```sh
yarn test
```

Expected: FAIL — `Cannot find module '../src/features/ReadStreamFactory/index.js'`

---

## Task 3: Implement ReadStreamFactory

**Files:**
- Create: `packages/node/src/features/ReadStreamFactory/ReadStreamFactory.ts`
- Create: `packages/node/src/features/ReadStreamFactory/feature.ts`
- Create: `packages/node/src/features/ReadStreamFactory/index.ts`

- [ ] **Step 1: Create `ReadStreamFactory.ts`**

```ts
import { createReadStream } from "node:fs";
import type { PathLike, ReadStreamOptions } from "node:fs";
import type { Readable } from "node:stream";
import { ReadStreamFactory as ReadStreamFactoryAbstraction } from "./abstractions/ReadStreamFactory.js";

class ReadStreamImpl implements ReadStreamFactoryAbstraction.Stream {
    public constructor(private readonly stream: Readable) {}

    public getStream(): Readable {
        return this.stream;
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        this.stream.destroy();
    }
}

class ReadStreamFactoryImpl implements ReadStreamFactoryAbstraction.Interface {
    public create(
        path: PathLike,
        options?: BufferEncoding | ReadStreamOptions
    ): ReadStreamFactoryAbstraction.Stream {
        return new ReadStreamImpl(createReadStream(path, options));
    }
}

export const ReadStreamFactory = ReadStreamFactoryAbstraction.createImplementation({
    implementation: ReadStreamFactoryImpl,
    dependencies: []
});

export function createReadStreamFactory(): ReadStreamFactoryAbstraction.Interface {
    return new ReadStreamFactoryImpl();
}
```

- [ ] **Step 2: Create `feature.ts`**

```ts
import { createFeature } from "@webiny/utils-common";
import { ReadStreamFactory } from "./ReadStreamFactory.js";

export const ReadStreamFactoryFeature = createFeature({
    name: "Node/ReadStreamFactoryFeature",
    register(container) {
        container.register(ReadStreamFactory).inSingletonScope();
    }
});
```

- [ ] **Step 3: Create `index.ts`**

```ts
export { ReadStreamFactory } from "./abstractions/index.js";
export { ReadStreamFactoryFeature } from "./feature.js";
export { createReadStreamFactory } from "./ReadStreamFactory.js";
```

- [ ] **Step 4: Run the tests — verify they pass**

```sh
yarn test
```

Expected: all ReadStreamFactory tests PASS. All other tests continue to pass.

---

## Task 4: Wire ReadStreamFactory into NdJsonReaderTool

**Files:**
- Delete: `packages/node/src/features/NdJsonReaderTool/ReadStream.ts`
- Modify: `packages/node/src/features/NdJsonReaderTool/NdJsonReaderTool.ts`
- Modify: `packages/node/__tests__/NdJsonReaderTool.test.ts`

- [ ] **Step 1: Delete `NdJsonReaderTool/ReadStream.ts`**

```sh
rm packages/node/src/features/NdJsonReaderTool/ReadStream.ts
```

- [ ] **Step 2: Replace `NdJsonReaderTool.ts` with the version that injects `ReadStreamFactory`**

Full file content:

```ts
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import { Logger, ConsoleLogger } from "@webiny/utils-common";
import { NdJsonReaderTool as NdJsonReaderToolAbstraction } from "./abstractions/NdJsonReaderTool.js";
import { LineAccumulator } from "./LineAccumulator.js";
import { ReadStreamFactory } from "../ReadStreamFactory/abstractions/ReadStreamFactory.js";
import { createReadStreamFactory } from "../ReadStreamFactory/ReadStreamFactory.js";

class NdJsonReaderToolImpl implements NdJsonReaderToolAbstraction.Interface {
    public constructor(
        private readonly logger: Logger.Interface,
        private readonly readStreamFactory: ReadStreamFactory.Interface
    ) {}

    public async *parseFile(path: string): AsyncGenerator<Record<string, unknown>> {
        await using rs = this.readStreamFactory.create(path);
        yield* this.parseStream(rs.getStream());
    }

    public async *parseStream(stream: Readable): AsyncGenerator<Record<string, unknown>> {
        const rl = createInterface({ input: stream, crlfDelay: Infinity });
        const accumulator = new LineAccumulator(this.logger);

        for await (const line of rl) {
            if (line.trim().length === 0) {
                continue;
            }
            const record = accumulator.feed(line);
            if (record !== null) {
                yield record;
            }
        }

        const flushed = accumulator.flush();
        if (flushed !== null) {
            yield flushed;
        }
    }

    public *parseLines(lines: Iterable<string>): Generator<Record<string, unknown>> {
        const accumulator = new LineAccumulator(this.logger);

        for (const line of lines) {
            if (line.trim().length === 0) {
                continue;
            }
            const record = accumulator.feed(line);
            if (record !== null) {
                yield record;
            }
        }

        const flushed = accumulator.flush();
        if (flushed !== null) {
            yield flushed;
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
```

- [ ] **Step 3: Update `makeContainer` in `NdJsonReaderTool.test.ts` to register `ReadStreamFactoryFeature`**

Replace the import block and `makeContainer` function:

```ts
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
```

(All test cases below `makeContainer` remain unchanged.)

- [ ] **Step 4: Run all tests — verify they pass**

```sh
yarn test
```

Expected: all tests pass, including the existing NdJsonReaderTool suite.

---

## Task 5: Add ReadStreamFactory to the package barrel and commit

**Files:**
- Modify: `packages/node/src/index.ts`

- [ ] **Step 1: Add the ReadStreamFactory export to `src/index.ts`**

Full updated file:

```ts
export {
    FileTool,
    FileToolFeature,
    createFileTool,
    type CreateFileToolParams
} from "./features/FileTool/index.js";
export {
    DirectoryTool,
    DirectoryToolFeature,
    createDirectoryTool,
    type CreateDirectoryToolParams
} from "./features/DirectoryTool/index.js";
export {
    JsonFileTool,
    JsonFileToolFeature,
    createJsonFileTool,
    type JsonSchema,
    type ReadJsonParams,
    type CreateJsonFileToolParams
} from "./features/JsonFileTool/index.js";
export { PinoLoggerConfig, PinoLoggerFeature } from "./features/PinoLogger/index.js";
export { PathTool, PathToolFeature, createPathTool } from "./features/PathTool/index.js";
export {
    NdJsonReaderTool,
    NdJsonReaderToolFeature,
    createNdJsonReaderTool,
    type CreateNdJsonReaderToolParams
} from "./features/NdJsonReaderTool/index.js";
export {
    ReadStreamFactory,
    ReadStreamFactoryFeature,
    createReadStreamFactory
} from "./features/ReadStreamFactory/index.js";
```

- [ ] **Step 2: Run the full pre-commit chain**

```sh
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Expected: all five steps pass with zero errors and zero warnings.

- [ ] **Step 3: Commit**

```sh
git add packages/node/src/features/ReadStreamFactory \
        packages/node/__tests__/ReadStreamFactory.test.ts \
        packages/node/src/features/NdJsonReaderTool/NdJsonReaderTool.ts \
        packages/node/src/features/NdJsonReaderTool/ReadStream.ts \
        packages/node/__tests__/NdJsonReaderTool.test.ts \
        packages/node/src/index.ts
git commit -m "feat(utils-node): add ReadStreamFactory; inject into NdJsonReaderTool"
```

---

## Task 6: Write READMEs for all seven features

**Files:**
- Create: `packages/node/src/features/ReadStreamFactory/README.md`
- Create: `packages/node/src/features/FileTool/README.md`
- Create: `packages/node/src/features/DirectoryTool/README.md`
- Create: `packages/node/src/features/JsonFileTool/README.md`
- Create: `packages/node/src/features/PathTool/README.md`
- Create: `packages/node/src/features/PinoLogger/README.md`
- Create: `packages/node/src/features/NdJsonReaderTool/README.md`

- [ ] **Step 1: Create `ReadStreamFactory/README.md`**

```markdown
# ReadStreamFactory

Creates disposable `node:fs` read streams that guarantee cleanup via the `AsyncDisposable` protocol. Use `await using` to ensure the underlying file handle is released on scope exit — including early `break` from an async generator loop or thrown errors.

Node.js only — depends on `node:fs` and `node:stream`.

## Interface

```ts
interface IReadStreamFactory {
    /**
     * Creates a disposable read stream for the given path.
     * Mirrors node:fs createReadStream exactly — all native options are supported.
     * Use `await using` to guarantee the stream is destroyed on scope exit.
     */
    create(path: PathLike, options?: BufferEncoding | ReadStreamOptions): IReadStream;
}

interface IReadStream extends AsyncDisposable {
    /** Returns the underlying Node.js Readable stream. */
    getStream(): Readable;
}
```

`ReadStreamFactory.Stream` is the type of the value returned by `create()`.

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { ReadStreamFactory, ReadStreamFactoryFeature } from "@webiny/utils-node";

const container = new Container();
ReadStreamFactoryFeature.register(container);

const factory = container.resolve(ReadStreamFactory);

await using rs = factory.create("/path/to/file.bin");
const stream = rs.getStream(); // node:stream Readable
```

### Without DI

```ts
import { createReadStreamFactory } from "@webiny/utils-node";

const factory = createReadStreamFactory();

await using rs = factory.create("/path/to/file.bin", { start: 0, end: 1023 });
for await (const chunk of rs.getStream()) {
    // process chunk
}
// stream.destroy() called automatically here
```
```

- [ ] **Step 2: Create `FileTool/README.md`**

```markdown
# FileTool

Reads, writes, copies, and removes files on the local filesystem. All paths must be absolute. Write operations automatically create missing parent directories. Methods without `OrThrow` log a warning and return `null` / `void` on failure; `OrThrow` variants throw.

## Interface

```ts
interface IFileTool {
    /** Returns true if the file exists. */
    exists(path: string): boolean;
    /** Reads the file as UTF-8. Returns null if the file does not exist. */
    readFile(path: string): string | null;
    /** Reads the file as UTF-8. Throws if the file does not exist. */
    readFileOrThrow(path: string): string;
    /** Writes UTF-8 content, creating parent directories as needed. Logs on failure. */
    writeFile(path: string, content: string): void;
    /** Writes UTF-8 content, creating parent directories as needed. Throws on failure. */
    writeFileOrThrow(path: string, content: string): void;
    /** Removes the file. No-op if the file does not exist. */
    remove(path: string): void;
    /** Copies source to target, creating parent directories as needed. Logs if source is missing. */
    copy(source: string, target: string): void;
    /** Copies source to target, creating parent directories as needed. Throws if source is missing. */
    copyOrThrow(source: string, target: string): void;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { FileTool, FileToolFeature, DirectoryToolFeature, PinoLoggerFeature } from "@webiny/utils-node";

const container = new Container();
PinoLoggerFeature.register(container);
DirectoryToolFeature.register(container);
FileToolFeature.register(container);

const file = container.resolve(FileTool);
file.writeFileOrThrow("/tmp/hello.txt", "hello world");
console.log(file.readFileOrThrow("/tmp/hello.txt")); // "hello world"
```

### Without DI

```ts
import { createFileTool } from "@webiny/utils-node";

const file = createFileTool();
const content = file.readFile("/tmp/hello.txt"); // string | null
```
```

- [ ] **Step 3: Create `DirectoryTool/README.md`**

```markdown
# DirectoryTool

Creates, reads, copies, and removes directories on the local filesystem. All paths must be absolute. `create` is idempotent — it calls `mkdirSync` with `recursive: true` and is safe to call on an existing path. Methods without `OrThrow` log a warning and return `null` / `void` on failure; `OrThrow` variants throw.

## Interface

```ts
interface IDirectoryTool {
    /** Returns true if the directory exists. */
    exists(path: string): boolean;
    /** Creates the directory (and any missing parents). Idempotent. */
    create(path: string): void;
    /** Returns the names of entries in the directory. Returns null if it does not exist. */
    readDir(path: string): string[] | null;
    /** Returns the names of entries in the directory. Throws if it does not exist. */
    readDirOrThrow(path: string): string[];
    /** Removes the directory and all its contents. No-op if it does not exist. */
    remove(path: string): void;
    /** Copies the directory tree from source to target. Logs if source is missing. */
    copy(source: string, target: string): void;
    /** Copies the directory tree from source to target. Throws if source is missing. */
    copyOrThrow(source: string, target: string): void;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { DirectoryTool, DirectoryToolFeature, PinoLoggerFeature } from "@webiny/utils-node";

const container = new Container();
PinoLoggerFeature.register(container);
DirectoryToolFeature.register(container);

const dir = container.resolve(DirectoryTool);
dir.create("/tmp/my-output");
console.log(dir.readDirOrThrow("/tmp/my-output")); // []
```

### Without DI

```ts
import { createDirectoryTool } from "@webiny/utils-node";

const dir = createDirectoryTool();
dir.create("/tmp/my-output");
```
```

- [ ] **Step 4: Create `JsonFileTool/README.md`**

```markdown
# JsonFileTool

Reads and writes JSON files on the local filesystem. Optionally validates the parsed value through a schema (any object with a `.parse(unknown): T` method — compatible with Zod, Valibot, and similar). Methods without `OrThrow` return `null` on failure; `OrThrow` variants throw.

## Interface

```ts
interface IJsonFileTool {
    /** Parses and returns the JSON file contents. Returns null if missing or unparseable. */
    readJson<T>(path: string, params?: ReadJsonParams<T>): T | null;
    /** Parses and returns the JSON file contents. Throws if missing, unparseable, or schema validation fails. */
    readJsonOrThrow<T>(path: string, params?: ReadJsonParams<T>): T;
    /** Serialises data to JSON and writes it. Creates parent directories as needed. Logs on failure. */
    writeJson(path: string, data: unknown): void;
    /** Serialises data to JSON and writes it. Creates parent directories as needed. Throws on failure. */
    writeJsonOrThrow(path: string, data: unknown): void;
}

interface ReadJsonParams<T> {
    /** Optional schema to validate the parsed value. Must have a `.parse(unknown): T` method. */
    schema?: JsonSchema<T>;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { JsonFileTool, JsonFileToolFeature, FileToolFeature, DirectoryToolFeature, PinoLoggerFeature } from "@webiny/utils-node";

const container = new Container();
PinoLoggerFeature.register(container);
DirectoryToolFeature.register(container);
FileToolFeature.register(container);
JsonFileToolFeature.register(container);

const json = container.resolve(JsonFileTool);
json.writeJsonOrThrow("/tmp/config.json", { version: 1 });
const config = json.readJsonOrThrow<{ version: number }>("/tmp/config.json");
```

### Without DI

```ts
import { createJsonFileTool } from "@webiny/utils-node";

const json = createJsonFileTool();
const data = json.readJson("/tmp/config.json"); // unknown | null
```
```

- [ ] **Step 5: Create `PathTool/README.md`**

```markdown
# PathTool

Wraps the four most-used `node:path` methods — `join`, `resolve`, `dirname`, and `basename` — behind the standard DI abstraction/implementation pattern. Useful when you want path operations to be injectable and mockable in tests.

## Interface

```ts
interface IPathTool {
    /** Joins path segments using the OS-native separator. */
    join(...paths: string[]): string;
    /** Resolves a sequence of paths into an absolute path. Relative segments resolve against process.cwd(). */
    resolve(...paths: string[]): string;
    /** Returns the directory portion of a path. */
    dirname(path: string): string;
    /** Returns the last segment of a path. Strips ext when provided. */
    basename(path: string, ext?: string): string;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { PathTool, PathToolFeature } from "@webiny/utils-node";

const container = new Container();
PathToolFeature.register(container);

const path = container.resolve(PathTool);
path.join("a", "b", "c");       // "a/b/c"
path.resolve("src", "index.ts"); // "/your/cwd/src/index.ts"
path.dirname("/a/b/c.ts");       // "/a/b"
path.basename("/a/b/c.ts", ".ts"); // "c"
```

### Without DI

```ts
import { createPathTool } from "@webiny/utils-node";

const path = createPathTool();
path.join("dist", "index.js"); // "dist/index.js"
```
```

- [ ] **Step 6: Create `PinoLogger/README.md`**

```markdown
# PinoLogger

A [pino](https://github.com/pinojs/pino)-based implementation of the `Logger` abstraction from `@webiny/utils-common`. Registers under the shared `Logger` DI token, so any tool that depends on `Logger` will receive a pino instance when `PinoLoggerFeature` is registered.

Defaults to `logLevel: "info"` and `transport: "pretty"` (coloured human-readable output). Override by registering a `PinoLoggerConfig` instance before registering `PinoLoggerFeature`.

## Interface

`PinoLogger` implements `Logger.Interface` from `@webiny/utils-common`:

```ts
interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    fatal(message: string, ...args: unknown[]): void;
    child(bindings: Record<string, unknown>): Logger;
}
```

`PinoLoggerConfig` is an optional DI dependency:

```ts
interface PinoLoggerConfig {
    getConfig(): {
        logLevel?: "debug" | "info" | "warn" | "error" | "fatal";
        transport?: "pretty" | "json";
    };
}
```

## Usage

### With DI (default config)

```ts
import { Container } from "@webiny/di";
import { PinoLoggerFeature } from "@webiny/utils-node";
import { Logger } from "@webiny/utils-common";

const container = new Container();
PinoLoggerFeature.register(container);

const logger = container.resolve(Logger);
logger.info("hello");
```

### With DI (custom config)

```ts
import { Container } from "@webiny/di";
import { PinoLoggerConfig, PinoLoggerFeature } from "@webiny/utils-node";
import { Logger } from "@webiny/utils-common";

const container = new Container();
container.registerInstance(PinoLoggerConfig, {
    getConfig: () => ({ logLevel: "warn", transport: "json" })
});
PinoLoggerFeature.register(container);

const logger = container.resolve(Logger);
logger.warn("only warnings and above");
```
```

- [ ] **Step 7: Create `NdJsonReaderTool/README.md`**

```markdown
# NdJsonReaderTool

Parses [NDJSON](https://ndjson.org/) (newline-delimited JSON) data from a file path, a Node.js `Readable` stream, or an in-memory iterable of lines. Handles malformed input where a single JSON value is split across multiple lines by attempting newline-join and concatenation strategies before discarding and moving on.

## Interface

```ts
interface INdJsonReaderTool {
    /**
     * Yield parsed records from an NDJSON file.
     * Handles multi-line JSON values via line accumulation.
     */
    parseFile(path: string): AsyncGenerator<Record<string, unknown>>;

    /**
     * Yield parsed records from a Readable stream of NDJSON data.
     * Handles multi-line JSON values via line accumulation.
     */
    parseStream(stream: Readable): AsyncGenerator<Record<string, unknown>>;

    /**
     * Yield parsed records from an iterable of NDJSON lines.
     * Synchronous; useful for in-memory parsing and testing.
     */
    parseLines(lines: Iterable<string>): Generator<Record<string, unknown>>;
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
} from "@webiny/utils-node";

const container = new Container();
PinoLoggerFeature.register(container);
ReadStreamFactoryFeature.register(container);
NdJsonReaderToolFeature.register(container);

const reader = container.resolve(NdJsonReaderTool);
for await (const record of reader.parseFile("/data/events.ndjson")) {
    console.log(record);
}
```

### Without DI

```ts
import { createNdJsonReaderTool } from "@webiny/utils-node";

const reader = createNdJsonReaderTool();
for await (const record of reader.parseFile("/data/events.ndjson")) {
    console.log(record);
}
```
```

- [ ] **Step 8: Run the full pre-commit chain**

```sh
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Expected: all five steps pass with zero errors and zero warnings.

- [ ] **Step 9: Commit**

```sh
git add packages/node/src/features/ReadStreamFactory/README.md \
        packages/node/src/features/FileTool/README.md \
        packages/node/src/features/DirectoryTool/README.md \
        packages/node/src/features/JsonFileTool/README.md \
        packages/node/src/features/PathTool/README.md \
        packages/node/src/features/PinoLogger/README.md \
        packages/node/src/features/NdJsonReaderTool/README.md
git commit -m "docs(utils-node): add README to every feature folder"
```
