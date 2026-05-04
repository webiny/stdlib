# PathTool

Wraps the four most-used `node:path` methods — `join`, `resolve`, `dirname`, and `basename` — behind the standard DI abstraction/implementation pattern. Useful when you want path operations to be injectable and mockable in tests.

## Interface

```ts
interface IPathTool {
  /** Joins path segments using the OS-native separator. */
  join(...paths: string[]): string;
  /** Resolves a sequence of paths into an absolute path. Relative segments resolve against process.cwd(). */
  resolve(...paths: string[]): string;
  /** Returns the directory portion of a path. */
  dirname(path: string): string;
  /** Returns the last segment of a path. Strips ext when provided. */
  basename(path: string, ext?: string): string;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { PathTool, PathToolFeature } from "@webiny/utils-node";

const container = new Container();
PathToolFeature.register(container);

const path = container.resolve(PathTool);
path.join("a", "b", "c"); // "a/b/c"
path.resolve("src", "index.ts"); // "/your/cwd/src/index.ts"
path.dirname("/a/b/c.ts"); // "/a/b"
path.basename("/a/b/c.ts", ".ts"); // "c"
```

### Without DI

```ts
import { createPathTool } from "@webiny/utils-node";

const path = createPathTool();
path.join("dist", "index.js"); // "dist/index.js"
```
