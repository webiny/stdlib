# ReadStreamFactory & Per-Feature READMEs Design

**Date:** 2026-05-03
**Package:** `@webiny/utils-node`
**Status:** Approved

---

## Overview

Two related improvements:

1. **`ReadStreamFactory`** — promote the internal `ReadStream` helper used by `NdJsonReaderTool` into a first-class public DI feature so users can build their own streaming tools with safe, guaranteed stream disposal.
2. **Per-feature READMEs** — add a `README.md` to every feature folder in `utils-node`. Level B: description, interface listing with JSDoc, and usage examples (DI + factory function).

---

## ReadStreamFactory

### Package & Token

- **Package:** `utils-node` — depends on `node:fs` and `node:stream`, both Node-only.
- **DI token:** `"Node/ReadStreamFactory"` — Node-specific prefix per convention.

### Abstraction

File: `packages/node/src/features/ReadStreamFactory/abstractions/ReadStreamFactory.ts`

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

`IReadStream` is not a DI token — it is a value object returned by the factory. Users type variables as `ReadStreamFactory.Stream`.

### File Layout

```
packages/node/src/features/ReadStreamFactory/
├── abstractions/
│   ├── ReadStreamFactory.ts    ← interfaces + token + namespaces
│   └── index.ts
├── ReadStreamFactory.ts        ← ReadStreamImpl + ReadStreamFactoryImpl + createReadStreamFactory()
├── feature.ts
├── index.ts
└── README.md
```

### Implementation

`ReadStreamFactory` has zero DI dependencies. The concrete `ReadStream` class (currently internal to `NdJsonReaderTool/ReadStream.ts`) moves here and becomes a private implementation detail.

`createReadStreamFactory()` factory takes no parameters.

### Public Exports (feature index.ts)

```ts
export { ReadStreamFactory } from "./abstractions/index.js";
export { ReadStreamFactoryFeature } from "./feature.js";
export { createReadStreamFactory } from "./ReadStreamFactory.js";
```

The `IReadStream` and `IReadStreamFactory` interfaces are accessed via the `ReadStreamFactory` namespace — they are not exported directly.

### Package Barrel (`src/index.ts`)

```ts
export { ReadStreamFactory, ReadStreamFactoryFeature, createReadStreamFactory } from "./features/ReadStreamFactory/index.js";
```

---

## NdJsonReaderTool Changes

`NdJsonReaderTool` currently owns an internal `ReadStream.ts`. With `ReadStreamFactory` promoted to a standalone feature, the internal file is deleted and the tool depends on the factory via DI.

### Dependency change

```ts
export const NdJsonReaderTool = NdJsonReaderToolAbstraction.createImplementation({
    implementation: NdJsonReaderToolImpl,
    dependencies: [Logger, ReadStreamFactory]
});
```

Constructor becomes:

```ts
public constructor(
    private readonly logger: Logger.Interface,
    private readonly readStreamFactory: ReadStreamFactory.Interface
) {}
```

### parseFile change

```ts
public async *parseFile(path: string): AsyncGenerator<Record<string, unknown>> {
    await using rs = this.readStreamFactory.create(path);
    yield* this.parseStream(rs.getStream());
}
```

### createNdJsonReaderTool factory

Gains an optional `readStreamFactory` param that falls back to `createReadStreamFactory()`:

```ts
export interface CreateNdJsonReaderToolParams {
    logger?: Logger.Interface;
    readStreamFactory?: ReadStreamFactory.Interface;
}

export function createNdJsonReaderTool(params?: CreateNdJsonReaderToolParams): NdJsonReaderToolAbstraction.Interface {
    const logger = params?.logger ?? new ConsoleLogger();
    const readStreamFactory = params?.readStreamFactory ?? createReadStreamFactory();
    return new NdJsonReaderToolImpl(logger, readStreamFactory);
}
```

### Files deleted

- `packages/node/src/features/NdJsonReaderTool/ReadStream.ts`

---

## Per-Feature READMEs

Every feature folder in `utils-node` gets a `README.md`. Format (Level B):

1. **Description** — one paragraph: what the tool does and when to reach for it.
2. **Interface** — the public methods, with JSDoc excerpts from the abstraction file.
3. **Usage** — two code snippets:
   - DI container wiring via the feature + `container.resolve()`
   - Direct instantiation via the `createXxx()` factory function

Features receiving READMEs:

| Feature | README path |
|---------|-------------|
| `FileTool` | `packages/node/src/features/FileTool/README.md` |
| `DirectoryTool` | `packages/node/src/features/DirectoryTool/README.md` |
| `JsonFileTool` | `packages/node/src/features/JsonFileTool/README.md` |
| `PathTool` | `packages/node/src/features/PathTool/README.md` |
| `PinoLogger` | `packages/node/src/features/PinoLogger/README.md` |
| `NdJsonReaderTool` | `packages/node/src/features/NdJsonReaderTool/README.md` |
| `ReadStreamFactory` | `packages/node/src/features/ReadStreamFactory/README.md` |

---

## Testing

`NdJsonReaderToolFeature.register` must now also register `ReadStreamFactoryFeature` (or register it explicitly in the test container). The `makeContainer()` helper in `__tests__/NdJsonReaderTool.test.ts` is updated accordingly.

`ReadStreamFactory` gets its own test file: `packages/node/__tests__/ReadStreamFactory.test.ts`. Covers:
- `create()` returns a stream that produces bytes from the file
- `[Symbol.asyncDispose]` destroys the stream (verify `stream.destroyed === true`)
- `await using` releases the file handle on early generator exit

---

## Implementation Order

1. Create `ReadStreamFactory` feature (abstractions, impl, feature, index, README)
2. Update `NdJsonReaderTool` (delete `ReadStream.ts`, inject factory, update factory function, update test container)
3. Write READMEs for the six existing features
4. Add `ReadStreamFactory` to package barrel
5. Run full pre-commit chain and commit
