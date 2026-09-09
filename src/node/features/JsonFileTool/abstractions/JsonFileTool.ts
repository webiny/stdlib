import { createAbstraction } from "~/common/index.js";
import type { Result } from "~/common/index.js";
import type { FileWriteError } from "../../FileTool/errors.js";

export interface JsonSchema<T> {
    parse(data: unknown): T;
}

export interface ReadJsonParams<T> {
    schema?: JsonSchema<T>;
}

export interface IJsonFileTool {
    readJson<T>(path: string, params?: ReadJsonParams<T>): T | null;
    readJsonOrThrow<T>(path: string, params?: ReadJsonParams<T>): T;
    /** Serializes data as formatted JSON and writes it to path. */
    writeJson(path: string, data: unknown): Result<void, FileWriteError>;
    writeJsonOrThrow(path: string, data: unknown): void;
}

export const JsonFileTool = createAbstraction<IJsonFileTool>("Core/JsonFileTool");

export namespace JsonFileTool {
    export type Interface = IJsonFileTool;
}
