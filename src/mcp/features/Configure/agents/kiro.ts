import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "kiro",
        displayName: "Kiro",
        configFile: ".kiro/settings/mcp.json",
        configKey: "mcpServers",
        hintFile: "AGENTS.md"
    },
    async init({ cwd }) {
        writeMcpConfig({
            cwd,
            configFile: ".kiro/settings/mcp.json",
            configKey: "mcpServers"
        });
        writeHintFile({ cwd, hintFile: "AGENTS.md", content: stdlibHintBlock() });
    }
};

export default module;
