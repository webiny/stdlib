# FileTool

Reads, writes, copies, and removes files on the local filesystem. All paths must be absolute. Write operations automatically create missing parent directories. Methods without `OrThrow` log a warning and return `null` / `void` on failure; `OrThrow` variants throw.

## Interface

```ts
interface IFileTool {
  /** Returns true if the file exists. */
  exists(path: string): boolean;
  /** Reads the file as UTF-8. Returns null if the file does not exist. */
  readFile(path: string): string | null;
  /** Reads the file as UTF-8. Throws if the file does not exist. */
  readFileOrThrow(path: string): string;
  /** Writes UTF-8 content, creating parent directories as needed. Logs on failure. */
  writeFile(path: string, content: string): void;
  /** Writes UTF-8 content, creating parent directories as needed. Throws on failure. */
  writeFileOrThrow(path: string, content: string): void;
  /** Removes the file. No-op if the file does not exist. */
  remove(path: string): void;
  /** Copies source to target, creating parent directories as needed. Logs if source is missing. */
  copy(source: string, target: string): void;
  /** Copies source to target, creating parent directories as needed. Throws if source is missing. */
  copyOrThrow(source: string, target: string): void;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import {
  FileTool,
  FileToolFeature,
  DirectoryToolFeature,
  PinoLoggerFeature
} from "@webiny/stdlib/node";

const container = new Container();
PinoLoggerFeature.register(container);
DirectoryToolFeature.register(container);
FileToolFeature.register(container);

const file = container.resolve(FileTool);
file.writeFileOrThrow("/tmp/hello.txt", "hello world");
console.log(file.readFileOrThrow("/tmp/hello.txt")); // "hello world"
```

### Without DI

```ts
import { createFileTool } from "@webiny/stdlib/node";

const file = createFileTool();
const content = file.readFile("/tmp/hello.txt"); // string | null
```
