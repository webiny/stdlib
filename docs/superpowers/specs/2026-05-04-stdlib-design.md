# Design: Consolidate packages into `@webiny/stdlib`

**Date:** 2026-05-04  
**Status:** Approved

---

## Problem

The repo currently publishes three separate packages (`@webiny/utils-common`, `@webiny/utils-node`, `@webiny/utils-browser`). Consumers must install and import from multiple packages. The split was driven by compilation concerns (different TypeScript targets), not by a meaningful product boundary. Publishing a single `@webiny/stdlib` simplifies the consumer story without sacrificing compile-time platform safety.

---

## Decision

Consolidate all three packages into a single published package `@webiny/stdlib` with subpath exports:

| Import path | Contents |
|---|---|
| `@webiny/stdlib` | Platform-agnostic: `Result`, `ResultAsync`, `BaseError`, `createAbstraction`, `createFeature`, `Logger`, `Cache` |
| `@webiny/stdlib/node` | Node.js utilities: `FileTool`, `DirectoryTool`, `JsonFileTool`, `PinoLogger`, `PathTool`, `NdJsonReaderTool`, `ReadStreamFactory`, `PackageJsonFileTool` |
| `@webiny/stdlib/browser` | Browser utilities: `LocalStorageCacheFeature` and related errors |

The compile-time platform boundary is **preserved** via tsgo project references within the single package — not collapsed into a single tsconfig. Common source sees only `lib: ["esnext", "dom"]`. Node source adds `types: ["node"]`. Browser source adds `dom.iterable`. A file that accidentally uses `Buffer` in a common feature still fails the build.

---

## Package structure

```
packages/stdlib/
├── src/
│   ├── index.ts                    ← common barrel
│   ├── core/                       ← Result, ResultAsync, BaseError, createAbstraction, createFeature
│   └── features/
│       ├── Logger/
│       └── Cache/
├── src/node/
│   ├── index.ts                    ← node barrel
│   └── features/
│       ├── FileTool/
│       ├── DirectoryTool/
│       ├── JsonFileTool/
│       ├── PinoLogger/
│       ├── PathTool/
│       ├── NdJsonReaderTool/
│       ├── ReadStreamFactory/
│       └── PackageJsonFileTool/
├── src/browser/
│   ├── index.ts                    ← browser barrel
│   └── features/
│       └── LocalStorageCache/
├── __tests__/
│   ├── *.test.ts                   ← common tests (flat)
│   ├── node/
│   │   └── *.test.ts               ← node tests
│   └── browser/
│       └── *.test.ts               ← browser tests
├── package.json
├── tsconfig.json                   ← solution file (references common/node/browser build configs)
├── tsconfig.common.json            ← compiles src/ → dist/
├── tsconfig.node.json              ← compiles src/node/ → dist/node/
├── tsconfig.browser.json           ← compiles src/browser/ → dist/browser/
├── tsconfig.check.json             ← type-checks src/ + __tests__/ (common tests)
├── tsconfig.check.node.json        ← type-checks src/node/ + __tests__/node/
├── tsconfig.check.browser.json     ← type-checks src/browser/ + __tests__/browser/
└── vitest.config.ts
```

The three existing packages (`packages/common/`, `packages/node/`, `packages/browser/`) are deleted.

---

## TypeScript configuration

### Path aliases (all tsconfigs)

```json
"paths": {
  "~/common": ["./src/index.js"],
  "~/node":   ["./src/node/index.js"],
  "~/browser":["./src/browser/index.js"],
  "~/*":      ["./src/*"]
}
```

`~/common` is how node and browser features import from the common slice (replaces the old `@webiny/utils-common` import). The `~/common` entry must come before `~/*` in every tsconfig because TypeScript path matching is first-match and `~/*` would otherwise intercept it.

### `tsconfig.common.json` (build)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext", "dom"],
    "paths": {
      "~/common": ["./src/index.js"],
      "~/*":      ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["src/node", "src/browser"]
}
```

### `tsconfig.node.json` (build)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src/node",
    "outDir": "./dist/node",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "paths": {
      "~/common": ["./src/index.js"],
      "~/node":   ["./src/node/index.js"],
      "~/*":      ["./src/*"]
    }
  },
  "include": ["src/node"],
  "references": [{ "path": "./tsconfig.common.json" }]
}
```

