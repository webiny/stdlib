---
name: directory-tool
description: Creates, reads, copies, removes, and globs directories on the local filesystem. All paths must be absolute.
context: node
---

# DirectoryTool

Creates, reads, copies, removes, and globs directories on the local filesystem. All paths must be absolute. `create` is idempotent — it calls `mkdirSync` with `recursive: true` and is safe to call on an existing path. Methods without `OrThrow` log a warning and return `null` / `void` on failure; `OrThrow` variants throw.

## Interface

```ts
interface IDirectoryTool {
  /** Returns true if the directory exists. */
  exists(path: string): boolean;
  /** Creates the directory (and any missing parents). Idempotent. */
  create(path: string): void;
  /** Returns the names of entries in the directory. Returns null if it does not exist. */
  readDir(path: string): string[] | null;
  /** Returns the names of entries in the directory. Throws if it does not exist. */
  readDirOrThrow(path: string): string[];
  /** Removes the directory and all its contents. No-op if it does not exist. */
  remove(path: string): void;
  /** Copies the directory tree from source to target. Logs if source is missing. */
  copy(source: string, target: string): void;
  /** Copies the directory tree from source to target. Throws if source is missing. */
  copyOrThrow(source: string, target: string): void;
  /**
   * Returns paths matching `pattern` under `cwd`.
   * Paths are relative to `cwd` unless `options.absolute` is true.
   * Returns an empty array when `cwd` does not exist or nothing matches.
   */
  glob(cwd: string, pattern: string | string[], options?: GlobOptions): string[];
}

interface GlobOptions {
  dot?: boolean; // include dotfiles (default: false)
  ignore?: string[]; // patterns to exclude
  deep?: number; // max traversal depth
  absolute?: boolean; // return absolute paths (default: false)
  onlyFiles?: boolean; // match only files, not directories (default: true)
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { DirectoryTool, DirectoryToolFeature, PinoLoggerFeature } from "@webiny/stdlib/node";

const container = new Container();
PinoLoggerFeature.register(container);
DirectoryToolFeature.register(container);

const dir = container.resolve(DirectoryTool);
dir.create("/tmp/my-output");
console.log(dir.readDirOrThrow("/tmp/my-output")); // []
```

### Without DI

```ts
import { createDirectoryTool } from "@webiny/stdlib/node";

const dir = createDirectoryTool();
dir.create("/tmp/my-output");

// list all .ts files recursively
const files = dir.glob("/my/project/src", "**/*.ts");

// exclude test files, include dotfiles
const sources = dir.glob("/my/project/src", "**/*.ts", {
  ignore: ["**/*.test.ts"],
  dot: true
});
```
