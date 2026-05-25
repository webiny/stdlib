import { createAbstraction } from "~/common/index.js";

/**
 * Options for filtering which folders and files are included in the hash.
 */
export interface HashFolderOptions {
    /** Folder names to skip during traversal (e.g. "node_modules", "dist"). */
    excludeFolders?: string[];
    /** File names to skip (e.g. "tsconfig.build.tsbuildinfo"). */
    excludeFiles?: string[];
}

/**
 * Computes a deterministic SHA-256 hash of a folder's contents.
 * Walks the directory recursively, hashes each file, sorts by relative path,
 * then produces a single combined hash.
 */
export interface IHashFolderTool {
    /** Returns a hex-encoded SHA-256 hash representing the folder's contents (synchronous). */
    hash(folderPath: string, options?: HashFolderOptions): string;
    /** Parallel variant — reads files and subdirectories concurrently. */
    hashAsync(folderPath: string, options?: HashFolderOptions): Promise<string>;
}

export const HashFolderTool = createAbstraction<IHashFolderTool>("Node/HashFolderTool");

export namespace HashFolderTool {
    export type Interface = IHashFolderTool;
}
