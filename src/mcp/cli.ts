#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Container } from "@webiny/di";
import { SkillDiscoveryConfig, McpServerFeature, McpServer } from "./features/Server/index.js";
import { AgentConfiguratorFeature, AgentConfigurator } from "./features/Configure/index.js";

function resolvePackageRoot(): string {
    const thisFile = fileURLToPath(import.meta.url);
    let dir = dirname(thisFile);
    while (dir !== dirname(dir)) {
        if (existsSync(join(dir, "package.json"))) {
            return dir;
        }
        dir = dirname(dir);
    }
    return dirname(thisFile);
}

const command = process.argv[2];

if (command === "serve") {
    const packageRoot = resolvePackageRoot();
    const manifestPath = join(packageRoot, "skills.json");

    const container = new Container();
    container.registerInstance(SkillDiscoveryConfig, { manifestPath });
    McpServerFeature.register(container);
    await container.resolve(McpServer).start();
} else if (command === "configure") {
    const container = new Container();
    AgentConfiguratorFeature.register(container);
    await container.resolve(AgentConfigurator).configure();
} else {
    console.error("Usage: stdlib-mcp <serve|configure>");
    process.exit(1);
}
