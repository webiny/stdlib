#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Container } from "@webiny/di";
import { SkillDiscoveryConfig, McpServerFeature, McpServer } from "./features/Server/index.js";
import { AgentConfiguratorFeature, AgentConfigurator } from "./features/Configure/index.js";

function parseFlags(argv: string[]): { skills: string[]; additionalSkills: string[] } {
    const skills: string[] = [];
    const additionalSkills: string[] = [];

    for (const arg of argv) {
        if (arg.startsWith("--skills=")) {
            skills.push(arg.slice("--skills=".length));
        } else if (arg.startsWith("--additional-skills=")) {
            additionalSkills.push(arg.slice("--additional-skills=".length));
        }
    }

    return { skills, additionalSkills };
}

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

function resolveDefaultScanPaths(packageRoot: string): string[] {
    const paths: string[] = [];

    const skillsDir = join(packageRoot, "skills");
    if (existsSync(skillsDir)) {
        paths.push(skillsDir);
    }

    const srcDir = join(packageRoot, "src");
    const distDir = join(packageRoot, "dist");
    if (existsSync(srcDir)) {
        paths.push(srcDir);
    } else if (existsSync(distDir)) {
        paths.push(distDir);
    }

    return paths;
}

const command = process.argv[2];

if (command === "serve") {
    const flags = parseFlags(process.argv.slice(3));
    const packageRoot = resolvePackageRoot();

    let scanPaths: string[];
    if (flags.skills.length > 0) {
        scanPaths = [...flags.additionalSkills, ...flags.skills];
    } else {
        scanPaths = [...flags.additionalSkills, ...resolveDefaultScanPaths(packageRoot)];
    }

    const container = new Container();
    container.registerInstance(SkillDiscoveryConfig, { scanPaths });
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
