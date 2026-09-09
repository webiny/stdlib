---
name: file-tool
description: Read, write, copy, remove files. All paths must be absolute.
context: node
---

# FileTool

Reads, writes, copies, and removes files on the local filesystem. All paths must be absolute. Write operations automatically create missing parent directories. `writeFile` and `copy` return a `Result` so the caller can handle failures; `writeFileOrThrow` and `copyOrThrow` throw instead. `readFile` returns `null` if the file does not exist.

## Interface

```ts
interface IFileTool {
  /** Returns true if the file exists. */
  exists(path: string): boolean;
  /** Reads the file as UTF-8. Returns null if the file does not exist. */
  readFile(path: string): string | null;
  /** Reads the file as UTF-8. Throws if the file does not exist. */
  readFileOrThrow(path: string): string;
  /** Writes UTF-8 content, creating parent directories as needed. */
  writeFile(path: string, content: string): Result<void, FileWriteError>;
  /** Writes UTF-8 content, creating parent directories as needed. Throws on failure. */
  writeFileOrThrow(path: string, content: string): void;
  /** Removes the file. No-op if the file does not exist. */
  remove(path: string): void;
  /** Copies source to target, creating parent directories as needed. */
  copy(source: string, target: string): Result<void, FileCopyError>;
  /** Copies source to target, creating parent directories as needed. Throws if source is missing. */
  copyOrThrow(source: string, target: string): void;
}
```

## Errors

- `FileWriteError` — the file could not be written (directory creation failure, permissions, disk full, etc.). Data: `{ path: string }`.
- `FileCopyError` — the file could not be copied (source not found, permissions, directory creation failure, etc.). Data: `{ source: string; target: string }`.

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

// Result-based — caller decides how to handle failure
const result = file.writeFile("/tmp/hello.txt", "hello world");
if (result.isFail()) {
  console.error(result.error.message);
}

// Throwing variant
file.writeFileOrThrow("/tmp/hello.txt", "hello world");
console.log(file.readFileOrThrow("/tmp/hello.txt")); // "hello world"
```

### Without DI

```ts
import { createFileTool } from "@webiny/stdlib/node";

const file = createFileTool();
const content = file.readFile("/tmp/hello.txt"); // string | null
```
