import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PublishOrchestrator as PublishOrchestratorAbstraction } from "./abstractions/PublishOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { bin } from "../../bin.ts";

interface DistPackageJson {
    version: string;
    [key: string]: unknown;
}

class PublishOrchestratorImpl implements PublishOrchestratorAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;

    public constructor(config: ProjectConfig.Interface) {
        this.config = config;
    }

    public run(): void {
        const { rootDir, packageName, version } = this.config;
        const distDir = join(rootDir, "dist");
        const pkgJsonPath = join(distDir, "package.json");

        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as DistPackageJson;
        pkgJson.version = version;
        writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");

        console.log(`Publishing ${packageName}@${version} to http://localhost:4873 ...`);

        execFileSync(bin("npm"), ["publish", "--registry", "http://localhost:4873"], {
            cwd: distDir,
            stdio: "inherit"
        });
    }
}

export const PublishOrchestrator = PublishOrchestratorAbstraction.createImplementation({
    implementation: PublishOrchestratorImpl,
    dependencies: [ProjectConfig]
});
