import { createAbstraction } from "~/common/index.js";
import type { GlobOptions } from "tinyglobby";

export type IGlobToolAllOptions = GlobOptions;
export type IGlobToolDirectoriesOptions = Omit<GlobOptions, "onlyDirectories" | "onlyFiles">;
export type IGlobToolFilesOptions = Omit<GlobOptions, "onlyDirectories" | "onlyFiles">;

export interface IGlobTool {
    findAll(patterns: string | string[], options?: IGlobToolAllOptions): string[];
    findFiles(patterns: string | string[], options?: IGlobToolFilesOptions): string[];
    findDirectories(patterns: string | string[], options?: IGlobToolDirectoriesOptions): string[];
}

export const GlobTool = createAbstraction<IGlobTool>("Core/GlobTool");

export namespace GlobTool {
    export type Interface = IGlobTool;
    export type AllOptions = IGlobToolAllOptions;
    export type FilesOptions = IGlobToolFilesOptions;
    export type DirectoriesOptions = IGlobToolDirectoriesOptions;
}
