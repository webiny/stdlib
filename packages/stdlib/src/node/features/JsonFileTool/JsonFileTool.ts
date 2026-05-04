import {
    JsonFileTool as JsonFileToolAbstraction,
    type ReadJsonParams
} from "./abstractions/JsonFileTool.js";
import { FileTool } from "../FileTool/abstractions/FileTool.js";
import { createFileTool } from "../FileTool/FileTool.js";

class JsonFileToolImpl implements JsonFileToolAbstraction.Interface {
    public constructor(private readonly fileTool: FileTool.Interface) {}

    public readJson<T>(path: string, params?: ReadJsonParams<T>): T | null {
        const content = this.fileTool.readFile(path);
        if (content === null) {
            return null;
        }
        const parsed = JSON.parse(content) as unknown;
        if (params?.schema) {
            return params.schema.parse(parsed);
        }
        return parsed as T;
    }

    public readJsonOrThrow<T>(path: string, params?: ReadJsonParams<T>): T {
        const content = this.fileTool.readFileOrThrow(path);
        const parsed = JSON.parse(content) as unknown;
        if (params?.schema) {
            return params.schema.parse(parsed);
        }
        return parsed as T;
    }

    public writeJson(path: string, data: unknown): void {
        this.fileTool.writeFile(path, JSON.stringify(data, null, 2));
    }

    public writeJsonOrThrow(path: string, data: unknown): void {
        this.fileTool.writeFileOrThrow(path, JSON.stringify(data, null, 2));
    }
}

export const JsonFileTool = JsonFileToolAbstraction.createImplementation({
    implementation: JsonFileToolImpl,
    dependencies: [FileTool]
});

export interface CreateJsonFileToolParams {
    fileTool?: FileTool.Interface;
}

export function createJsonFileTool(
    params?: CreateJsonFileToolParams
): JsonFileToolAbstraction.Interface {
    const fileTool = params?.fileTool ?? createFileTool();
    return new JsonFileToolImpl(fileTool);
}
