# JsonFileTool

Reads and writes JSON files on the local filesystem. Optionally validates the parsed value through a schema (any object with a `.parse(unknown): T` method — compatible with Zod, Valibot, and similar). Methods without `OrThrow` return `null` on failure; `OrThrow` variants throw.

## Interface

```ts
interface IJsonFileTool {
  /** Parses and returns the JSON file contents. Returns null if missing or unparseable. */
  readJson<T>(path: string, params?: ReadJsonParams<T>): T | null;
  /** Parses and returns the JSON file contents. Throws if missing, unparseable, or schema validation fails. */
  readJsonOrThrow<T>(path: string, params?: ReadJsonParams<T>): T;
  /** Serialises data to JSON and writes it. Creates parent directories as needed. Logs on failure. */
  writeJson(path: string, data: unknown): void;
  /** Serialises data to JSON and writes it. Creates parent directories as needed. Throws on failure. */
  writeJsonOrThrow(path: string, data: unknown): void;
}

interface ReadJsonParams<T> {
  /** Optional schema to validate the parsed value. Must have a `.parse(unknown): T` method. */
  schema?: JsonSchema<T>;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import {
  JsonFileTool,
  JsonFileToolFeature,
  FileToolFeature,
  DirectoryToolFeature,
  PinoLoggerFeature
} from "@webiny/stdlib/node";

const container = new Container();
PinoLoggerFeature.register(container);
DirectoryToolFeature.register(container);
FileToolFeature.register(container);
JsonFileToolFeature.register(container);

const json = container.resolve(JsonFileTool);
json.writeJsonOrThrow("/tmp/config.json", { version: 1 });
const config = json.readJsonOrThrow<{ version: number }>("/tmp/config.json");
```

### Without DI

```ts
import { createJsonFileTool } from "@webiny/stdlib/node";

const json = createJsonFileTool();
const data = json.readJson("/tmp/config.json"); // unknown | null
```
