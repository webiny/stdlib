import { createAbstraction } from "~/common/index.js";

export interface SkillEntry {
    name: string;
    description: string;
    context: string;
    path: string;
}

export interface ISkillDiscovery {
    /**
     * Returns all skill entries from the manifest.
     * Each entry contains metadata only — no body content.
     */
    list(): SkillEntry[];

    /**
     * Reads and returns the body content for a skill by name.
     * Strips YAML front-matter before returning.
     * Returns null if the skill is not found or the file cannot be read.
     */
    loadBody(name: string): string | null;
}

export const SkillDiscovery = createAbstraction<ISkillDiscovery>("Mcp/SkillDiscovery");

export namespace SkillDiscovery {
    export type Interface = ISkillDiscovery;
}
