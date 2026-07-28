import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "cursor",
        displayName: "Cursor",
        configFile: ".cursor/mcp.json",
        configKey: "mcpServers",
        hintFile: ".cursor/rules/stdlib.mdc"
    },
    async init({ cwd }) {
        writeMcpConfig({ cwd, configFile: ".cursor/mcp.json", configKey: "mcpServers" });
        writeHintFile({ cwd, hintFile: ".cursor/rules/stdlib.mdc", content: stdlibHintBlock() });
    }
};

export default module;
