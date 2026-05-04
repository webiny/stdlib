import { join } from "node:path";
import { BuildOrchestrator as BuildOrchestratorAbstraction } from "./abstractions/BuildOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { Cleaner } from "./abstractions/Cleaner.ts";
import { Compiler } from "./abstractions/Compiler.ts";
import { ArtifactCopier } from "./abstractions/ArtifactCopier.ts";

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
        const { rootDir, packages } = this.config;

        for (const pkg of packages) {
            this.cleaner.clean(join(rootDir, "packages", pkg.dir, "dist"));
        }

        for (const pkg of packages) {
            if (pkg.slices !== undefined) {
                for (const slice of pkg.slices) {
                    this.compiler.compile(join("packages", pkg.dir, slice));
                }
            } else {
                this.compiler.compile(join("packages", pkg.dir));
            }
        }

        for (const pkg of packages) {
            const packageAbsDir = join(rootDir, "packages", pkg.dir);
            const distAbsDir = join(packageAbsDir, "dist");
            this.artifactCopier.copyPackageJson(packageAbsDir, distAbsDir);
            this.artifactCopier.copyReadme(packageAbsDir, distAbsDir);
            this.artifactCopier.copyLicense(rootDir, distAbsDir);
        }
    }
}

export const BuildOrchestrator = BuildOrchestratorAbstraction.createImplementation({
    implementation: BuildOrchestratorImpl,
    dependencies: [ProjectConfig, Cleaner, Compiler, ArtifactCopier]
});
