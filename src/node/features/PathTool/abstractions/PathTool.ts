import { createAbstraction } from "~/common/index.js";

export interface IPathTool {
    /** Joins path segments using the OS-native separator. */
    join(...paths: string[]): string;
    /** Resolves a sequence of paths into an absolute path. Relative segments resolve against `process.cwd()`. */
    resolve(...paths: string[]): string;
    /** Returns the directory portion of a path. */
    dirname(path: string): string;
    /** Returns the last segment of a path. Strips `ext` when provided. */
    basename(path: string, ext?: string): string;
    /**
     * Resolves a package-relative file specifier to an absolute filesystem path.
     * Resolution starts from `process.cwd()`, matching Node's standard module
     * lookup (hoisted node_modules at the project root).
     *
     * @throws PackageNotFoundError when the specifier cannot be resolved.
     */
    resolvePackageFile(specifier: string): string;
}

export const PathTool = createAbstraction<IPathTool>("Node/PathTool");

export namespace PathTool {
    export type Interface = IPathTool;
}
