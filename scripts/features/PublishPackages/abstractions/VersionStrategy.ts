import { Abstraction } from "@webiny/di";

export type VersionResult = { newVersion: string; bumpType: "minor" | "patch" } | { error: string };

export interface IVersionStrategy {
    /**
     * Given the current version and commits since last release,
     * returns the new version and bump type, or an error if any commit is invalid.
     */
    computeVersion(currentVersion: string, commits: string[]): VersionResult;
}

export const VersionStrategy = new Abstraction<IVersionStrategy>("Scripts/VersionStrategy");

export namespace VersionStrategy {
    export type Interface = IVersionStrategy;
}
