# PathTool.resolvePackageFile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `resolvePackageFile(specifier)` to `PathTool` so callers can turn a package-relative specifier like `@webiny/cli/files/references.json` into an absolute filesystem path.

**Architecture:** A new `resolvePackageFile` method is added to the `IPathTool` interface and `PathToolImpl`. It uses `createRequire` from `node:module` to resolve the specifier from `process.cwd()`. A new `PackageNotFoundError` (extends `BaseError`) is thrown when resolution fails. The error is exported from the `PathTool` feature index and the `@webiny/stdlib/node` barrel.

**Tech Stack:** Node.js `node:module` (`createRequire`), `@webiny/stdlib` (`BaseError`), Vitest.

---

## File Map

| File | Change |
|------|--------|
| `src/node/features/PathTool/errors.ts` | **Create** — `PackageNotFoundError` |
| `src/node/features/PathTool/abstractions/PathTool.ts` | **Modify** — add `resolvePackageFile` to `IPathTool` |
| `src/node/features/PathTool/PathTool.ts` | **Modify** — implement `resolvePackageFile` |
| `src/node/features/PathTool/index.ts` | **Modify** — re-export `PackageNotFoundError` |
| `src/node/index.ts` | **Modify** — add `PackageNotFoundError` to PathTool export |
| `src/node/features/PathTool/README.md` | **Modify** — document new method and error |
| `__tests__/node/PathTool.test.ts` | **Modify** — add `resolvePackageFile` tests |

---

### Task 1: PackageNotFoundError

