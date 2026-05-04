import { createAbstraction } from "../../../../index.js";

export interface GlobOptions {
    /** Include dotfiles (default: false). */
    dot?: boolean;
    /** Glob patterns to exclude. */
    ignore?: string[];
    /** Maximum directory depth to traverse (default: unlimited). */
    deep?: number;
    /** Return absolute paths instead of paths relative to `cwd` (default: false). */
    absolute?: boolean;
    /** Match only files, not directories (default: true). */
    onlyFiles?: boolean;
}

export interface IDirectoryTool {
    exists(path: string): boolean;
    create(path: string): void;
    readDir(path: string): string[] | null;
    readDirOrThrow(path: string): string[];
    remove(path: string): void;
    copy(source: string, target: string): void;
    copyOrThrow(source: string, target: string): void;
    /**
     * Returns paths matching `pattern` under `cwd`.
     * Paths are relative to `cwd` unless `options.absolute` is true.
     * Returns an empty array when `cwd` does not exist or nothing matches.
     */
    glob(cwd: string, pattern: string | string[], options?: GlobOptions): string[];
}

export const DirectoryTool = createAbstraction<IDirectoryTool>("Core/DirectoryTool");

export namespace DirectoryTool {
    export type Interface = IDirectoryTool;
}
