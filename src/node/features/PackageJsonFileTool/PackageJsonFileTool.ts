import { z } from "zod";
import type { PackageJson } from "type-fest";
import { PackageJsonFileTool as PackageJsonFileToolAbstraction } from "./abstractions/PackageJsonFileTool.js";
import { PackageJsonFile } from "./PackageJsonFile.js";
import { FileTool } from "../FileTool/abstractions/FileTool.js";
import { createFileTool } from "../FileTool/FileTool.js";

const dependencyRecord = z.record(z.string(), z.string()).optional();

/** Validates well-known root-level fields; unknown fields pass through unchanged. */
const packageJsonSchema = z
    .object({
        name: z.string().optional(),
        version: z.string().optional(),
        description: z.string().optional(),
        license: z.string().optional(),
        private: z.boolean().optional(),
        type: z.enum(["module", "commonjs"]).optional(),
        main: z.string().optional(),
        module: z.string().optional(),
        types: z.string().optional(),
        typings: z.string().optional(),
        files: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
        scripts: z.record(z.string(), z.string()).optional(),
        dependencies: dependencyRecord,
        devDependencies: dependencyRecord,
        peerDependencies: dependencyRecord,
        optionalDependencies: dependencyRecord
    })
    .passthrough();

function serialize(data: PackageJson): string {
    return JSON.stringify(data, null, 2);
}

class PackageJsonFileToolImpl implements PackageJsonFileToolAbstraction.Interface {
    public constructor(private readonly fileTool: FileTool.Interface) {}

    public read(path: string): PackageJsonFile.Interface | null {
        const content = this.fileTool.readFile(path);
        if (content === null) {
            return null;
        }
        const raw = packageJsonSchema.parse(JSON.parse(content)) as unknown as PackageJson;
        return new PackageJsonFile(path, raw);
    }

    public readOrThrow(path: string): PackageJsonFile.Interface {
        const content = this.fileTool.readFileOrThrow(path);
        const raw = packageJsonSchema.parse(JSON.parse(content)) as unknown as PackageJson;
        return new PackageJsonFile(path, raw);
    }

    public write(path: string, data: PackageJson): void;
    public write(file: PackageJsonFile.Interface): void;
    public write(pathOrFile: string | PackageJsonFile.Interface, data?: PackageJson): void {
        if (typeof pathOrFile === "string") {
            this.fileTool.writeFile(pathOrFile, serialize(data!));
        } else {
            this.fileTool.writeFile(pathOrFile.path, serialize(pathOrFile.raw));
        }
    }

    public writeOrThrow(path: string, data: PackageJson): void;
    public writeOrThrow(file: PackageJsonFile.Interface): void;
    public writeOrThrow(pathOrFile: string | PackageJsonFile.Interface, data?: PackageJson): void {
        if (typeof pathOrFile === "string") {
            this.fileTool.writeFileOrThrow(pathOrFile, serialize(data!));
        } else {
            this.fileTool.writeFileOrThrow(pathOrFile.path, serialize(pathOrFile.raw));
        }
    }
}

export const PackageJsonFileTool = PackageJsonFileToolAbstraction.createImplementation({
    implementation: PackageJsonFileToolImpl,
    dependencies: [FileTool]
});

export interface CreatePackageJsonFileToolParams {
    fileTool?: FileTool.Interface;
}

export function createPackageJsonFileTool(
    params?: CreatePackageJsonFileToolParams
): PackageJsonFileToolAbstraction.Interface {
    const fileTool = params?.fileTool ?? createFileTool();
    return new PackageJsonFileToolImpl(fileTool);
}
