import { BuildOrchestrator as BuildOrchestratorAbstraction } from "./abstractions/BuildOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { Cleaner } from "./abstractions/Cleaner.ts";
import { Compiler } from "./abstractions/Compiler.ts";
import { ArtifactCopier } from "./abstractions/ArtifactCopier.ts";
import { PathAliasRewriter } from "./abstractions/PathAliasRewriter.ts";
import { join, dirname, relative } from "node:path";
import {
    readdirSync,
    mkdirSync,
    copyFileSync,
    existsSync,
    readFileSync,
    writeFileSync
} from "node:fs";
import matter from "@11ty/gray-matter";

interface SkillManifestEntry {
    name: string;
    description: string;
    context: string;
    path: string;
}

class BuildOrchestratorImpl implements BuildOrchestratorAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;
    private readonly cleaner: Cleaner.Interface;
    private readonly compiler: Compiler.Interface;
    private readonly artifactCopier: ArtifactCopier.Interface;
    private readonly pathAliasRewriter: PathAliasRewriter.Interface;

    public constructor(
        config: ProjectConfig.Interface,
        cleaner: Cleaner.Interface,
        compiler: Compiler.Interface,
        artifactCopier: ArtifactCopier.Interface,
        pathAliasRewriter: PathAliasRewriter.Interface
    ) {
        this.config = config;
        this.cleaner = cleaner;
        this.compiler = compiler;
        this.artifactCopier = artifactCopier;
        this.pathAliasRewriter = pathAliasRewriter;
    }

    public run(): void {
        const { rootDir, slices } = this.config;
        const distDir = join(rootDir, "dist");

        this.cleaner.clean(distDir);

        for (const slice of slices) {
            this.compiler.compile(slice);
        }

        this.pathAliasRewriter.rewrite(distDir);

        this.copyReadmes(rootDir);
        this.copySkills(rootDir);
        this.generateSkillManifest(rootDir);
        this.ensureShebang(rootDir);

        this.artifactCopier.copyPackageJson(rootDir, distDir);
        this.artifactCopier.copyReadme(rootDir, distDir);
        this.artifactCopier.copyLicense(rootDir, distDir);
    }

    private copyReadmes(rootDir: string): void {
        const srcDir = join(rootDir, "src");
        const distDir = join(rootDir, "dist");
        this.walkForFiles(srcDir, srcDir, distDir, "README.md");
    }

    private copySkills(rootDir: string): void {
        const skillsDir = join(rootDir, "skills");
        if (!existsSync(skillsDir)) {
            return;
        }
        const distSkillsDir = join(rootDir, "dist", "skills");
        this.walkForFiles(skillsDir, skillsDir, distSkillsDir, "SKILL.md");
    }

    private walkForFiles(baseDir: string, dir: string, destBase: string, fileName: string): void {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                this.walkForFiles(baseDir, fullPath, destBase, fileName);
            } else if (entry.name === fileName) {
                const relPath = relative(baseDir, fullPath);
                const destPath = join(destBase, relPath);
                mkdirSync(dirname(destPath), { recursive: true });
                copyFileSync(fullPath, destPath);
            }
        }
    }

    private generateSkillManifest(rootDir: string): void {
        const distDir = join(rootDir, "dist");
        const entries: SkillManifestEntry[] = [];

        this.scanForSkillEntries(distDir, distDir, entries);

        entries.sort((a, b) => a.name.localeCompare(b.name));
        writeFileSync(join(distDir, "skills.json"), JSON.stringify(entries, null, 2) + "\n");
    }

    private scanForSkillEntries(baseDir: string, dir: string, entries: SkillManifestEntry[]): void {
        let dirEntries;
        try {
            dirEntries = readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of dirEntries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === "node_modules" || entry.name.startsWith(".")) {
                    continue;
                }
                this.scanForSkillEntries(baseDir, fullPath, entries);
            } else if (entry.name === "README.md" || entry.name === "SKILL.md") {
                this.tryExtractEntry(baseDir, fullPath, entries);
            }
        }
    }

    private tryExtractEntry(
        baseDir: string,
        filePath: string,
        entries: SkillManifestEntry[]
    ): void {
        let raw: string;
        try {
            raw = readFileSync(filePath, "utf-8");
        } catch {
            return;
        }

        if (!matter.test(raw)) {
            return;
        }

        let parsed;
        try {
            parsed = matter(raw);
        } catch {
            return;
        }

        const { name, description, context } = parsed.data as Record<string, unknown>;
        if (typeof name !== "string" || name === "") {
            return;
        }
        if (typeof description !== "string" || description === "") {
            return;
        }

        entries.push({
            name,
            description,
            context: typeof context === "string" ? context : "common",
            path: relative(baseDir, filePath)
        });
    }

    private ensureShebang(rootDir: string): void {
        const cliPath = join(rootDir, "dist", "mcp", "cli.js");
        if (!existsSync(cliPath)) {
            return;
        }
        const content = readFileSync(cliPath, "utf-8");
        if (!content.startsWith("#!")) {
            writeFileSync(cliPath, "#!/usr/bin/env node\n" + content);
        }
    }
}

export const BuildOrchestrator = BuildOrchestratorAbstraction.createImplementation({
    implementation: BuildOrchestratorImpl,
    dependencies: [ProjectConfig, Cleaner, Compiler, ArtifactCopier, PathAliasRewriter]
});
