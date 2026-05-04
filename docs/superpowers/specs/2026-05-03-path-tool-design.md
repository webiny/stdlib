# PathTool Design

**Date:** 2026-05-03  
**Package:** `@webiny/tools-node`  
**Status:** Approved

---

## Overview

A DI-based `PathTool` for `tools-node` that wraps `node:path` methods (`join`, `resolve`, `dirname`, `basename`) behind the standard abstraction/implementation/feature pattern used by every other tool in this repo.

---

## Package & Token

- **Package:** `tools-node` — uses `node:path`, a Node.js built-in.
- **DI token:** `"Node/PathTool"` — Node-specific tools use the `"Node/"` prefix.

---

## Interface

```ts
interface IPathTool {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
}
```

`basename`'s `ext` parameter is optional; when provided it strips that suffix from the result, matching `node:path.basename` exactly.

---

## File Layout

```
packages/node/src/features/PathTool/
├── abstractions/
│   ├── PathTool.ts
│   └── index.ts
├── PathTool.ts
├── feature.ts
└── index.ts
```

---

## Implementation

- Delegates directly to `join`, `resolve`, `dirname`, `basename` from `node:path`.
- No transformation applied — OS-native separators on all platforms (backslashes on Windows, forward slashes on macOS/Linux).
- Zero DI dependencies: constructor is empty. Path operations are pure string transforms with no I/O.
- `resolve` follows standard Node.js behaviour: resolves relative segments against `process.cwd()`.
- Cross-platform correctness comes from `node:path` itself, which handles Windows `file:///C:/…` URL formats when combined with `fileURLToPath` — but that is a caller concern, not something the tool needs to handle internally.

---

## Feature Registration

```ts
export const PathToolFeature = createFeature({
  name: "Node/PathToolFeature",
  register(container) {
    container.register(PathTool).inSingletonScope();
  }
});
```

---

## Public Exports

Added to `packages/node/src/index.ts`:

```ts
export { PathTool, PathToolFeature } from "./features/PathTool/index.js";
```

---

## Tests

File: `packages/node/__tests__/PathTool.test.ts`

- Uses the standard `makeContainer()` helper with `PinoLoggerConfig` silenced to `"error"`.
- Covers:
  - `join` with multiple path segments
  - `resolve` with relative inputs (resolves against `process.cwd()`)
  - `resolve` with absolute inputs (returns as-is when already absolute)
  - `dirname` extracting the parent directory
  - `basename` without ext stripping
  - `basename` with ext stripping
