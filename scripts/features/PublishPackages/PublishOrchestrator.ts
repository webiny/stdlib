import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface DistPackageJson {
    version: string;
    dependencies?: Record<string, string>;
    [key: string]: unknown;
}
import { PublishOrchestrator as PublishOrchestratorAbstraction } from "./abstractions/PublishOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { NpmRegistry } from "./abstractions/NpmRegistry.ts";
import { GitRepository } from "./abstractions/GitRepository.ts";
import { VersionStrategy } from "./abstractions/VersionStrategy.ts";
import { ChangelogWriter } from "./abstractions/ChangelogWriter.ts";

class PublishOrchestratorImpl implements PublishOrchestratorAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;
    private readonly npm: NpmRegistry.Interface;
    private readonly git: GitRepository.Interface;
    private readonly versionStrategy: VersionStrategy.Interface;
    private readonly changelogWriter: ChangelogWriter.Interface;

    public constructor(
        config: ProjectConfig.Interface,
        npm: NpmRegistry.Interface,
        git: GitRepository.Interface,
        versionStrategy: VersionStrategy.Interface,
        changelogWriter: ChangelogWriter.Interface
    ) {
        this.config = config;
        this.npm = npm;
        this.git = git;
        this.versionStrategy = versionStrategy;
        this.changelogWriter = changelogWriter;
    }

    public run(): void {
        const { rootDir, packageName } = this.config;

        const published = this.npm.getLatestVersion(packageName) ?? "0.0.0";
        console.log(`Latest published: ${published}`);

        const releaseTag = `v${published}`;
        const since = this.git.tagExists(releaseTag) ? releaseTag : null;
        const commits = this.git.commitsSince(since);

        if (commits.length === 0) {
            console.log("No new commits since last release. Nothing to publish.");
            return;
        }

        const result = this.versionStrategy.computeVersion(published, commits);
        if ("error" in result) {
            console.error(`Publish aborted: ${result.error}`);
            process.exit(1);
        }

        const { newVersion, bumpType } = result;
        console.log(`${bumpType} bump: ${published} → ${newVersion}`);
        console.log("Commits:");
        for (const commit of commits) {
            console.log(`  ${commit}`);
        }

        if (this.config.dryRun) {
            console.log("[dry run] would update CHANGELOG.md");
            console.log(`[dry run] would publish ${packageName}@${newVersion}`);
            console.log(`[dry run] would tag v${newVersion}`);
            return;
        }

        this.changelogWriter.write(newVersion, commits);
        console.log("Updated CHANGELOG.md");

        const distDir = join(rootDir, "dist");
        const pkgJsonPath = join(distDir, "package.json");
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as DistPackageJson;
        pkgJson.version = newVersion;
        if (pkgJson.dependencies !== undefined) {
            for (const dep of Object.keys(pkgJson.dependencies)) {
                if (pkgJson.dependencies[dep] === "0.0.0") {
                    pkgJson.dependencies[dep] = newVersion;
                }
            }
        }
        writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");

        console.log(`Publishing ${packageName}@${newVersion}...`);
        this.npm.publish(distDir);

        this.git.createTag(`v${newVersion}`);
        console.log(`Tagged v${newVersion}`);
    }
}

export const PublishOrchestrator = PublishOrchestratorAbstraction.createImplementation({
    implementation: PublishOrchestratorImpl,
    dependencies: [ProjectConfig, NpmRegistry, GitRepository, VersionStrategy, ChangelogWriter]
});
