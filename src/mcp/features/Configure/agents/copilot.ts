import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "copilot",
        displayName: "GitHub Copilot",
        configFile: ".vscode/mcp.json",
        configKey: "servers",
        hintFile: ".github/copilot-instructions.md"
    },
    async init({ cwd }) {
        writeMcpConfig({ cwd, configFile: ".vscode/mcp.json", configKey: "servers" });
        writeHintFile({
            cwd,
            hintFile: ".github/copilot-instructions.md",
            content: stdlibHintBlock()
        });
    }
};

export default module;
