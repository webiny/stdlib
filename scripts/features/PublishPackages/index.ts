import { Container } from "@webiny/di";
import { ProjectConfig, PublishOrchestrator } from "./abstractions/index.ts";
import { NpmRegistry as NpmRegistryImpl } from "./NpmRegistry.ts";
import { GitRepository as GitRepositoryImpl } from "./GitRepository.ts";
import { VersionStrategy as VersionStrategyImpl } from "./VersionStrategy.ts";
import { ChangelogWriter as ChangelogWriterImpl } from "./ChangelogWriter.ts";
import { PublishOrchestrator as PublishOrchestratorImpl } from "./PublishOrchestrator.ts";
import { getWorkspaces } from "../../getWorkspaces.ts";

export function run(rootDir: string): void {
    const dryRun = !process.argv.includes("--publish");
    if (dryRun) {
        console.log("Dry run — pass --publish to actually publish.");
    }

    const packages = getWorkspaces(rootDir);
    const container = new Container();
    container.registerInstance(ProjectConfig, { rootDir, packages, dryRun });
    container.register(NpmRegistryImpl).inSingletonScope();
    container.register(GitRepositoryImpl).inSingletonScope();
    container.register(VersionStrategyImpl).inSingletonScope();
    container.register(ChangelogWriterImpl).inSingletonScope();
    container.register(PublishOrchestratorImpl).inSingletonScope();
    container.resolve(PublishOrchestrator).run();
}
