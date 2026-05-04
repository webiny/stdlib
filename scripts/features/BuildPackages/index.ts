import { Container } from "@webiny/di";
import { ProjectConfig, BuildOrchestrator } from "./abstractions/index.ts";
import { Cleaner as CleanerImpl } from "./Cleaner.ts";
import { Compiler as CompilerImpl } from "./Compiler.ts";
import { ArtifactCopier as ArtifactCopierImpl } from "./ArtifactCopier.ts";
import { BuildOrchestrator as BuildOrchestratorImpl } from "./BuildOrchestrator.ts";
import { getWorkspaces } from "../../getWorkspaces.ts";

export function run(rootDir: string): void {
    const packages = getWorkspaces(rootDir);
    const container = new Container();
    container.registerInstance(ProjectConfig, { rootDir, packages });
    container.register(CleanerImpl).inSingletonScope();
    container.register(CompilerImpl).inSingletonScope();
    container.register(ArtifactCopierImpl).inSingletonScope();
    container.register(BuildOrchestratorImpl).inSingletonScope();
    container.resolve(BuildOrchestrator).run();
}
