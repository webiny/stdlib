import { createAbstraction } from "~/common/index.js";

export interface JsonSchema<T> {
    parse(data: unknown): T;
}

export interface ReadJsonParams<T> {
    schema?: JsonSchema<T>;
}

export interface IJsonFileTool {
    readJson<T>(path: string, params?: ReadJsonParams<T>): T | null;
    readJsonOrThrow<T>(path: string, params?: ReadJsonParams<T>): T;
    writeJson(path: string, data: unknown): void;
    writeJsonOrThrow(path: string, data: unknown): void;
}

export const JsonFileTool = createAbstraction<IJsonFileTool>("Core/JsonFileTool");

export namespace JsonFileTool {
    export type Interface = IJsonFileTool;
}
