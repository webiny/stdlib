---
name: package-json-file-tool
description: Reads, validates, and writes package.json files with typed mutation helpers for dependency sections.
context: node
---

# PackageJsonFileTool

Reads, validates, and writes `package.json` files. `read` and `readOrThrow` return a `PackageJsonFile` value object that carries the file path and parsed data and exposes mutation helpers for all dependency sections. Root-level well-known fields are validated at runtime with Zod; unknown fields pass through unchanged. The parsed data is typed as `PackageJson` from [type-fest](https://github.com/sindresorhus/type-fest).

## Interface

```ts
interface IPackageJsonFileTool {
  /**
   * Read and validate a package.json at the given path.
   * Returns null if the file does not exist.
   * Throws on JSON parse failure or schema validation error.
   */
  read(path: string): PackageJsonFile.Interface | null;

  /**
   * Read and validate a package.json at the given path.
   * Throws if the file does not exist, JSON parse fails, or validation fails.
   */
  readOrThrow(path: string): PackageJsonFile.Interface;

  /** Serialize and write to `path`. Creates parent directories as needed. */
  write(path: string, data: PackageJson): void;
  /** Serialize the file's own path and data back to disk. */
  write(file: PackageJsonFile.Interface): void;

  /** Like `write`, but throws on failure instead of logging. */
  writeOrThrow(path: string, data: PackageJson): void;
  writeOrThrow(file: PackageJsonFile.Interface): void;
}

interface IPackageJsonFile {
  /** Absolute path to the file on disk. */
  readonly path: string;
  /** The underlying parsed data. Mutated in place by the setter methods. */
  readonly raw: PackageJson;

  getDependencies(): Record<string, string>;
  getDependency(name: string): string | null;
  setDependency(name: string, version: string): void;
  removeDependency(name: string): void;

  getDevDependencies(): Record<string, string>;
  getDevDependency(name: string): string | null;
  setDevDependency(name: string, version: string): void;
  removeDevDependency(name: string): void;

  getPeerDependencies(): Record<string, string>;
  getPeerDependency(name: string): string | null;
  setPeerDependency(name: string, version: string): void;
  removePeerDependency(name: string): void;

  getResolutions(): Record<string, string>;
  getResolution(name: string): string | null;
  setResolution(name: string, version: string): void;
  removeResolution(name: string): void;

  /** Returns `version`, or null if absent. */
  getVersion(): string | null;

  /** Returns the value at an arbitrary top-level key, or null if absent. */
  get(key: string): unknown;
  /** Sets an arbitrary top-level field. */
  set(key: string, value: unknown): void;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import {
  PackageJsonFileTool,
  PackageJsonFileToolFeature,
  FileToolFeature,
  DirectoryToolFeature,
  PinoLoggerFeature
} from "@webiny/stdlib/node";

const container = new Container();
PinoLoggerFeature.register(container);
DirectoryToolFeature.register(container);
FileToolFeature.register(container);
PackageJsonFileToolFeature.register(container);

const tool = container.resolve(PackageJsonFileTool);
const pkg = tool.readOrThrow("/path/to/package.json");
console.log(pkg.raw.name, pkg.getVersion());
```

### Without DI

```ts
import { createPackageJsonFileTool } from "@webiny/stdlib/node";

const tool = createPackageJsonFileTool();
const pkg = tool.readOrThrow("/path/to/package.json");

pkg.setDependency("zod", "^4.0.0");
pkg.removeDependency("lodash");

tool.write(pkg); // writes back to pkg.path
```
