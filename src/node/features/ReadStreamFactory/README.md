# ReadStreamFactory

Creates `node:fs` read streams with explicit cleanup. Call `destroy()` to release the underlying file handle when done — including early `break` from an async generator loop or thrown errors (use try/finally).

Node.js only — depends on `node:fs` and `node:stream`.

## Interface

```ts
interface IReadStreamFactory {
  /**
   * Creates a read stream for the given path.
   * Mirrors node:fs createReadStream exactly — all native options are supported.
   * Call `destroy()` when done to release the file handle.
   */
  create(path: PathLike, options?: BufferEncoding | ReadStreamOptions): IReadStream;
}

interface IReadStream {
  /** Returns the underlying Node.js Readable stream. */
  getStream(): Readable;
  /** Destroys the underlying stream, releasing the file handle. */
  destroy(): void;
}
```

`ReadStreamFactory.Stream` is the type of the value returned by `create()`.

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { ReadStreamFactory, ReadStreamFactoryFeature } from "@webiny/stdlib/node";

const container = new Container();
ReadStreamFactoryFeature.register(container);

const factory = container.resolve(ReadStreamFactory);

const rs = factory.create("/path/to/file.bin");
try {
  const stream = rs.getStream(); // node:stream Readable
} finally {
  rs.destroy();
}
```

### Without DI

```ts
import { createReadStreamFactory } from "@webiny/stdlib/node";

const factory = createReadStreamFactory();

const rs = factory.create("/path/to/file.bin", { start: 0, end: 1023 });
try {
  for await (const chunk of rs.getStream()) {
    // process chunk
  }
} finally {
  rs.destroy();
}
```
