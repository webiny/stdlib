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
