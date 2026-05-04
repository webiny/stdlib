import { createAbstraction } from "#common";
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
