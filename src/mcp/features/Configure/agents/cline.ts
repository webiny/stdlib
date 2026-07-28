import type { AgentModule } from "./types.js";
import { writeMcpConfig } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "cline",
        displayName: "Cline",
        configFile: ".vscode/cline_mcp_settings.json",
        configKey: "mcpServers"
    },
    async init({ cwd }) {
        writeMcpConfig({
            cwd,
            configFile: ".vscode/cline_mcp_settings.json",
            configKey: "mcpServers"
        });
    }
};

export default module;
