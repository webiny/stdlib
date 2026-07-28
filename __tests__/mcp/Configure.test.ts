import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
    writeMcpConfig,
    writeHintFile,
    stdlibHintBlock
} from "../../src/mcp/features/Configure/agents/shared.js";

describe("writeMcpConfig", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-config-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should create new config file with stdlib entry", () => {
        writeMcpConfig({ cwd: tmpDir, configFile: ".mcp.json", configKey: "mcpServers" });

        const content = JSON.parse(readFileSync(join(tmpDir, ".mcp.json"), "utf-8"));
        expect(content.mcpServers.stdlib).toBeDefined();
        expect(content.mcpServers.stdlib.command).toBe("npx");
        expect(content.mcpServers.stdlib.args).toContain("stdlib-mcp");
    });

    it("should preserve existing entries when patching", () => {
        const configPath = join(tmpDir, ".mcp.json");
        writeFileSync(
            configPath,
            JSON.stringify({
                mcpServers: { other: { command: "other-cmd" } }
            })
        );

        writeMcpConfig({ cwd: tmpDir, configFile: ".mcp.json", configKey: "mcpServers" });

        const content = JSON.parse(readFileSync(configPath, "utf-8"));
        expect(content.mcpServers.other).toBeDefined();
        expect(content.mcpServers.stdlib).toBeDefined();
    });

    it("should skip if stdlib entry already exists", () => {
        const configPath = join(tmpDir, ".mcp.json");
        const original = { mcpServers: { stdlib: { command: "custom" } } };
        writeFileSync(configPath, JSON.stringify(original));

        writeMcpConfig({ cwd: tmpDir, configFile: ".mcp.json", configKey: "mcpServers" });

        const content = JSON.parse(readFileSync(configPath, "utf-8"));
        expect(content.mcpServers.stdlib.command).toBe("custom");
    });

    it("should create nested directories", () => {
        writeMcpConfig({
            cwd: tmpDir,
            configFile: ".cursor/mcp.json",
            configKey: "mcpServers"
        });

        expect(existsSync(join(tmpDir, ".cursor", "mcp.json"))).toBe(true);
    });

    it("should use servers key for copilot", () => {
        writeMcpConfig({ cwd: tmpDir, configFile: ".vscode/mcp.json", configKey: "servers" });

        const content = JSON.parse(readFileSync(join(tmpDir, ".vscode", "mcp.json"), "utf-8"));
        expect(content.servers.stdlib).toBeDefined();
    });
});

describe("writeHintFile", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-hint-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should create new hint file", () => {
        writeHintFile({
            cwd: tmpDir,
            hintFile: "CLAUDE.md",
            content: stdlibHintBlock()
        });

        const text = readFileSync(join(tmpDir, "CLAUDE.md"), "utf-8");
        expect(text).toContain("list_stdlib_skills");
    });

    it("should append to existing file with blank line separator", () => {
        const hintPath = join(tmpDir, "CLAUDE.md");
        writeFileSync(hintPath, "# Existing content");

        writeHintFile({
            cwd: tmpDir,
            hintFile: "CLAUDE.md",
            content: stdlibHintBlock()
        });

        const text = readFileSync(hintPath, "utf-8");
        expect(text).toContain("# Existing content");
        expect(text).toContain("list_stdlib_skills");
        expect(text).toContain("\n\n## @webiny/stdlib MCP");
    });

    it("should skip if marker already present", () => {
        const hintPath = join(tmpDir, "CLAUDE.md");
        writeFileSync(hintPath, "Already has list_stdlib_skills marker.");

        writeHintFile({
            cwd: tmpDir,
            hintFile: "CLAUDE.md",
            content: stdlibHintBlock()
        });

        const text = readFileSync(hintPath, "utf-8");
        expect(text).toBe("Already has list_stdlib_skills marker.");
    });

    it("should create nested directories", () => {
        writeHintFile({
            cwd: tmpDir,
            hintFile: ".cursor/rules/stdlib.mdc",
            content: stdlibHintBlock()
        });

        expect(existsSync(join(tmpDir, ".cursor", "rules", "stdlib.mdc"))).toBe(true);
    });
});

describe("agent adapters", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-agent-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    const agents = [
        { module: "claude", configFile: ".mcp.json", hintFile: "CLAUDE.md" },
        { module: "cursor", configFile: ".cursor/mcp.json", hintFile: ".cursor/rules/stdlib.mdc" },
        {
            module: "copilot",
            configFile: ".vscode/mcp.json",
            hintFile: ".github/copilot-instructions.md"
        },
        {
            module: "windsurf",
            configFile: ".windsurf/mcp.json",
            hintFile: ".windsurf/rules/stdlib.md"
        },
        { module: "kiro", configFile: ".kiro/settings/mcp.json", hintFile: "AGENTS.md" },
        { module: "opencode", configFile: "opencode.json", hintFile: "AGENTS.md" }
    ];

    for (const { module: mod, configFile, hintFile } of agents) {
        it(`should configure ${mod} agent`, async () => {
            const agent = await import(
                /* @vite-ignore */ `../../src/mcp/features/Configure/agents/${mod}.js`
            );
            await agent.default.init({ cwd: tmpDir });

            expect(existsSync(join(tmpDir, configFile))).toBe(true);
            expect(existsSync(join(tmpDir, hintFile))).toBe(true);

            const config = JSON.parse(readFileSync(join(tmpDir, configFile), "utf-8"));
            const hint = readFileSync(join(tmpDir, hintFile), "utf-8");

            expect(JSON.stringify(config)).toContain("stdlib");
            expect(hint).toContain("list_stdlib_skills");
        });
    }

    it("should configure cline agent (no hint file)", async () => {
        const agent = await import(
            /* @vite-ignore */ "../../src/mcp/features/Configure/agents/cline.js"
        );
        await agent.default.init({ cwd: tmpDir });

        expect(existsSync(join(tmpDir, ".vscode/cline_mcp_settings.json"))).toBe(true);
    });
});
