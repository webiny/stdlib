---
name: glob-tool
description: Find files and directories by glob pattern using tinyglobby.
context: node
---

# GlobTool

Finds files and directories matching glob patterns using [tinyglobby](https://github.com/SuperchilliDev/tinyglobby). Three methods: `findAll` returns everything matching the pattern, `findFiles` returns only files, and `findDirectories` returns only directories.

## Interface

```ts
interface IGlobTool {
  /** Finds all items matching the pattern. Pass GlobOptions to control behavior. */
  findAll(patterns: string | string[], options?: GlobOptions): string[];
  /** Finds only files matching the pattern. */
  findFiles(patterns: string | string[], options?: FilesOptions): string[];
  /** Finds only directories matching the pattern. */
  findDirectories(patterns: string | string[], options?: DirectoriesOptions): string[];
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { GlobTool, GlobToolFeature } from "@webiny/stdlib/node";

const container = new Container();
GlobToolFeature.register(container);

const glob = container.resolve(GlobTool);
const files = glob.findFiles("**/*.ts", { cwd: "/my/project" });
```

### Without DI

```ts
import { createGlobTool } from "@webiny/stdlib/node";

const glob = createGlobTool();
const files = glob.findFiles("**/*.ts", { cwd: "/my/project" });
const dirs = glob.findDirectories("*", { cwd: "/my/project" });
```
