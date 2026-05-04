# PathTool

Wraps the four most-used `node:path` methods — `join`, `resolve`, `dirname`, and `basename` — behind the standard DI abstraction/implementation pattern. Also provides `resolvePackageFile` to turn a package-relative specifier into an absolute filesystem path via Node's module resolver.

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
  /**
   * Resolves a package-relative file specifier to an absolute filesystem path.
   * Resolution starts from process.cwd(), matching Node's standard module
   * lookup (hoisted node_modules at the project root).
   *
   * @throws PackageNotFoundError when the specifier cannot be resolved.
   */
  resolvePackageFile(specifier: string): string;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { PathTool, PathToolFeature } from "@webiny/stdlib/node";

const container = new Container();
PathToolFeature.register(container);

const path = container.resolve(PathTool);
path.join("a", "b", "c"); // "a/b/c"
path.resolve("src", "index.ts"); // "/your/cwd/src/index.ts"
path.dirname("/a/b/c.ts"); // "/a/b"
path.basename("/a/b/c.ts", ".ts"); // "c"

// resolve a file inside an installed package
const refPath = path.resolvePackageFile("@webiny/cli/files/references.json");
// "/your/project/node_modules/@webiny/cli/files/references.json"
```

### Without DI

```ts
import { createPathTool } from "@webiny/stdlib/node";

const path = createPathTool();
path.join("dist", "index.js"); // "dist/index.js"
path.resolvePackageFile("vitest/package.json"); // absolute path to vitest's package.json
```

## Errors

### `PackageNotFoundError`

Thrown by `resolvePackageFile` when the specifier cannot be resolved.

```ts
import { PackageNotFoundError } from "@webiny/stdlib/node";

try {
  path.resolvePackageFile("@missing/pkg/file.json");
} catch (e) {
  if (e instanceof PackageNotFoundError) {
    console.error(e.data.specifier); // "@missing/pkg/file.json"
  }
}
```
