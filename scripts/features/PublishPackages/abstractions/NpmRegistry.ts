import { Abstraction } from "@webiny/di";

export interface INpmRegistry {
    /** Returns the latest published version, or null if the package is not yet on the registry. */
    getLatestVersion(packageName: string): string | null;
    /** Publishes the package from the given dist directory. */
    publish(distDir: string): void;
}

export const NpmRegistry = new Abstraction<INpmRegistry>("Scripts/NpmRegistry");

export namespace NpmRegistry {
    export type Interface = INpmRegistry;
}
