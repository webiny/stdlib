import { Abstraction } from "@webiny/di";

export interface IProjectConfig {
    rootDir: string;
    packageName: string;
    /** Exact semver string to inject into dist/package.json before publishing. */
    version: string;
}

export const ProjectConfig = new Abstraction<IProjectConfig>(
    "Scripts/VerdaccioPublish/ProjectConfig"
);

export namespace ProjectConfig {
    export type Interface = IProjectConfig;
}
