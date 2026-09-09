import { createAbstraction } from "~/common/index.js";
import type { Result } from "~/common/index.js";
import type { FileWriteError, FileCopyError } from "../errors.js";

export interface IFileTool {
    exists(path: string): boolean;
    readFile(path: string): string | null;
    readFileOrThrow(path: string): string;
    /** Writes content to the file, creating parent directories as needed. */
    writeFile(path: string, content: string): Result<void, FileWriteError>;
    writeFileOrThrow(path: string, content: string): void;
    remove(path: string): void;
    /** Copies the file from source to target, creating parent directories as needed. */
    copy(source: string, target: string): Result<void, FileCopyError>;
    copyOrThrow(source: string, target: string): void;
}

export const FileTool = createAbstraction<IFileTool>("Core/FileTool");

export namespace FileTool {
    export type Interface = IFileTool;
}
