import { Abstraction } from "@webiny/di";

export interface IArtifactCopier {
    /** Copies package.json from the package source directory into its dist directory. */
    copyPackageJson(packageAbsDir: string, distAbsDir: string): void;
    /** Copies README.md from the package source directory into its dist directory. */
    copyReadme(packageAbsDir: string, distAbsDir: string): void;
    /** Copies LICENSE from sourceDir (typically the repo root) into distAbsDir. */
    copyLicense(sourceDir: string, distAbsDir: string): void;
}

export const ArtifactCopier = new Abstraction<IArtifactCopier>("Scripts/Build/ArtifactCopier");

export namespace ArtifactCopier {
    export type Interface = IArtifactCopier;
}
