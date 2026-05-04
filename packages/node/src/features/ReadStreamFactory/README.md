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
