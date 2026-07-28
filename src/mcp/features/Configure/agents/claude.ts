import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "claude",
        displayName: "Claude Code",
        configFile: ".mcp.json",
        configKey: "mcpServers",
        hintFile: "CLAUDE.md"
    },
    async init({ cwd }) {
        writeMcpConfig({ cwd, configFile: ".mcp.json", configKey: "mcpServers" });
        writeHintFile({ cwd, hintFile: "CLAUDE.md", content: stdlibHintBlock() });
    }
};

export default module;
