import { beforeEach, describe, expect, it } from "vitest";
import { Container } from "@webiny/di";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { SkillDiscoveryConfig, McpServer, McpServerFeature } from "../../src/mcp/index.js";
import type { SkillEntry } from "../../src/mcp/features/Server/abstractions/SkillDiscovery.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach } from "vitest";

function writeManifest(dir: string, entries: SkillEntry[]): string {
    const manifestPath = join(dir, "skills.json");
    writeFileSync(manifestPath, JSON.stringify(entries));
    return manifestPath;
}

function writeSkillFile(dir: string, relativePath: string, content: string): void {
    const fullPath = join(dir, relativePath);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content);
}

describe("McpServer", () => {
    let tmpDir: string;
    let cleanup: () => Promise<void>;

    async function startServer(manifestPath: string): Promise<Client> {
        const container = new Container();
        container.registerInstance(SkillDiscoveryConfig, { manifestPath });
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
        const manifestPath = writeManifest(tmpDir, []);
        const client = await startServer(manifestPath);
        const result = await client.listTools();

        const names = result.tools.map(t => t.name);
        expect(names).toContain("list_stdlib_skills");
        expect(names).toContain("get_stdlib_skill");
    });

    it("should return grouped catalog from list_stdlib_skills", async () => {
        writeSkillFile(
            tmpDir,
            "node/features/Alpha/README.md",
            "---\nname: alpha\ndescription: Alpha tool.\ncontext: node\n---\n\nAlpha body."
        );
        writeSkillFile(
            tmpDir,
            "common/features/Beta/README.md",
            "---\nname: beta\ndescription: Beta tool.\ncontext: common\n---\n\nBeta body."
        );
        const manifestPath = writeManifest(tmpDir, [
            {
                name: "alpha",
                description: "Alpha tool.",
                context: "node",
                path: "node/features/Alpha/README.md"
            },
            {
                name: "beta",
                description: "Beta tool.",
                context: "common",
                path: "common/features/Beta/README.md"
            }
        ]);

        const client = await startServer(manifestPath);
        const result = await client.callTool({ name: "list_stdlib_skills", arguments: {} });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toContain("alpha");
        expect(text).toContain("beta");
        expect(text).toContain("Node.js-specific tools");
        expect(text).toContain("Platform-agnostic utilities");
    });

    it("should return 'No skills found.' for empty catalog", async () => {
        const manifestPath = writeManifest(tmpDir, []);
        const client = await startServer(manifestPath);
        const result = await client.callTool({ name: "list_stdlib_skills", arguments: {} });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toBe("No skills found.");
    });

    it("should return skill body from get_stdlib_skill", async () => {
        writeSkillFile(
            tmpDir,
            "node/features/Gamma/README.md",
            "---\nname: gamma\ndescription: Gamma.\ncontext: node\n---\n\nGamma content here."
        );
        const manifestPath = writeManifest(tmpDir, [
            {
                name: "gamma",
                description: "Gamma.",
                context: "node",
                path: "node/features/Gamma/README.md"
            }
        ]);

        const client = await startServer(manifestPath);
        const result = await client.callTool({
            name: "get_stdlib_skill",
            arguments: { topic: "gamma" }
        });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toBe("Gamma content here.");
    });

    it("should return error for unknown skill name", async () => {
        const manifestPath = writeManifest(tmpDir, [
            {
                name: "delta",
                description: "Delta.",
                context: "common",
                path: "common/Delta/README.md"
            }
        ]);

        const client = await startServer(manifestPath);
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
        const manifestPath = writeManifest(tmpDir, [
            { name: "zebra", description: "Zebra.", context: "node", path: "z/README.md" },
            { name: "ant", description: "Ant.", context: "node", path: "a/README.md" }
        ]);

        const client = await startServer(manifestPath);
        const result = await client.callTool({ name: "list_stdlib_skills", arguments: {} });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        const antIdx = text.indexOf("ant");
        const zebraIdx = text.indexOf("zebra");
        expect(antIdx).toBeLessThan(zebraIdx);
    });
});
