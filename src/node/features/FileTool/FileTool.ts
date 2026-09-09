import { existsSync, readFileSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import { Result } from "~/common/index.js";
import { FileTool as FileToolAbstraction } from "./abstractions/FileTool.js";
import { FileWriteError, FileCopyError } from "./errors.js";
import { DirectoryTool } from "../DirectoryTool/abstractions/DirectoryTool.js";
import { createDirectoryTool } from "../DirectoryTool/DirectoryTool.js";
import { Logger, ConsoleLogger } from "~/common/index.js";

class FileToolImpl implements FileToolAbstraction.Interface {
    public constructor(
        private readonly logger: Logger.Interface,
        private readonly directoryTool: DirectoryTool.Interface
    ) {}

    public exists(path: string): boolean {
        return existsSync(path);
    }

    public readFile(path: string): string | null {
        if (!existsSync(path)) {
            this.logger.warn(`File not found: "${path}"`);
            return null;
        }
        return readFileSync(path, "utf-8");
    }

    public readFileOrThrow(path: string): string {
        if (!existsSync(path)) {
            throw new Error(`File not found: "${path}"`);
        }
        return readFileSync(path, "utf-8");
    }

    public writeFile(path: string, content: string): Result<void, FileWriteError> {
        try {
            const dirResult = this.directoryTool.create(dirname(path));
            if (dirResult.isFail()) {
                return Result.fail(
                    new FileWriteError({
                        message: dirResult.error.message,
                        data: { path }
                    })
                );
            }
            writeFileSync(path, content, "utf-8");
            return Result.ok();
        } catch (error) {
            return Result.fail(
                new FileWriteError({
                    message: `Failed to write file "${path}": ${error}`,
                    data: { path }
                })
            );
        }
    }

    public writeFileOrThrow(path: string, content: string): void {
        this.directoryTool.createOrThrow(dirname(path));
        writeFileSync(path, content, "utf-8");
    }

    public remove(path: string): void {
        rmSync(path, { force: true });
    }

    public copy(source: string, target: string): Result<void, FileCopyError> {
        if (!existsSync(source)) {
            return Result.fail(
                new FileCopyError({
                    message: `Source file not found: "${source}"`,
                    data: { source, target }
                })
            );
        }
        try {
            const dirResult = this.directoryTool.create(dirname(target));
            if (dirResult.isFail()) {
                return Result.fail(
                    new FileCopyError({
                        message: dirResult.error.message,
                        data: { source, target }
                    })
                );
            }
            copyFileSync(source, target);
            return Result.ok();
        } catch (error) {
            return Result.fail(
                new FileCopyError({
                    message: `Failed to copy file "${source}" to "${target}": ${error}`,
                    data: { source, target }
                })
            );
        }
    }

    public copyOrThrow(source: string, target: string): void {
        if (!existsSync(source)) {
            throw new Error(`Source file not found: "${source}"`);
        }
        this.directoryTool.createOrThrow(dirname(target));
        copyFileSync(source, target);
    }
}

export const FileTool = FileToolAbstraction.createImplementation({
    implementation: FileToolImpl,
    dependencies: [Logger, DirectoryTool]
});

export interface CreateFileToolParams {
    logger?: Logger.Interface;
    directoryTool?: DirectoryTool.Interface;
}

export function createFileTool(params?: CreateFileToolParams): FileToolAbstraction.Interface {
    const logger = params?.logger ?? new ConsoleLogger();
    const directoryTool = params?.directoryTool ?? createDirectoryTool({ logger });
    return new FileToolImpl(logger, directoryTool);
}
