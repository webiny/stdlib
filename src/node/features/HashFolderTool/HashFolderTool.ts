import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
    HashFolderTool as HashFolderToolAbstraction,
    type HashFolderOptions
} from "./abstractions/HashFolderTool.js";

class HashFolderToolImpl implements HashFolderToolAbstraction.Interface {
    public async hash(folderPath: string, options?: HashFolderOptions): Promise<string> {
        const excludeFolders = new Set(options?.excludeFolders ?? []);
        const excludeFiles = new Set(options?.excludeFiles ?? []);

        const entries = await this.collectFiles(
            folderPath,
            folderPath,
            excludeFolders,
            excludeFiles
        );
        entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

        const combinedHash = createHash("sha256");
        for (const entry of entries) {
            combinedHash.update(entry.relativePath);
            combinedHash.update(entry.fileHash);
        }

        return combinedHash.digest("hex");
    }

    private async collectFiles(
        rootPath: string,
        currentPath: string,
        excludeFolders: Set<string>,
        excludeFiles: Set<string>
    ): Promise<FileEntry[]> {
        const entries: FileEntry[] = [];
        const dirEntries = await readdir(currentPath, { withFileTypes: true });

        for (const dirEntry of dirEntries) {
            if (dirEntry.isDirectory()) {
                if (excludeFolders.has(dirEntry.name)) {
                    continue;
                }
                const subEntries = await this.collectFiles(
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
                const content = await readFile(filePath);
                const fileHash = createHash("sha256").update(content).digest("hex");
                entries.push({
                    relativePath: relative(rootPath, filePath),
                    fileHash
                });
            }
        }

        return entries;
    }
}

interface FileEntry {
    relativePath: string;
    fileHash: string;
}

export const HashFolderTool = HashFolderToolAbstraction.createImplementation({
    implementation: HashFolderToolImpl,
    dependencies: []
});

export function createHashFolderTool(): HashFolderToolAbstraction.Interface {
    return new HashFolderToolImpl();
}

/**
 * Standalone convenience function — computes a SHA-256 hash of a folder's contents
 * without requiring DI wiring.
 */
export async function hashFolder(folderPath: string, options?: HashFolderOptions): Promise<string> {
    const tool = createHashFolderTool();
    return tool.hash(folderPath, options);
}
