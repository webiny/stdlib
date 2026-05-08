import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Container } from "@webiny/di";
import { ProjectConfig, PublishOrchestrator } from "./abstractions/index.ts";
import { NpmRegistry as NpmRegistryImpl } from "./NpmRegistry.ts";
import { GitRepository as GitRepositoryImpl } from "./GitRepository.ts";
import { VersionStrategy as VersionStrategyImpl } from "./VersionStrategy.ts";
import { ChangelogWriter as ChangelogWriterImpl } from "./ChangelogWriter.ts";
import { GithubToken as GithubTokenImpl } from "./GithubToken.ts";
import { GithubRelease as GithubReleaseImpl } from "./GithubRelease.ts";
import { PublishOrchestrator as PublishOrchestratorImpl } from "./PublishOrchestrator.ts";

export async function run(rootDir: string): Promise<void> {
    const dryRun = !process.argv.includes("--publish");
    if (dryRun) {
        console.log("Dry run — pass --publish to actually publish.");
    }

    const pkgJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")) as {
        name: string;
    };
    const container = new Container();
    container.registerInstance(ProjectConfig, { rootDir, packageName: pkgJson.name, dryRun });
    container.register(NpmRegistryImpl).inSingletonScope();
    container.register(GitRepositoryImpl).inSingletonScope();
    container.register(VersionStrategyImpl).inSingletonScope();
    container.register(ChangelogWriterImpl).inSingletonScope();
    container.register(GithubTokenImpl).inSingletonScope();
    container.register(GithubReleaseImpl).inSingletonScope();
    container.register(PublishOrchestratorImpl).inSingletonScope();
    await container.resolve(PublishOrchestrator).run();
}
