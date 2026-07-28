import { createAbstraction } from "~/common/index.js";

/**
 * Configuration for skill discovery — directories to scan for
 * README.md / SKILL.md files containing YAML front-matter.
 */
export interface ISkillDiscoveryConfig {
    scanPaths: string[];
}

export const SkillDiscoveryConfig = createAbstraction<ISkillDiscoveryConfig>(
    "Mcp/SkillDiscoveryConfig"
);

export namespace SkillDiscoveryConfig {
    export type Interface = ISkillDiscoveryConfig;
}
