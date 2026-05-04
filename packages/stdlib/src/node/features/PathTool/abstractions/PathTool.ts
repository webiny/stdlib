import { createAbstraction } from "~/common";

export interface IPathTool {
    /** Joins path segments using the OS-native separator. */
    join(...paths: string[]): string;
    /** Resolves a sequence of paths into an absolute path. Relative segments resolve against `process.cwd()`. */
    resolve(...paths: string[]): string;
    /** Returns the directory portion of a path. */
    dirname(path: string): string;
    /** Returns the last segment of a path. Strips `ext` when provided. */
    basename(path: string, ext?: string): string;
}

export const PathTool = createAbstraction<IPathTool>("Node/PathTool");

export namespace PathTool {
    export type Interface = IPathTool;
}
