import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "@11ty/gray-matter";
import {
    SkillDiscovery as SkillDiscoveryAbstraction,
    type Skill
} from "./abstractions/SkillDiscovery.js";
import { SkillDiscoveryConfig } from "./abstractions/SkillDiscoveryConfig.js";

class SkillDiscoveryImpl implements SkillDiscoveryAbstraction.Interface {
    public constructor(private readonly config: SkillDiscoveryConfig.Interface) {}

    public discover(): Skill[] {
        const seen = new Set<string>();
        const skills: Skill[] = [];

        for (const scanPath of this.config.scanPaths) {
            if (!existsSync(scanPath)) {
                continue;
            }
            this.walk(scanPath, seen, skills);
        }

        return skills;
    }

    private walk(dir: string, seen: Set<string>, skills: Skill[]): void {
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                this.walk(fullPath, seen, skills);
            } else if (entry.name === "README.md" || entry.name === "SKILL.md") {
                this.tryParseSkill(fullPath, seen, skills);
            }
        }
    }

    private tryParseSkill(filePath: string, seen: Set<string>, skills: Skill[]): void {
        let raw: string;
        try {
            raw = readFileSync(filePath, "utf-8");
        } catch {
            console.warn(`Skipping unreadable file: ${filePath}`);
            return;
        }

        if (!matter.test(raw)) {
            return;
        }

        let parsed;
        try {
            parsed = matter(raw);
        } catch {
            console.warn(`Skipping ${filePath}: invalid YAML front-matter`);
            return;
        }

        const { name, description, context } = parsed.data as Record<string, unknown>;

        if (typeof name !== "string" || name === "") {
            console.warn(`Skipping ${filePath}: missing or empty "name" field`);
            return;
        }

        if (typeof description !== "string" || description === "") {
            console.warn(`Skipping ${filePath}: missing or empty "description" field`);
            return;
        }

        if (context !== undefined && typeof context !== "string") {
            console.warn(`Skipping ${filePath}: "context" must be a string`);
            return;
        }

        // First-match-wins: earlier scanPaths take priority on name collision.
        if (seen.has(name)) {
            return;
        }

        seen.add(name);
        skills.push({
            name,
            description,
            context: typeof context === "string" ? context : "common",
            body: parsed.content.trim()
        });
    }
}

export const SkillDiscovery = SkillDiscoveryAbstraction.createImplementation({
    implementation: SkillDiscoveryImpl,
    dependencies: [SkillDiscoveryConfig]
});
