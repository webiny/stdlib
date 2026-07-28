import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "windsurf",
        displayName: "Windsurf",
        configFile: ".windsurf/mcp.json",
        configKey: "mcpServers",
        hintFile: ".windsurf/rules/stdlib.md"
    },
    async init({ cwd }) {
        writeMcpConfig({ cwd, configFile: ".windsurf/mcp.json", configKey: "mcpServers" });
        writeHintFile({
            cwd,
            hintFile: ".windsurf/rules/stdlib.md",
            content: stdlibHintBlock()
        });
    }
};

export default module;