### `tsconfig.browser.json` (build)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src/browser",
    "outDir": "./dist/browser",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext", "dom", "dom.iterable"],
    "paths": {
      "~/common":  ["./src/index.js"],
      "~/browser": ["./src/browser/index.js"],
      "~/*":       ["./src/*"]
    }
  },
  "include": ["src/browser"],
  "references": [{ "path": "./tsconfig.common.json" }]
}
```

### `tsconfig.json` (solution file)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.common.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.browser.json" }
  ]
}
```

### Check tsconfigs

Each extends its corresponding build tsconfig, disables emit, and adds `__tests__/<slice>/`:

- `tsconfig.check.json` — extends `tsconfig.common.json`; includes `src`, `__tests__`; excludes `src/node`, `src/browser`, `__tests__/node`, `__tests__/browser`
- `tsconfig.check.node.json` — extends `tsconfig.node.json`; includes `src/node`, `__tests__/node`
- `tsconfig.check.browser.json` — extends `tsconfig.browser.json`; includes `src/browser`, `__tests__/browser`

All three set `composite: false`, `noEmit: true`, `rootDir: "."`.

---

## `package.json`

```json
{
  "name": "@webiny/stdlib",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types":  "./dist/index.d.ts"
    },
    "./node": {
      "import": "./dist/node/index.js",
      "types":  "./dist/node/index.d.ts"
    },
    "./browser": {
      "import": "./dist/browser/index.js",
      "types":  "./dist/browser/index.d.ts"
    }
  },
  "main":  "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "dependencies": {
    "@webiny/di":  "^0.2.3",
    "fast-glob":   "^3.3.3",
    "pino":        "^10.3.1",
    "pino-pretty": "^13.1.3",
    "type-fest":   "^5.6.0",
    "zod":         "^4.4.2"
  },
  "devDependencies": {
    "@typescript/native-preview": "beta",
    "happy-dom": "^20.9.0",
    "vitest":    "^4.1.5"
  },
  "scripts": {
    "build":         "tsgo -b --force",
    "test":          "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

All runtime deps from the three existing packages are merged. `happy-dom` moves to devDependencies (was already there in utils-browser).

---

## Source migration

### File moves (no content changes)

| From | To |
|---|---|
| `packages/common/src/core/` | `packages/stdlib/src/core/` |
| `packages/common/src/features/` | `packages/stdlib/src/features/` |
| `packages/common/src/index.ts` | `packages/stdlib/src/index.ts` |
| `packages/node/src/features/` | `packages/stdlib/src/node/features/` |
| `packages/node/src/index.ts` | `packages/stdlib/src/node/index.ts` |
| `packages/browser/src/features/` | `packages/stdlib/src/browser/features/` |
| `packages/browser/src/index.ts` | `packages/stdlib/src/browser/index.ts` |
| `packages/common/__tests__/` | `packages/stdlib/__tests__/` (flat) |
| `packages/node/__tests__/` | `packages/stdlib/__tests__/node/` |
| `packages/browser/__tests__/` | `packages/stdlib/__tests__/browser/` |

### Import changes

In every file under `src/node/` and `src/browser/`, replace:
```ts
import { ... } from "@webiny/utils-common";
import { ... } from "@webiny/utils-common/...";
```
with:
```ts
import { ... } from "~/common";
```

No other imports change. Relative imports within each slice (e.g. `"./abstractions/FileTool.js"`) are unaffected.

### Test import changes

**Common tests** (e.g. `Result.test.ts`): currently import `"../src/core/Result.js"`. After migration to `packages/stdlib/__tests__/`, the depth is unchanged — `__tests__/` is still adjacent to `src/`. No changes needed.

**Node and browser tests**: currently import `"../src/features/..."` from their respective `__tests__/` directories. After migration to `packages/stdlib/__tests__/node/` and `packages/stdlib/__tests__/browser/`, those paths are now one level deeper. Two options — both valid:
- Update relative paths: `"../src/features/..."` → `"../../src/node/features/..."` (or `../../src/browser/features/...`)
- Switch to barrel imports: `"@webiny/stdlib/node"` / `"@webiny/stdlib/browser"` — preferred, tests the public API

Any test that currently imports from `@webiny/utils-common`, `@webiny/utils-node`, or `@webiny/utils-browser` must be updated to `@webiny/stdlib`, `@webiny/stdlib/node`, or `@webiny/stdlib/browser` respectively. Example: `import { Cache } from "@webiny/utils-common"` → `import { Cache } from "@webiny/stdlib"`.

**Browser test environment directive**: the existing `// @vitest-environment happy-dom` file-level comment must be removed from browser test files. Environment selection is handled by `environmentMatchGlobs` in `vitest.config.ts` — keeping both causes no error but is redundant. Remove the per-file directive when migrating each browser test.

