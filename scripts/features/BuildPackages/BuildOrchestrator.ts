import { BuildOrchestrator as BuildOrchestratorAbstraction } from "./abstractions/BuildOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { Cleaner } from "./abstractions/Cleaner.ts";
import { Compiler } from "./abstractions/Compiler.ts";
import { ArtifactCopier } from "./abstractions/ArtifactCopier.ts";
import { join } from "node:path";

class BuildOrchestratorImpl implements BuildOrchestratorAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;
    private readonly cleaner: Cleaner.Interface;
    private readonly compiler: Compiler.Interface;
    private readonly artifactCopier: ArtifactCopier.Interface;

    public constructor(
        config: ProjectConfig.Interface,
        cleaner: Cleaner.Interface,
        compiler: Compiler.Interface,
        artifactCopier: ArtifactCopier.Interface
    ) {
        this.config = config;
        this.cleaner = cleaner;
        this.compiler = compiler;
        this.artifactCopier = artifactCopier;
    }

    public run(): void {
        const { rootDir, slices } = this.config;
        const distDir = join(rootDir, "dist");

        this.cleaner.clean(distDir);

        for (const slice of slices) {
            this.compiler.compile(slice);
        }

        this.artifactCopier.copyPackageJson(rootDir, distDir);
        this.artifactCopier.copyReadme(rootDir, distDir);
        this.artifactCopier.copyLicense(rootDir, distDir);
    }
}

export const BuildOrchestrator = BuildOrchestratorAbstraction.createImplementation({
    implementation: BuildOrchestratorImpl,
    dependencies: [ProjectConfig, Cleaner, Compiler, ArtifactCopier]
});
