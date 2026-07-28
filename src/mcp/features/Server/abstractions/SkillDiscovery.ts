import { createAbstraction } from "~/common/index.js";

/**
 * A discovered skill, parsed from a README.md/SKILL.md file's
 * YAML front-matter and Markdown body.
 */
export interface Skill {
    name: string;
    description: string;
    context: string;
    body: string;
}

export interface ISkillDiscovery {
    /**
     * Recursively scans the configured `scanPaths` for README.md and
     * SKILL.md files with valid YAML front-matter, returning one
     * Skill per file. Files that are missing front-matter, or missing
     * required `name`/`description` fields, are skipped with a warning.
     * On a `name` collision across scan paths, the first match wins.
     */
    discover(): Skill[];
}

export const SkillDiscovery = createAbstraction<ISkillDiscovery>("Mcp/SkillDiscovery");

export namespace SkillDiscovery {
    export type Interface = ISkillDiscovery;
}
