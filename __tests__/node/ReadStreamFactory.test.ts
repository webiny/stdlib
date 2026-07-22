import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import {
    ReadStreamFactory,
    ReadStreamFactoryFeature,
    createReadStreamFactory
} from "../../src/node/features/ReadStreamFactory/index.js";

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

        const rs = factory.create(filePath);
        try {
            const chunks: Buffer[] = [];
            for await (const chunk of rs.getStream()) {
                chunks.push(chunk as Buffer);
            }
            expect(Buffer.concat(chunks).toString()).toBe("hello world");
        } finally {
            rs.destroy();
        }
    });

    it("destroys the stream on destroy()", async () => {
        const filePath = join(tmpDir, "test.txt");
        writeFileSync(filePath, "hello");

        const rs = factory.create(filePath);
        const capturedStream = rs.getStream();
        const chunks: Buffer[] = [];
        for await (const chunk of capturedStream) {
            chunks.push(chunk as Buffer);
        }
        rs.destroy();
        expect(capturedStream.destroyed).toBe(true);
    });

    it("respects ReadStreamOptions (start/end byte range)", async () => {
        const filePath = join(tmpDir, "test.txt");
        writeFileSync(filePath, "hello world");

        const rs = factory.create(filePath, { start: 6, end: 10 });
        try {
            const chunks: Buffer[] = [];
            for await (const chunk of rs.getStream()) {
                chunks.push(chunk as Buffer);
            }
            expect(Buffer.concat(chunks).toString()).toBe("world");
        } finally {
            rs.destroy();
        }
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
            const rs = f.create(filePath);
            try {
                const chunks: Buffer[] = [];
                for await (const chunk of rs.getStream()) {
                    chunks.push(chunk as Buffer);
                }
                expect(Buffer.concat(chunks).toString()).toBe("direct");
            } finally {
                rs.destroy();
            }
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
