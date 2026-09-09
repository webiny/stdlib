import { createAbstraction } from "~/common/index.js";
import type { Result } from "~/common/index.js";
import type { PackageJson } from "type-fest";
import type { FileWriteError } from "../../FileTool/errors.js";
import type { PackageJsonFile } from "../PackageJsonFile.js";

export interface IPackageJsonFileTool {
    /**
     * Read and validate a package.json file at the given path.
     * Returns null if the file does not exist.
     * Throws on JSON parse failure or schema validation error.
     */
    read(path: string): PackageJsonFile.Interface | null;

    /**
     * Read and validate a package.json file at the given path.
     * Throws if the file does not exist, JSON parse fails, or validation fails.
     */
    readOrThrow(path: string): PackageJsonFile.Interface;

    /**
     * Serialize `data` as formatted JSON and write it to `path`.
     * Creates parent directories as needed.
     */
    write(path: string, data: PackageJson): Result<void, FileWriteError>;
    /**
     * Serialize `file.raw` as formatted JSON and write it to `file.path`.
     * Creates parent directories as needed.
     */
    write(file: PackageJsonFile.Interface): Result<void, FileWriteError>;

    /**
     * Serialize `data` as formatted JSON and write it to `path`.
     * Creates parent directories as needed. Throws if the write fails.
     */
    writeOrThrow(path: string, data: PackageJson): void;
    /**
     * Serialize `file.raw` as formatted JSON and write it to `file.path`.
     * Creates parent directories as needed. Throws if the write fails.
     */
    writeOrThrow(file: PackageJsonFile.Interface): void;
}

export const PackageJsonFileTool = createAbstraction<IPackageJsonFileTool>(
    "Node/PackageJsonFileTool"
);

export namespace PackageJsonFileTool {
    export type Interface = IPackageJsonFileTool;
}