**Files:**
- Create: `src/node/features/PathTool/errors.ts`
- Modify: `__tests__/node/PathTool.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new `describe` block at the bottom of `__tests__/node/PathTool.test.ts`:

```ts
import {
    PathTool,
    PathToolFeature,
    createPathTool
} from "../../src/node/features/PathTool/index.js";
import { PackageNotFoundError } from "../../src/node/features/PathTool/errors.js";
```

Add this import at the top (alongside the existing imports), then add this block at the end of the file:

```ts
describe("PackageNotFoundError", () => {
    it("has code PACKAGE_NOT_FOUND", () => {
        const err = new PackageNotFoundError({
            message: "test",
            data: { specifier: "@foo/bar" },
            stack: new Error().stack ?? ""
        });
        expect(err.code).toBe("PACKAGE_NOT_FOUND");
    });

    it("exposes specifier in data", () => {
        const err = new PackageNotFoundError({
            message: "test",
            data: { specifier: "@foo/bar/file.json" },
            stack: new Error().stack ?? ""
        });
        expect(err.data.specifier).toBe("@foo/bar/file.json");
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
yarn test __tests__/node/PathTool.test.ts
```

Expected: FAIL — `Cannot find module '../../src/node/features/PathTool/errors.js'`

- [ ] **Step 3: Create `src/node/features/PathTool/errors.ts`**

```ts
import { BaseError } from "~/common/index.js";

/** Thrown when a package-relative specifier cannot be resolved to a filesystem path. */
export class PackageNotFoundError extends BaseError<{ specifier: string }> {
    public readonly code = "PACKAGE_NOT_FOUND" as const;
    public constructor(input: { message: string; data: { specifier: string }; stack: string }) {
        super(input);
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
yarn test __tests__/node/PathTool.test.ts
```

Expected: PASS — all `PackageNotFoundError` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/node/features/PathTool/errors.ts __tests__/node/PathTool.test.ts
git commit -m "feat(stdlib/node): add PackageNotFoundError for PathTool"
```

---

### Task 2: resolvePackageFile — interface + tests

**Files:**
- Modify: `src/node/features/PathTool/abstractions/PathTool.ts`
- Modify: `__tests__/node/PathTool.test.ts`

- [ ] **Step 1: Add `resolvePackageFile` to the interface**

Replace the contents of `src/node/features/PathTool/abstractions/PathTool.ts`:

```ts
import { createAbstraction } from "~/common/index.js";

export interface IPathTool {
    /** Joins path segments using the OS-native separator. */
    join(...paths: string[]): string;
    /** Resolves a sequence of paths into an absolute path. Relative segments resolve against `process.cwd()`. */
    resolve(...paths: string[]): string;
    /** Returns the directory portion of a path. */
    dirname(path: string): string;
    /** Returns the last segment of a path. Strips `ext` when provided. */
    basename(path: string, ext?: string): string;
    /**
     * Resolves a package-relative file specifier to an absolute filesystem path.
     * Resolution starts from `process.cwd()`, matching Node's standard module
     * lookup (hoisted node_modules at the project root).
     *
     * @throws PackageNotFoundError when the specifier cannot be resolved.
     */
    resolvePackageFile(specifier: string): string;
}

export const PathTool = createAbstraction<IPathTool>("Node/PathTool");

export namespace PathTool {
    export type Interface = IPathTool;
}
```

- [ ] **Step 2: Write failing tests for `resolvePackageFile`**

Add this `describe` block inside the existing `describe("PathTool", ...)` block in `__tests__/node/PathTool.test.ts`, after the `basename` describe block:

```ts
describe("resolvePackageFile", () => {
    it("returns an absolute path for an installed package file", () => {
        const result = tool.resolvePackageFile("vitest/package.json");
        expect(result).toMatch(/node_modules\/vitest\/package\.json$/);
        // verify it is an absolute path
        expect(result.startsWith("/")).toBe(true);
    });

    it("throws PackageNotFoundError when the package is not installed", () => {
        expect(() => tool.resolvePackageFile("@definitely/not-installed/file.json")).toThrow(
            PackageNotFoundError
        );
    });

    it("includes the specifier in PackageNotFoundError.data", () => {
        let caught: PackageNotFoundError | undefined;
        try {
            tool.resolvePackageFile("@definitely/not-installed/file.json");
        } catch (e) {
            if (e instanceof PackageNotFoundError) caught = e;
        }
        expect(caught?.data.specifier).toBe("@definitely/not-installed/file.json");
    });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
yarn test __tests__/node/PathTool.test.ts
```

Expected: FAIL — `tool.resolvePackageFile is not a function` (or TypeScript compile error: property does not exist on type).

- [ ] **Step 4: Commit the interface + test changes**

```bash
git add src/node/features/PathTool/abstractions/PathTool.ts __tests__/node/PathTool.test.ts
git commit -m "feat(stdlib/node): define resolvePackageFile on IPathTool + add failing tests"
```

---

### Task 3: Implement resolvePackageFile

**Files:**
- Modify: `src/node/features/PathTool/PathTool.ts`

- [ ] **Step 1: Implement `resolvePackageFile` on `PathToolImpl`**

Replace the contents of `src/node/features/PathTool/PathTool.ts`:

```ts
import { join, resolve, dirname, basename } from "node:path";
import { createRequire } from "node:module";
import { PathTool as PathToolAbstraction } from "./abstractions/PathTool.js";
import { PackageNotFoundError } from "./errors.js";

class PathToolImpl implements PathToolAbstraction.Interface {
    public join(...paths: string[]): string {
        return join(...paths);
    }

    public resolve(...paths: string[]): string {
        return resolve(...paths);
    }

    public dirname(path: string): string {
        return dirname(path);
    }

    public basename(path: string, ext?: string): string {
        return basename(path, ext);
    }

    public resolvePackageFile(specifier: string): string {
        const require = createRequire(process.cwd() + "/index.js");
        try {
            return require.resolve(specifier);
        } catch {
            throw new PackageNotFoundError({
                message: `Cannot resolve package file: ${specifier}`,
                data: { specifier },
                stack: new Error().stack ?? ""
            });
        }
    }
}

export const PathTool = PathToolAbstraction.createImplementation({
    implementation: PathToolImpl,
    dependencies: []
});

export function createPathTool(): PathToolAbstraction.Interface {
    return new PathToolImpl();
}
```

- [ ] **Step 2: Run all tests to verify they pass**

```bash
yarn test __tests__/node/PathTool.test.ts
```

Expected: PASS — all tests including the three new `resolvePackageFile` tests green.

- [ ] **Step 3: Commit**

```bash
git add src/node/features/PathTool/PathTool.ts
git commit -m "feat(stdlib/node): implement PathTool.resolvePackageFile"
```

---

### Task 4: Update exports

**Files:**
- Modify: `src/node/features/PathTool/index.ts`
- Modify: `src/node/index.ts`

- [ ] **Step 1: Export `PackageNotFoundError` from the PathTool feature index**

Replace the contents of `src/node/features/PathTool/index.ts`:

```ts
export { PathTool } from "./abstractions/index.js";
export { PathToolFeature } from "./feature.js";
export { createPathTool } from "./PathTool.js";
export { PackageNotFoundError } from "./errors.js";
```

- [ ] **Step 2: Export `PackageNotFoundError` from the node slice barrel**

In `src/node/index.ts`, find the PathTool line:

```ts
export { PathTool, PathToolFeature, createPathTool } from "./features/PathTool/index.js";
```

Replace it with:

```ts
export { PathTool, PathToolFeature, createPathTool, PackageNotFoundError } from "./features/PathTool/index.js";
```

- [ ] **Step 3: Run typecheck to verify exports are clean**

```bash
yarn typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/node/features/PathTool/index.ts src/node/index.ts
git commit -m "feat(stdlib/node): export PackageNotFoundError from PathTool and node barrel"
```

---

### Task 5: Update README

**Files:**
- Modify: `src/node/features/PathTool/README.md`

- [ ] **Step 1: Update the README**

Replace the full contents of `src/node/features/PathTool/README.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add src/node/features/PathTool/README.md
git commit -m "docs(stdlib/node): update PathTool README with resolvePackageFile"
```

---

### Task 6: Pre-commit verification

- [ ] **Step 1: Run the full pre-commit chain**

```bash
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Expected: all five steps pass with zero errors and zero warnings. If anything fails, fix it and re-run the full chain from the start.

- [ ] **Step 2: Confirm test coverage includes new code**

The coverage output will include `src/node/features/PathTool/PathTool.ts` and `src/node/features/PathTool/errors.ts`. Both should show 100% coverage (all lines/branches hit by the tests written in Tasks 1–2).
