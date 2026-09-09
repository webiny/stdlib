import {
    existsSync,
    mkdirSync,
    readdirSync,
    rmSync,
    cpSync,
    chmodSync,
    accessSync,
    constants
} from "node:fs";
import { dirname } from "node:path";
import { Result } from "~/common/index.js";
import { DirectoryTool as DirectoryToolAbstraction } from "./abstractions/DirectoryTool.js";
import type { GlobOptions } from "./abstractions/DirectoryTool.js";
import { DirectoryCreateError } from "./errors.js";
import { Logger, ConsoleLogger } from "~/common/features/Logger/index.js";
import { createGlobTool, GlobTool } from "../GlobTool/index.js";

class DirectoryToolImpl implements DirectoryToolAbstraction.Interface {
    public constructor(
        private readonly logger: Logger.Interface,
        private readonly globTool: GlobTool.Interface
    ) {}

    public exists(path: string): boolean {
        return existsSync(path);
    }

    public create(path: string): Result<void, DirectoryCreateError> {
        try {
            if (existsSync(path)) {
                try {
                    accessSync(path, constants.W_OK);
                } catch {
                    chmodSync(path, 0o755);
                }
                return Result.ok();
            }
            mkdirSync(path, { recursive: true, mode: 0o755 });
            return Result.ok();
        } catch (error) {
            return Result.fail(
                new DirectoryCreateError({
                    message: `Failed to create directory "${path}": ${error}`,
                    data: { path }
                })
            );
        }
    }

    public createOrThrow(path: string): void {
        const result = this.create(path);
        if (result.isFail()) {
            throw result.error;
        }
    }

    public readDir(path: string): string[] | null {
        if (!existsSync(path)) {
            this.logger.warn(`Directory not found: "${path}"`);
            return null;
        }
        return readdirSync(path);
    }

    public readDirOrThrow(path: string): string[] {
        if (!existsSync(path)) {
            throw new Error(`Directory not found: "${path}"`);
        }
        return readdirSync(path);
    }

    public remove(path: string): void {
        rmSync(path, { recursive: true, force: true });
    }

    public copy(source: string, target: string): void {
        if (!existsSync(source)) {
            this.logger.warn(`Source directory not found: "${source}"`);
            return;
        }
        const dirResult = this.create(dirname(target));
        if (dirResult.isFail()) {
            this.logger.warn(dirResult.error.message);
            return;
        }
        cpSync(source, target, { recursive: true });
    }

    public copyOrThrow(source: string, target: string): void {
        if (!existsSync(source)) {
            throw new Error(`Source directory not found: "${source}"`);
        }
        this.createOrThrow(dirname(target));
        cpSync(source, target, { recursive: true });
    }

    public glob(cwd: string, pattern: string | string[], options?: GlobOptions): string[] {
        if (!existsSync(cwd)) {
            return [];
        }
        return this.globTool.findAll(pattern, {
            cwd,
            dot: options?.dot,
            ignore: options?.ignore,
            deep: options?.deep,
            absolute: options?.absolute,
            onlyFiles: options?.onlyFiles ?? true
        });
    }
}

export const DirectoryTool = DirectoryToolAbstraction.createImplementation({
    implementation: DirectoryToolImpl,
    dependencies: [Logger, GlobTool]
});

export interface CreateDirectoryToolParams {
    logger?: Logger.Interface;
    glob?: GlobTool.Interface;
}

export function createDirectoryTool(
    params?: CreateDirectoryToolParams
): DirectoryToolAbstraction.Interface {
    return new DirectoryToolImpl(
        params?.logger ?? new ConsoleLogger(),
        params?.glob || createGlobTool()
    );
}
