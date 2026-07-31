import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import matter from "@11ty/gray-matter";
import {
    SkillDiscovery as SkillDiscoveryAbstraction,
    type SkillEntry
} from "./abstractions/SkillDiscovery.js";
import { SkillDiscoveryConfig } from "./abstractions/SkillDiscoveryConfig.js";

class SkillDiscoveryImpl implements SkillDiscoveryAbstraction.Interface {
    private entries: SkillEntry[] | null = null;
    private entryMap: Map<string, SkillEntry> | null = null;

    public constructor(private readonly config: SkillDiscoveryConfig.Interface) {}

    public list(): SkillEntry[] {
        this.ensureLoaded();
        return this.entries!;
    }

    public loadBody(name: string): string | null {
        this.ensureLoaded();
        const entry = this.entryMap!.get(name);
        if (!entry) {
            return null;
        }

        const manifestDir = dirname(this.config.manifestPath);
        const fullPath = join(manifestDir, entry.path);

        let raw: string;
        try {
            raw = readFileSync(fullPath, "utf-8");
        } catch {
            return null;
        }

        if (matter.test(raw)) {
            return matter(raw).content.trim();
        }

        return raw.trim();
    }

    private ensureLoaded(): void {
        if (this.entries !== null) {
            return;
        }

        try {
            const raw = readFileSync(this.config.manifestPath, "utf-8");
            this.entries = JSON.parse(raw) as SkillEntry[];
        } catch {
            this.entries = [];
        }

        this.entryMap = new Map();
        for (const entry of this.entries) {
            this.entryMap.set(entry.name, entry);
        }
    }
}

export const SkillDiscovery = SkillDiscoveryAbstraction.createImplementation({
    implementation: SkillDiscoveryImpl,
    dependencies: [SkillDiscoveryConfig]
});
