import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AgentModule } from "./types.js";
import { writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "opencode",
        displayName: "OpenCode",
        configFile: "opencode.json",
        configKey: "mcp",
        hintFile: "AGENTS.md"
    },
    async init({ cwd }) {
        const configPath = join(cwd, "opencode.json");
        mkdirSync(dirname(configPath), { recursive: true });

        let existing: Record<string, unknown> = {};
        if (existsSync(configPath)) {
            existing = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
        }

        const section = (existing["mcp"] ?? {}) as Record<string, unknown>;
        if (section["stdlib"]) {
            return;
        }

        section["stdlib"] = {
            type: "stdio",
            command: ["npx", "stdlib-mcp", "serve"],
            enabled: true
        };
        existing["mcp"] = section;
        writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");

        writeHintFile({ cwd, hintFile: "AGENTS.md", content: stdlibHintBlock() });
    }
};

export default module;
