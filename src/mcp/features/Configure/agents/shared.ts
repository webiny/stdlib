import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface WriteMcpConfigParams {
    cwd: string;
    configFile: string;
    configKey: string;
}

interface WriteHintFileParams {
    cwd: string;
    hintFile: string;
    content: string;
}

export function writeMcpConfig({ cwd, configFile, configKey }: WriteMcpConfigParams): void {
    const configPath = join(cwd, configFile);
    mkdirSync(dirname(configPath), { recursive: true });

    let existing: Record<string, unknown> = {};
    if (existsSync(configPath)) {
        existing = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
    }

    const section = (existing[configKey] ?? {}) as Record<string, unknown>;
    if (section["stdlib"]) {
        return;
    }

    section["stdlib"] = {
        command: "npx",
        args: ["stdlib-mcp", "serve"]
    };
    existing[configKey] = section;

    writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");
}

export function writeHintFile({ cwd, hintFile, content }: WriteHintFileParams): void {
    const hintPath = join(cwd, hintFile);
    mkdirSync(dirname(hintPath), { recursive: true });

    if (existsSync(hintPath)) {
        const existing = readFileSync(hintPath, "utf-8");
        if (existing.includes("list_stdlib_skills")) {
            return;
        }
        const separator = existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
        writeFileSync(hintPath, existing + separator + content + "\n");
    } else {
        writeFileSync(hintPath, content + "\n");
    }
}

export function stdlibHintBlock(): string {
    return `## @webiny/stdlib MCP

This project uses \`@webiny/stdlib\`. An MCP server is available with tools for discovering stdlib features:

- \`list_stdlib_skills\` — returns a catalog of all available skills with names and descriptions. Call this first when working with @webiny/stdlib.
- \`get_stdlib_skill\` — loads full documentation for a specific skill by name.`;
}
