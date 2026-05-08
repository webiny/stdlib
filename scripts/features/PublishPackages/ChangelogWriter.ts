import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ChangelogWriter as ChangelogWriterAbstraction } from "./abstractions/ChangelogWriter.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";

/** Matches `type(optional-scope)!: description` */
const COMMIT_RE = /^([a-z]+)(?:\([^)]*\))?!?:\s*(.+)/;

const SECTION_ORDER = [
    "Added",
    "Fixed",
    "Changed",
    "Reverted",
    "Documentation",
    "Maintenance"
] as const;

const TYPE_TO_SECTION: Record<string, string> = {
    feat: "Added",
    fix: "Fixed",
    refactor: "Changed",
    perf: "Changed",
    revert: "Reverted",
    docs: "Documentation",
    chore: "Maintenance",
    build: "Maintenance",
    ci: "Maintenance",
    test: "Maintenance",
    style: "Maintenance"
};

class ChangelogWriterImpl implements ChangelogWriterAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;

    public constructor(config: ProjectConfig.Interface) {
        this.config = config;
    }

    public write(version: string, commits: string[]): string {
        const sections = this.groupBySection(commits);
        const entry = this.formatEntry(version, sections);
        this.prepend(entry);
        return entry;
    }

    private groupBySection(commits: string[]): Map<string, string[]> {
        const sections = new Map<string, string[]>();
        for (const commit of commits) {
            const match = COMMIT_RE.exec(commit);
            if (!match) {
                continue;
            }
            const section = TYPE_TO_SECTION[match[1]!] ?? "Maintenance";
            const description = match[2]!;
            const entries = sections.get(section) ?? [];
            entries.push(description);
            sections.set(section, entries);
        }
        return sections;
    }

    private formatEntry(version: string, sections: Map<string, string[]>): string {
        const date = new Date().toISOString().slice(0, 10);
        const lines: string[] = [`## [${version}] — ${date}`, ""];
        for (const section of SECTION_ORDER) {
            const entries = sections.get(section);
            if (!entries) {
                continue;
            }
            lines.push(`### ${section}`);
            for (const entry of entries) {
                lines.push(`- ${entry}`);
            }
            lines.push("");
        }
        return lines.join("\n");
    }

    private prepend(entry: string): void {
        const changelogPath = join(this.config.rootDir, "CHANGELOG.md");
        const existing = existsSync(changelogPath) ? readFileSync(changelogPath, "utf8") : "";
        const body = existing.startsWith("# Changelog\n")
            ? existing.slice("# Changelog\n".length).trimStart()
            : existing.trimStart();
        writeFileSync(changelogPath, "# Changelog\n\n" + entry + (body ? "\n" + body : ""));
    }
}

export const ChangelogWriter = ChangelogWriterAbstraction.createImplementation({
    implementation: ChangelogWriterImpl,
    dependencies: [ProjectConfig]
});
