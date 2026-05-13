import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Container } from "@webiny/di";
import { ProjectConfig, PublishOrchestrator } from "./abstractions/index.ts";
import { PublishOrchestrator as PublishOrchestratorImpl } from "./PublishOrchestrator.ts";

export function run(rootDir: string, version: string): void {
    const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")) as {
        name: string;
    };
    const container = new Container();
    container.registerInstance(ProjectConfig, {
        rootDir,
        packageName: pkg.name,
        version
    });
    container.register(PublishOrchestratorImpl).inSingletonScope();
    container.resolve(PublishOrchestrator).run();
}
