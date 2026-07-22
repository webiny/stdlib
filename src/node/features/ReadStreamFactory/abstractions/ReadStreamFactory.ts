import { createAbstraction } from "~/common/index.js";
import type { Readable } from "node:stream";
import type { PathLike, ReadStreamOptions } from "node:fs";

export interface IReadStream {
    /** Returns the underlying Node.js Readable stream. */
    getStream(): Readable;
    /** Destroys the underlying stream, releasing the file handle. */
    destroy(): void;
}

export interface IReadStreamFactory {
    /**
     * Creates a read stream for the given path.
     * Mirrors node:fs createReadStream exactly — all native options are supported.
     * Call `destroy()` when done to release the file handle.
     */
    create(path: PathLike, options?: BufferEncoding | ReadStreamOptions): IReadStream;
}

export const ReadStreamFactory = createAbstraction<IReadStreamFactory>("Node/ReadStreamFactory");

export namespace ReadStreamFactory {
    export type Interface = IReadStreamFactory;
    /** The disposable stream handle returned by `create()`. */
    export type Stream = IReadStream;
}
