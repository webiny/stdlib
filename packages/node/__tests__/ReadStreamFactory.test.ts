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
