# Design: PathTool.resolvePackageFile

**Date:** 2026-05-04  
**Status:** Approved

---

## Overview

Add `resolvePackageFile(specifier: string): string` to `PathTool`. Given a package-relative specifier (e.g. `@webiny/cli/files/references.json`), it returns the absolute filesystem path of that file by walking Node's module resolution from `process.cwd()`.

The method name `resolvePackageFile` (not `resolvePackage`) is intentional — `resolvePackage` is reserved for a future method that resolves to a package root directory.

---

## API

```ts
interface IPathTool {
  // ... existing methods ...

  /**
   * Resolves a package-relative file specifier to an absolute filesystem path.
   * Resolution starts from `process.cwd()`, matching Node's standard module
   * lookup (hoisted node_modules at the project root).
   *
   * @throws PackageNotFoundError when the specifier cannot be resolved.
   */
  resolvePackageFile(specifier: string): string;
}
```

**Usage:**

```ts
const filePath = pathTool.resolvePackageFile("@webiny/cli/files/references.json");
const content = fileTool.readFile(filePath);
```

---

## Error

`PackageNotFoundError extends BaseError<{ specifier: string }>` with `code = "PACKAGE_NOT_FOUND"`.

Thrown when Node's module resolver cannot find the specifier (package not installed, file does not exist within the package, etc.).

```ts
try {
  const path = pathTool.resolvePackageFile("@missing/pkg/file.json");
} catch (e) {
  if (e instanceof PackageNotFoundError) {
    console.error(e.data.specifier); // "@missing/pkg/file.json"
  }
}
```

---

## Implementation

Uses `createRequire` from `node:module` to resolve from `process.cwd()`:

```ts
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(join(process.cwd(), "index.js"));
// createRequire uses dirname(filename) as the resolution base,
// so this resolves from the project root's node_modules.
// join() is used instead of string concatenation to produce a
// cross-platform path (backslash on Windows, forward slash elsewhere).
try {
  return require.resolve(specifier);
} catch {
  throw new PackageNotFoundError({
    message: `Cannot resolve package file: ${specifier}`,
    data: { specifier },
    stack: new Error().stack ?? ""
  });
}
```

`createRequire` is preferred over `import.meta.resolve()` because it returns a filesystem path directly (no `file://` URL conversion needed) and is synchronous without caveats on all supported Node versions.

---

## File Changes

| File | Change |
|------|--------|
| `src/node/features/PathTool/abstractions/PathTool.ts` | Add `resolvePackageFile` to `IPathTool` interface |
| `src/node/features/PathTool/PathTool.ts` | Implement `resolvePackageFile` |
| `src/node/features/PathTool/errors/PackageNotFoundError.ts` | New — `PackageNotFoundError` class |
| `src/node/features/PathTool/errors/index.ts` | New — barrel for errors |
| `src/node/features/PathTool/index.ts` | Re-export `PackageNotFoundError` |
| `src/node/index.ts` | Re-export `PackageNotFoundError` |
| `src/node/features/PathTool/README.md` | Add `resolvePackageFile` to interface section and usage examples |
| `__tests__/node/PathTool.test.ts` | Add tests for `resolvePackageFile` |

---

## Tests

Located in `__tests__/node/PathTool.test.ts`. Uses `vitest` (an already-installed dependency) as the resolution target — its `package.json` is a known, stable file.

**Test cases:**

1. **Happy path** — `resolvePackageFile("vitest/package.json")` returns an absolute path that ends with `vitest/package.json` and points to an existing file.
2. **Package not found** — `resolvePackageFile("@definitely/not-installed")` throws `PackageNotFoundError` with `data.specifier === "@definitely/not-installed"`.

---

## Out of Scope

- `resolvePackage(specifier)` — resolves to a package root directory; reserved for a future addition.
- An optional `from` parameter — always resolves from `process.cwd()`; node_modules are hoisted at the project root.
- A null-returning variant — `resolvePackageFile` always throws on failure, consistent with `PathTool`'s existing methods which all return `string`.
