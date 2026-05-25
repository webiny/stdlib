import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
    HashFolderTool as HashFolderToolAbstraction,
    type HashFolderOptions
} from "./abstractions/HashFolderTool.js";

interface FileEntry {
    relativePath: string;
    fileHash: string;
}

function combineEntries(entries: FileEntry[]): string {
    entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    const combined = createHash("sha256");
    for (const entry of entries) {
        combined.update(entry.relativePath);
        combined.update(entry.fileHash);
    }
    return combined.digest("hex");
}

function collectFilesSync(
    rootPath: string,
    currentPath: string,
    excludeFolders: Set<string>,
    excludeFiles: Set<string>
): FileEntry[] {
    const entries: FileEntry[] = [];
    const dirEntries = readdirSync(currentPath, { withFileTypes: true });

    for (const dirEntry of dirEntries) {
        if (dirEntry.isDirectory()) {
            if (excludeFolders.has(dirEntry.name)) {
                continue;
            }
            const subEntries = collectFilesSync(
                rootPath,
                join(currentPath, dirEntry.name),
                excludeFolders,
                excludeFiles
            );
            entries.push(...subEntries);
        } else if (dirEntry.isFile()) {
            if (excludeFiles.has(dirEntry.name)) {
                continue;
            }
            const filePath = join(currentPath, dirEntry.name);
            const content = readFileSync(filePath);
            const fileHash = createHash("sha256").update(content).digest("hex");
            entries.push({ relativePath: relative(rootPath, filePath), fileHash });
        }
    }

    return entries;
}

async function collectFilesAsync(
    rootPath: string,
    currentPath: string,
    excludeFolders: Set<string>,
    excludeFiles: Set<string>
): Promise<FileEntry[]> {
    const dirEntries = await readdir(currentPath, { withFileTypes: true });

    const tasks: Promise<FileEntry[]>[] = [];
    const fileEntries: Promise<FileEntry>[] = [];

    for (const dirEntry of dirEntries) {
        if (dirEntry.isDirectory()) {
            if (excludeFolders.has(dirEntry.name)) {
                continue;
            }
            tasks.push(
                collectFilesAsync(
                    rootPath,
                    join(currentPath, dirEntry.name),
                    excludeFolders,
                    excludeFiles
                )
            );
        } else if (dirEntry.isFile()) {
            if (excludeFiles.has(dirEntry.name)) {
                continue;
            }
            const filePath = join(currentPath, dirEntry.name);
            fileEntries.push(
                readFile(filePath).then(content => ({
                    relativePath: relative(rootPath, filePath),
                    fileHash: createHash("sha256").update(content).digest("hex")
                }))
            );
        }
    }

    const [subResults, localFiles] = await Promise.all([
        Promise.all(tasks),
        Promise.all(fileEntries)
    ]);

    return subResults.flat().concat(localFiles);
}

class HashFolderToolImpl implements HashFolderToolAbstraction.Interface {
    public hash(folderPath: string, options?: HashFolderOptions): string {
        const excludeFolders = new Set(options?.excludeFolders ?? []);
        const excludeFiles = new Set(options?.excludeFiles ?? []);
        const entries = collectFilesSync(folderPath, folderPath, excludeFolders, excludeFiles);
        return combineEntries(entries);
    }

    public async hashAsync(folderPath: string, options?: HashFolderOptions): Promise<string> {
        const excludeFolders = new Set(options?.excludeFolders ?? []);
        const excludeFiles = new Set(options?.excludeFiles ?? []);
        const entries = await collectFilesAsync(
            folderPath,
            folderPath,
            excludeFolders,
            excludeFiles
        );
        return combineEntries(entries);
    }
}

export const HashFolderTool = HashFolderToolAbstraction.createImplementation({
    implementation: HashFolderToolImpl,
    dependencies: []
});

export function createHashFolderTool(): HashFolderToolAbstraction.Interface {
    return new HashFolderToolImpl();
}

/**
 * Standalone sync — computes a SHA-256 hash of a folder's contents.
 */
export function hashFolder(folderPath: string, options?: HashFolderOptions): string {
    return new HashFolderToolImpl().hash(folderPath, options);
}

/**
 * Standalone async — reads files and subdirectories in parallel.
 */
export async function hashFolderAsync(
    folderPath: string,
    options?: HashFolderOptions
): Promise<string> {
    return new HashFolderToolImpl().hashAsync(folderPath, options);
}