---

## Vitest configuration

### `packages/stdlib/vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environmentMatchGlobs: [
      ["__tests__/browser/**", "happy-dom"]
    ],
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"]
  }
});
```

`environmentMatchGlobs` ensures browser tests run under happy-dom without needing a separate vitest project. Node and common tests use the default (node) environment.

### `vitest.workspace.ts` (root)

Replace the three `defineProject` calls with one:

```ts
defineProject({ test: { name: "utils-stdlib", root: "./packages/stdlib" } })
```

---

## Root-level file changes

### `tsconfig.json`

Remove references to `packages/common`, `packages/node`, `packages/browser`. Add `packages/stdlib`.

### Root `package.json` — `typecheck` script

```
tsgo -p tsconfig.check.json &&
tsgo -p packages/stdlib/tsconfig.check.json &&
tsgo -p packages/stdlib/tsconfig.check.node.json &&
tsgo -p packages/stdlib/tsconfig.check.browser.json
```

### `scripts/features/BuildPackages/abstractions/ProjectConfig.ts`

Add optional `slices` to the package shape:

```ts
packages: ReadonlyArray<{ dir: string; name: string; slices?: string[] }>
```

### `scripts/features/BuildPackages/BuildOrchestrator.ts`

When a package has `slices`, compile each slice config in order instead of the package dir:

```ts
for (const pkg of packages) {
    if (pkg.slices) {
        for (const slice of pkg.slices) {
            this.compiler.compile(join("packages", pkg.dir, slice));
        }
    } else {
        this.compiler.compile(join("packages", pkg.dir));
    }
}
```

This preserves the sequenced-compilation behaviour described in AGENTS.md (tsgo project-reference ordering is unreliable in the current beta).

### `scripts/features/BuildPackages/index.ts`

Annotate the stdlib package with its slices after `getWorkspaces()` resolves:

```ts
const packages = getWorkspaces(rootDir).map(ws =>
    ws.name === "@webiny/stdlib"
        ? { ...ws, slices: ["tsconfig.common.json", "tsconfig.node.json", "tsconfig.browser.json"] }
        : ws
);
```

### `cleanPackages.ts`

No changes needed — it already iterates `getWorkspaces()` and deletes each package's `dist/`. After the migration, it will delete `packages/stdlib/dist/`.

### `publishPackages.ts`

No structural changes needed — it uses `getWorkspaces()` which will return only `@webiny/stdlib`. Version injection, changelog, and tagging all operate on the workspace list.

---

## AGENTS.md changes

Update throughout to reflect:

- Package names: `@webiny/utils-common` → `@webiny/stdlib`, `@webiny/utils-node` → `@webiny/stdlib/node`, `@webiny/utils-browser` → `@webiny/stdlib/browser`
- Monorepo structure: single `packages/stdlib/` with three source slices
- TypeScript config section: describe the three-tsconfig approach within one package
- Step-by-step "Adding a New Tool" section: paths change (e.g. `packages/stdlib/src/node/features/HttpTool/`)
- Import convention: `import { Logger } from "~/common"` replaces `import { Logger } from "@webiny/utils-common"`

---

## What does NOT change

- Internal feature code (abstractions, implementations, features) — moved verbatim
- DI patterns, naming conventions, Result/BaseError usage
- `scripts/features/PublishPackages/` — operates on the workspace list; stdlib replaces the three packages
- `tsconfig.base.json` — shared strict flags, untouched
- Test patterns — same container setup, same tmp-dir cleanup conventions
