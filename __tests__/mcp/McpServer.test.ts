import { beforeEach, describe, expect, it } from "vitest";
import { Container } from "@webiny/di";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { SkillDiscoveryConfig, McpServer, McpServerFeature } from "../../src/mcp/index.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach } from "vitest";

describe("McpServer", () => {
    let tmpDir: string;
    let client: Client;
    let cleanup: () => Promise<void>;

    async function startServer(scanPaths: string[]): Promise<Client> {
        const container = new Container();
        container.registerInstance(SkillDiscoveryConfig, { scanPaths });
        McpServerFeature.register(container);
        const server = container.resolve(McpServer);

        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

        const c = new Client({ name: "test-client", version: "1.0.0" });
        await server.startWithTransport(serverTransport);
        await c.connect(clientTransport);

        cleanup = async () => {
            await c.close();
        };

        return c;
    }

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-server-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(async () => {
        rmSync(tmpDir, { recursive: true, force: true });
        if (cleanup) {
            await cleanup();
        }
    });

    it("should list tools", async () => {
        client = await startServer([tmpDir]);
        const result = await client.listTools();

        const names = result.tools.map(t => t.name);
        expect(names).toContain("list_stdlib_skills");
        expect(names).toContain("get_stdlib_skill");
    });

    it("should return grouped catalog from list_stdlib_skills", async () => {
        mkdirSync(join(tmpDir, "a"), { recursive: true });
        mkdirSync(join(tmpDir, "b"), { recursive: true });
        writeFileSync(
            join(tmpDir, "a", "README.md"),
            "---\nname: alpha\ndescription: Alpha tool.\ncontext: node\n---\n\nAlpha body."
        );
        writeFileSync(
            join(tmpDir, "b", "README.md"),
            "---\nname: beta\ndescription: Beta tool.\ncontext: common\n---\n\nBeta body."
        );

        client = await startServer([tmpDir]);
        const result = await client.callTool({ name: "list_stdlib_skills", arguments: {} });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toContain("alpha");
        expect(text).toContain("beta");
        expect(text).toContain("Node.js-specific tools");
        expect(text).toContain("Platform-agnostic utilities");
    });

    it("should return 'No skills found.' for empty catalog", async () => {
        client = await startServer([tmpDir]);
        const result = await client.callTool({ name: "list_stdlib_skills", arguments: {} });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toBe("No skills found.");
    });

    it("should return skill body from get_stdlib_skill", async () => {
        mkdirSync(join(tmpDir, "c"), { recursive: true });
        writeFileSync(
            join(tmpDir, "c", "README.md"),
            "---\nname: gamma\ndescription: Gamma.\ncontext: node\n---\n\nGamma content here."
        );

        client = await startServer([tmpDir]);
        const result = await client.callTool({
            name: "get_stdlib_skill",
            arguments: { topic: "gamma" }
        });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toBe("Gamma content here.");
    });

    it("should return error for unknown skill name", async () => {
        mkdirSync(join(tmpDir, "d"), { recursive: true });
        writeFileSync(
            join(tmpDir, "d", "README.md"),
            "---\nname: delta\ndescription: Delta.\n---\n\nDelta body."
        );

        client = await startServer([tmpDir]);
        const result = await client.callTool({
            name: "get_stdlib_skill",
            arguments: { topic: "nonexistent" }
        });

        expect(result.isError).toBe(true);
        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toContain("not found");
        expect(text).toContain("delta");
    });

    it("should sort skills alphabetically within groups", async () => {
        mkdirSync(join(tmpDir, "z"), { recursive: true });
        mkdirSync(join(tmpDir, "a"), { recursive: true });
        writeFileSync(
            join(tmpDir, "z", "README.md"),
            "---\nname: zebra\ndescription: Zebra.\ncontext: node\n---\n\nZ."
        );
        writeFileSync(
            join(tmpDir, "a", "README.md"),
            "---\nname: ant\ndescription: Ant.\ncontext: node\n---\n\nA."
        );

        client = await startServer([tmpDir]);
        const result = await client.callTool({ name: "list_stdlib_skills", arguments: {} });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        const antIdx = text.indexOf("ant");
        const zebraIdx = text.indexOf("zebra");
        expect(antIdx).toBeLessThan(zebraIdx);
    });
});
