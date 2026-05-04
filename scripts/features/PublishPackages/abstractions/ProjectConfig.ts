import { Abstraction } from "@webiny/di";

export interface IProjectConfig {
    rootDir: string;
    packages: ReadonlyArray<{ dir: string; name: string }>;
    /** When true, compute and log the release plan but skip all side effects (npm publish, git tag, CHANGELOG.md). */
    dryRun: boolean;
}

export const ProjectConfig = new Abstraction<IProjectConfig>("Scripts/ProjectConfig");

export namespace ProjectConfig {
    export type Interface = IProjectConfig;
}
