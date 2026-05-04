# Webiny Node utils — Agent Context

This is the authoritative project guide for all AI agents working in this repository. Read this before doing anything.

---

## Project Overview

This is a **Yarn 4 monorepo** of TypeScript utility packages published to an npm registry under the `@webiny/` scope. All packages share the same version number (synchronized versioning).

The packages provide platform-specific utility services (file system, directory management, logging, HTTP fetching, etc.) built on a dependency injection system (`@webiny/di`). Every service follows the same abstraction → implementation → feature pattern described in detail below.

---

## Monorepo Structure

```
/
├── packages/
│   ├── common/      # @webiny/utils-common — platform-agnostic utilities
│   ├── node/        # @webiny/utils-node — Node.js-specific utils
│   └── browser/     # @webiny/utils-browser — browser-specific utils
├── package.json          # root workspace config
├── tsconfig.json         # root solution file (references only, no files)
├── tsconfig.base.json    # shared compiler options
├── tsconfig.check.json   # root type-check config (covers vitest root files)
├── vitest.config.ts      # root coverage config
├── vitest.workspace.ts   # workspace project list
├── CLAUDE.md
└── AGENTS.md
```

Each package lives in `packages/<name>/` and has its own:

- `package.json`
- `tsconfig.json` — extends `../../tsconfig.base.json`, sets platform-specific `module`, `moduleResolution`, `lib`, and `paths`
- `tsconfig.check.json` — extends `tsconfig.json`, adds `__tests__/` and `vitest.config.ts` to the include set
- `vitest.config.ts`
- `src/` directory
- `src/index.ts` — public barrel export
- `__tests__/` directory at the package root (outside `src/`)

---

## Packages

### `@webiny/utils-common`

Platform-agnostic. No Node.js or browser APIs. Safe to use in any environment (Node, browser, edge workers).

Contains:

- `Result<TValue, TError>` — synchronous result type (ok/fail)
- `ResultAsync<TValue, TError>` — async result type
- `BaseError` — abstract base class for typed errors
- `createAbstraction(name)` — creates a DI abstraction token
- `createFeature(def)` — creates a DI feature (named group of registrations)
- `Logger` — logging abstraction (token `"Core/Logger"`). Interface: `debug`, `info`, `warn`, `error`, `fatal`, `child`. Used by all environments.
- `ConsoleLoggerConfig` — optional config abstraction (token `"Core/ConsoleLoggerConfig"`). `Config` type has: `logLevel`, `prefix`, `timestamp`, `formatTimestamp` — all optional. Default behaviour (no config): `logLevel: "debug"` (logs everything), no prefix, no timestamp.
- `ConsoleLogger` — console-based Logger implementation. Registered under `Logger`. Optional `ConsoleLoggerConfig` dependency.
- `ConsoleLoggerFeature` — registers `ConsoleLogger` in singleton scope.
- `Cache` — synchronous cache abstraction (token `"Core/Cache"`). Interface: `get`, `set`, `remove`, `has`, `clear`, `keys`, `getOrSet`, `byPrefix`. All methods return `Result<T, CacheError>`. `byPrefix(prefix)` returns a scoped view where keys are stored as `<prefix>.<key>`.
- `AsyncCache` — async variant (token `"Core/AsyncCache"`). Same interface as `Cache` but all methods return `ResultAsync`. `getOrSet` factory may be sync or async.
- `CacheError` — abstract base error for all cache implementations. Subclass it for implementation-specific errors.
- `MemoryCacheFeature` — registers an in-memory `Cache` implementation in singleton scope.
- `AsyncMemoryCacheFeature` — registers an in-memory `AsyncCache` implementation in singleton scope.

### `@webiny/utils-node`

Node.js-specific. May use `node:fs`, `node:path`, `node:child_process`, and any other Node built-ins. Depends on `@webiny/utils-common`.

Current features (each has a `README.md` in its feature folder):

- `FileTool` — read, write, copy, remove files
- `DirectoryTool` — create, read, remove, copy directories; `glob(cwd, pattern, options?)` lists files matching a fast-glob pattern relative to `cwd`. Returns `[]` when `cwd` does not exist. `GlobOptions`: `dot`, `ignore`, `deep`, `absolute`, `onlyFiles`.
- `JsonFileTool` — read and write JSON files; optionally validates the parsed value with any schema object that has a `.parse(unknown): T` method (Zod-compatible)
- `PathTool` — injectable wrapper around `node:path` (`join`, `resolve`, `dirname`, `basename`)
- `PinoLoggerConfig` — optional config abstraction (token `"Node/PinoLoggerConfig"`). `Config` type has: `logLevel`, `transport` — both optional. Default behaviour (no config): `logLevel: "info"`, `transport: "pretty"`.
- `PinoLogger` — pino-based Logger implementation. Registered under the `Logger` abstraction from `utils-common`. Optional `PinoLoggerConfig` dependency.
- `PinoLoggerFeature` — registers `PinoLogger` in singleton scope.
- `NdJsonReaderTool` — parses NDJSON from a file path, a `Readable` stream, or an in-memory line iterable. Handles multi-line JSON via a `LineAccumulator` that tries newline-join and concatenation before discarding. `parseFile` uses `ReadStreamFactory` for guaranteed stream cleanup. Every yielded row is `{ data, line }` where `line` is the 1-based physical line number; pass `{ fromLine }` to any parse method to skip lines and resume from a checkpoint.
- `ReadStreamFactory` — creates disposable `node:fs` read streams. `create(path, options?)` returns an `IReadStream` that implements `AsyncDisposable`. Use `await using` to guarantee the underlying file handle is released on scope exit (including early generator break or thrown errors). DI token: `"Node/ReadStreamFactory"`.
- `PackageJsonFileTool` — reads, validates, and writes `package.json` files. `read`/`readOrThrow` return a `PackageJsonFile` value object with `readonly path`, `readonly raw` (typed as `PackageJson` from type-fest), and mutation helpers for `dependencies`, `devDependencies`, `peerDependencies`, and `resolutions`. Write methods accept either `(path, data)` or `(file)` — the latter uses the file's own path. Root-level well-known fields are validated with Zod (`.passthrough()` lets unknown fields through).

Note: The `Logger` abstraction lives in `utils-common`, not `utils-node`. Both `ConsoleLogger` (common) and `PinoLogger` (node) register under the same `Logger` token.

### `@webiny/utils-browser`

Browser-specific. May use `window`, `document`, `localStorage`, `fetch`, React, and any other browser-only APIs. Depends on `@webiny/utils-common`.

If a tool/service works in both environments (e.g. a plain `fetch` call with no Node-specific APIs), it belongs in `utils-common` and can be re-exported from `utils-browser` if needed.

Contains:

- `LocalStorageCacheFeature` — registers a `Cache` implementation backed by `window.localStorage`. Captures a reference to `localStorage` at construction time (or `null` if unavailable). All methods return `Result.fail(LocalStorageUnavailableError)` when `localStorage` is absent rather than throwing.
- `LocalStorageUnavailableError` — `localStorage` is not present in the current environment.
- `LocalStorageQuotaExceededError` — `setItem` threw a storage quota error. Data: `{ key: string, valueSize: number }`.
- `LocalStorageParseError` — `JSON.parse` failed on a stored value. Data: `{ key: string }`.

The captured-reference pattern (`this.localStorage = window?.localStorage ?? null`) is intentional: it enables future refactoring to inject an alternative storage backend without changing the constructor signature.

---

## Package Placement Decision Rules

When adding a new tool, choose the package based on its runtime dependencies:

| Uses only JS built-ins / standard lib | → `utils-common` |
| Uses `node:*` APIs or Node-only npm packages | → `utils-node` |
| Uses `window`, `document`, React, browser APIs | → `utils-browser` |

`utils-node` and `utils-browser` must NOT depend on each other.

---

## Tooling

| Tool                                | Purpose                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Yarn 4 (`node-modules` linker)      | Package manager + workspaces                                                                                                    |
| `@typescript/native-preview` (tsgo) | TypeScript compiler — handles type-checking AND emit (JS + `.d.ts`). Do NOT add tsup, esbuild, or tsc as a separate build tool. |
| Vitest + coverage                   | Testing. Each package has its own `vitest.config.ts`. Root has a workspace config that runs all packages.                       |
| oxlint                              | Linting                                                                                                                         |
| oxfmt                               | Formatting                                                                                                                      |
| adio                                | Import dependency checks                                                                                                        |

**Build**: `tsgo` (the Go-based TypeScript 7 compiler from `@typescript/native-preview`) builds each package. It is ~10x faster than classic `tsc`. Use it for both type-checking and emit.

**Testing**: Vitest with coverage. Tests live in `<package>/__tests__/` as `*.test.ts`. Each package is tested independently; the root workspace config lets you run all tests at once.

---

## TypeScript Config

Root `tsconfig.json` is a solution file (`files: []`, `references` only). Each package `tsconfig.json` extends `tsconfig.base.json`.

`tsconfig.base.json` holds the strict flags shared by all packages. It does **not** set `module`, `moduleResolution`, or `lib` — those are per-package overrides.

### Build tsconfigs (`tsconfig.json` per package)

Used by `tsgo -b` to emit JS + `.d.ts` into `dist/`. Only covers `src/`.

`tsconfig.base.json` provides strict flags but does **not** set `module`, `moduleResolution`, or `lib` — each package defines its own platform-appropriate values.

**packages/common (`@webiny/utils-common`):**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext", "dom"]
  },
  "include": ["src"]
}
```

`dom` is required even in common because TypeScript's `console` type comes from the DOM lib, not esnext.

**packages/node (`@webiny/utils-node`):**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "paths": {
      "~/*": ["./src/*"],
      "@webiny/utils-common/*": ["../common/src/*"],
      "@webiny/utils-common": ["../common/src/index.js"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../common" }]
}
```

**packages/browser (`@webiny/utils-browser`):**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext", "dom", "dom.iterable"],
    "paths": {
      "~/*": ["./src/*"],
      "@webiny/utils-common/*": ["../common/src/*"],
      "@webiny/utils-common": ["../common/src/index.js"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../common" }]
}
```

`dom.iterable` is required for `HTMLCollectionOf<T>` and similar DOM iterable types.

**Why `paths` in node and browser?** The `paths` entries map `@webiny/utils-common` directly to the source in `../common/src/`, so `yarn typecheck` can resolve cross-package imports without pre-building `common` first. With `moduleResolution: "nodenext"`, the path must point to an explicit file — `../common/src/index.js` — not a directory; tsgo maps `.js` → `.ts` at compile time.

### Check tsconfigs (`tsconfig.check.json` per package)

Used by `yarn typecheck` for static type checking only — no emit. Extends the build tsconfig and adds `__tests__/` and `vitest.config.ts` to the include set.

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": false,
    "noEmit": true,
    "rootDir": "."
  },
  "include": ["src", "__tests__", "vitest.config.ts"]
}
```

Each package's check tsconfig inherits its platform-specific `paths`, `lib`, and `types` from the build tsconfig via `extends`. No extra configuration needed.

A root `tsconfig.check.json` covers the root `vitest.config.ts`, `vitest.workspace.ts`, and all files under `scripts/`:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "allowImportingTsExtensions": true
  },
  "include": ["vitest.config.ts", "vitest.workspace.ts", "scripts/**/*.ts"]
}
```

`allowImportingTsExtensions` is required because scripts use `.ts` extensions in their relative imports (see Scripts section below). It is only valid in combination with `noEmit: true`.

Tests live in `__tests__/` at the package root (outside `src/`), so they are naturally excluded from the build by the `include: ["src"]` directive. They are type-checked by `yarn typecheck` via `tsconfig.check.json`.

---

## DI System (`@webiny/di`)

Everything is built on constructor injection via `@webiny/di`. You never use this package directly in tool code — always through the wrappers in `utils-common`.

### Abstraction token

An `Abstraction<T>` is an opaque DI key that binds an interface type to a name:

```ts
import { createAbstraction } from "@webiny/utils-common";

const FileTool = createAbstraction<IFileTool>("Core/FileTool");
```

The string `"Core/FileTool"` is the token name. Use `"Domain/ToolName"` format. It appears in DI error messages and metadata.

### createImplementation

Attaches a concrete class to an abstraction token:

```ts
export const FileTool = FileToolAbstraction.createImplementation({
  implementation: FileToolImpl,
  dependencies: [Logger, DirectoryTool]
});
```

**The `dependencies` array MUST match the constructor parameter order exactly.** If the constructor is `constructor(private logger, private dir)` then `dependencies` must be `[Logger, DirectoryTool]` — same order, no exceptions.

**Optional dependencies** — wrap the token in a tuple with `{ optional: true }`. The container passes `undefined` if nothing is registered for that token:

```ts
export const PinoLogger = Logger.createImplementation({
  implementation: PinoLoggerImpl,
  dependencies: [[PinoLoggerConfig, { optional: true }]]
});
```

The constructor receives `PinoLoggerConfig.Interface | undefined` and must handle both cases.

### Container

Used in tests and application bootstrap to wire everything up:

```ts
import { Container } from "@webiny/di";

const container = new Container();
container.register(FileTool).inSingletonScope(); // class-based registration
container.registerInstance(Logger, myLoggerInstance); // pre-created instance
const tool = container.resolve(FileTool); // returns FileTool.Interface
```

### inSingletonScope

Always register utils as `.inSingletonScope()` unless there's a specific reason not to. Without it the container creates a new instance on every resolve.

---

## Code Patterns

Every tool/service follows this four-file layout:

### 1. Abstraction (`abstractions/ToolName.ts`)

Defines the interface, the DI token, and the namespace type alias.

```ts
import { createAbstraction } from "@webiny/utils-common";

/**
 * Reads, writes, copies and removes files.
 * All paths must be absolute.
 */
export interface IFileTool {
  exists(path: string): boolean;
  readFile(path: string): string | null;
  readFileOrThrow(path: string): string;
  writeFile(path: string, content: string): void;
  writeFileOrThrow(path: string, content: string): void;
  remove(path: string): void;
  copy(source: string, target: string): void;
  copyOrThrow(source: string, target: string): void;
}

export const FileTool = createAbstraction<IFileTool>("Core/FileTool");

export namespace FileTool {
  export type Interface = IFileTool;
}
```

The `namespace FileTool { export type Interface }` pattern lets consumers write `FileTool.Interface` as the type and `FileTool` as the DI token — same name for both, which avoids redundant imports.

### 2. Implementation (`ToolName.ts`)

Implements the abstraction interface. Constructor injects other abstractions.

```ts
import { Logger } from "@webiny/utils-common";
import { FileTool as FileToolAbstraction } from "./abstractions/FileTool.js";
import { DirectoryTool } from "../DirectoryTool/abstractions/DirectoryTool.js";

class FileToolImpl implements FileToolAbstraction.Interface {
  public constructor(
    private readonly logger: Logger.Interface,
    private readonly directoryTool: DirectoryTool.Interface
  ) {}

  // ... method implementations
}

export const FileTool = FileToolAbstraction.createImplementation({
  implementation: FileToolImpl,
  dependencies: [Logger, DirectoryTool] // order must match constructor params
});
```

Note the local alias `FileTool as FileToolAbstraction`. This avoids a name collision between the imported token and the exported implementation constant.

Cross-package abstractions (like `Logger`) are imported from their package (`@webiny/utils-common`), never via relative paths from another package.

### 3. Feature (`feature.ts`)

Registers the implementation in the DI container. Most features have no parameters:

```ts
import { createFeature } from "@webiny/utils-common";
import { FileTool } from "./FileTool.js";

export const FileToolFeature = createFeature({
  name: "Core/FileToolFeature",
  register(container) {
    container.register(FileTool).inSingletonScope();
  }
});
```

When a feature needs runtime configuration, use the typed parameter form:

```ts
import { createFeature } from "@webiny/utils-common";
import { Logger } from "./abstractions/Logger.js";

interface MyFeatureParams {
  logLevel: "debug" | "info" | "warn" | "error";
}

export const MyFeature = createFeature<MyFeatureParams>({
  name: "Core/MyFeature",
  register(container, params) {
    // params is MyFeatureParams | undefined — use params! when required
    container.registerInstance(Logger, makeLogger(params!.logLevel));
  }
});
```

Call it as `MyFeature.register(container, { logLevel: "error" })`.

The `params!` non-null assertion is required because `createFeature<TRegister>` types the parameter as `TRegister | undefined` to support both calling forms.

In practice, `PinoLoggerFeature` and `ConsoleLoggerFeature` take no params — configuration is injected via the optional `PinoLoggerConfig` / `ConsoleLoggerConfig` abstractions instead.

### 4. Index (`index.ts`)

Re-exports the public API for the tool. Never export the implementation class directly:

```ts
export { FileTool } from "./abstractions/index.js";
export { FileToolFeature } from "./feature.js";
```

### Package barrel (`src/index.ts`)

Re-exports everything public:

```ts
// utils-node example
export { FileTool, FileToolFeature } from "./features/FileTool/index.js";
export { DirectoryTool, DirectoryToolFeature } from "./features/DirectoryTool/index.js";
export { PinoLogger, PinoLoggerConfig, PinoLoggerFeature } from "./features/PinoLogger/index.js";

// utils-common example
export {
  Logger,
  ConsoleLogger,
  ConsoleLoggerConfig,
  ConsoleLoggerFeature
} from "./features/Logger/index.js";
```

---

## JSDoc Comments

Comments that explain the **why** (non-obvious constraints, subtle invariants, workarounds) are preferred. JSDoc is especially valuable on interface methods and abstraction types because agents and IDE tooling read those comments.

Write JSDoc on:

- Interface methods in abstraction files
- Public class methods with non-obvious behavior
- Feature parameter types

Do not write comments that just restate what the method name already says.

---

## Result and ResultAsync

Use `Result<TValue, TError>` for synchronous operations that can fail, and `ResultAsync<TValue, TError>` for async ones. Both are in `@webiny/utils-common`.

```ts
import { Result, ResultAsync } from "@webiny/utils-common";

// Synchronous
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Result.fail("division by zero");
  return Result.ok(a / b);
}

const r = divide(10, 2);
if (r.isOk()) console.log(r.value); // 5
if (r.isFail()) console.log(r.error);

// Transforming
const doubled = divide(10, 2).map(v => v * 2); // Result<number, string>
const chained = divide(10, 2).flatMap(v => divide(v, 2)); // Result<number, string>
const msg = divide(10, 2).match({ ok: v => `${v}`, fail: e => `error: ${e}` });

// Async
const result = ResultAsync.from(async () => {
  const data = await fetch("/api");
  if (!data.ok) return Result.fail("fetch failed");
  return Result.ok(await data.json());
});
const processed = result.mapAsync(v => v.name);
const final = await processed.unwrap(); // Result<string, string>
```

**Important**: `Result.fail<E>(error)` returns `Result<never, E>`. When writing test helpers or passing through failures in `map`/`flatMap`, callbacks that receive a `never`-typed value will cause TS errors if you try to call methods on the parameter. Use `() => value` (ignore the param) instead of `v => v.method()`.

---

## BaseError

Subclass `BaseError` for domain-specific typed errors. The `code` property is abstract — always define it as a `readonly` literal string.

```ts
import { BaseError } from "@webiny/utils-common";

// Error with no extra data
class FileNotFoundError extends BaseError {
  public readonly code = "FILE_NOT_FOUND" as const;
}

// Error with typed data payload
class ValidationError extends BaseError<{ field: string; reason: string }> {
  public readonly code = "VALIDATION_ERROR" as const;
}

// Usage
throw new FileNotFoundError({ message: `File not found: ${path}`, stack: new Error().stack ?? "" });
throw new ValidationError({
  message: "Invalid input",
  data: { field: "email", reason: "not a valid email" },
  stack: new Error().stack ?? ""
});
```

Passing `stack: new Error().stack ?? ""` is the correct way to capture the current stack trace.

---

## Testing

### Container setup

Every test file that tests a tool creates a `makeContainer()` helper. Silence logs during tests by registering a `PinoLoggerConfig` instance (or `ConsoleLoggerConfig` instance for `utils-common` tests) with `logLevel: "error"` before registering `PinoLoggerFeature`. Then register the features under test.

```ts
import { Container } from "@webiny/di";
import { FileTool, FileToolFeature } from "../features/FileTool/index.js";
import { DirectoryToolFeature } from "../features/DirectoryTool/index.js";
import { PinoLoggerConfig, PinoLoggerFeature } from "../features/PinoLogger/index.js";

function makeContainer(): Container {
  const container = new Container();
  container.registerInstance(PinoLoggerConfig, {
    getConfig: () => ({ logLevel: "error" as const, transport: "json" as const })
  });
  PinoLoggerFeature.register(container);
  DirectoryToolFeature.register(container);
  FileToolFeature.register(container);
  return container;
}
```

For `utils-common` tests (e.g. testing with `ConsoleLogger`), use `ConsoleLoggerConfig` and `ConsoleLoggerFeature` from `@webiny/utils-common` instead.

Resolve instances in `beforeEach` so each test gets a fresh container:

```ts
let tool: FileTool.Interface;

beforeEach(() => {
  tool = makeContainer().resolve(FileTool);
});
```

### File system tests

Use Node's `tmpdir()` for temporary directories. Always clean up in `afterEach`:

```ts
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync } from "node:fs";

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `wby-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});
```

### Type-checking tests

**Test files must be type-correct.** `yarn typecheck` covers `__tests__/` via each package's `tsconfig.check.json`. Type errors in tests are caught before any code runs.

### Vitest config per package

Node and common packages:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"]
  }
});
```

Browser package — set `environment: "happy-dom"` to simulate `window`, `localStorage`, and other browser globals:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"]
  }
});
```

**happy-dom spy cleanup:** `vi.restoreAllMocks()` does not reliably clean up `vi.spyOn` calls on happy-dom objects (e.g. `localStorage.setItem`). Always call `spy.mockRestore()` explicitly in a `finally` block when spying on happy-dom storage.

### Root workspace and coverage

`vitest.workspace.ts` lists all packages using `defineProject` (not `defineWorkspace` — removed in Vitest 4). Use the actual directory names:

```ts
import { defineProject } from "vitest/config";

export default [
  defineProject({ test: { name: "utils-common", root: "./packages/common" } }),
  defineProject({ test: { name: "utils-node", root: "./packages/node" } }),
  defineProject({ test: { name: "utils-browser", root: "./packages/browser" } })
];
```

Coverage is configured in the root `vitest.config.ts` with v8 provider:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/*/__tests__/**", "**/index.ts", "**/abstractions/**"]
    }
  }
});
```

---

## Step-by-step: Adding a New Tool to an Existing Package

Example: adding `HttpTool` to `utils-node`.

1. **Create the abstraction** at `packages/utils-node/src/features/HttpTool/abstractions/HttpTool.ts`:
   - Define `interface IHttpTool` with JSDoc on each method
   - Export `const HttpTool = createAbstraction<IHttpTool>("Core/HttpTool")`
   - Export `namespace HttpTool { export type Interface = IHttpTool }`

2. **Create the abstraction barrel** at `packages/utils-node/src/features/HttpTool/abstractions/index.ts`:
   - `export { HttpTool } from "./HttpTool.js";`

3. **Create the implementation** at `packages/utils-node/src/features/HttpTool/HttpTool.ts`:
   - Rename the token import: `import { HttpTool as HttpToolAbstraction } from "./abstractions/HttpTool.js";`
   - `class HttpToolImpl implements HttpToolAbstraction.Interface { ... }`
   - `export const HttpTool = HttpToolAbstraction.createImplementation({ implementation: HttpToolImpl, dependencies: [...] })`
   - Dependencies array order must match constructor param order

4. **Create the feature** at `packages/utils-node/src/features/HttpTool/feature.ts`:
   - `export const HttpToolFeature = createFeature({ name: "Core/HttpToolFeature", register(container) { container.register(HttpTool).inSingletonScope(); } })`

5. **Create the feature index** at `packages/utils-node/src/features/HttpTool/index.ts`:
   - `export { HttpTool } from "./abstractions/index.js";`
   - `export { HttpToolFeature } from "./feature.js";`

6. **Create the feature README** at `packages/utils-node/src/features/HttpTool/README.md`:
   - One paragraph description — what it does and when to reach for it
   - Interface section — the public methods with JSDoc (copy from abstraction file)
   - Usage section — two code snippets: DI container wiring + `createXxx()` factory function
   - Update the package `README.md` table to add a row pointing to the new feature README

7. **Add to the package barrel** `packages/utils-node/src/index.ts`:
   - `export { HttpTool, HttpToolFeature } from "./features/HttpTool/index.js";`

8. **Write tests** at `packages/node/__tests__/HttpTool.test.ts` (note: `node` is the directory name; `packages/common/__tests__/` and `packages/browser/__tests__/` follow the same pattern):
   - Create a `makeContainer()` helper (see Testing section)
   - Cover the happy path and error paths

9. **Run the pre-commit chain** until fully clean (see Committing).

---

## Step-by-step: Adding a New Package

Example: adding `@webiny/utils-cli`.

1. **Create the directory**: `packages/utils-cli/`

2. **Create `packages/utils-cli/package.json`**:

   ```json
   {
     "name": "@webiny/utils-cli",
     "version": "0.0.0",
     "type": "module",
     "exports": {
       ".": {
         "import": "./dist/index.js",
         "types": "./dist/index.d.ts"
       }
     },
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "files": ["dist"],
     "dependencies": {
       "@webiny/di": "^0.2.3",
       "@webiny/utils-common": "0.0.0"
     },
     "scripts": {
       "build": "tsgo -b --force",
       "test": "vitest run",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

   Always version `0.0.0` — the real version is injected at publish time.

3. **Create `packages/utils-cli/tsconfig.json`** — add platform-specific `module`, `moduleResolution`, `lib`/`types`, and `paths` for cross-package source resolution:

   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "composite": true,
       "rootDir": "./src",
       "outDir": "./dist",
       "module": "nodenext",
       "moduleResolution": "nodenext",
       "types": ["node"],
       "paths": {
         "~/*": ["./src/*"],
         "@webiny/utils-common/*": ["../common/src/*"],
         "@webiny/utils-common": ["../common/src/index.js"]
       }
     },
     "include": ["src"],
     "references": [{ "path": "../common" }]
   }
   ```

   Adjust `lib` / `types` for the target platform (see TypeScript Config section).

4. **Create `packages/utils-cli/tsconfig.check.json`**:

   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": { "composite": false, "noEmit": true, "rootDir": "." },
     "include": ["src", "__tests__", "vitest.config.ts"]
   }
   ```

5. **Create `packages/utils-cli/vitest.config.ts`**:

   ```ts
   import { defineConfig } from "vitest/config";
   export default defineConfig({
     test: { globals: true, include: ["__tests__/**/*.{test,spec}.{ts,tsx}"] }
   });
   ```

6. **Create `packages/utils-cli/src/index.ts`** — public barrel export.

7. **Add to root `tsconfig.json` references**:

   ```json
   { "path": "./packages/utils-cli" }
   ```

8. **Add to root `vitest.workspace.ts`**:

   ```ts
   defineProject({ test: { name: "utils-cli", root: "./packages/utils-cli" } });
   ```

9. **Add to root `package.json` scripts**:
   - `clean`: add `packages/utils-cli/dist`
   - `build`: add `tsgo -b --force packages/utils-cli`
   - `typecheck`: add `tsgo -p packages/utils-cli/tsconfig.check.json`

   Full example:

   ```
   "clean": "rm -rf packages/common/dist packages/node/dist packages/browser/dist packages/utils-cli/dist",
   "build": "yarn clean && tsgo -b --force packages/common && tsgo -b --force packages/node && tsgo -b --force packages/browser && tsgo -b --force packages/utils-cli",
   "typecheck": "tsgo -p tsconfig.check.json && tsgo -p packages/common/tsconfig.check.json && tsgo -p packages/node/tsconfig.check.json && tsgo -p packages/browser/tsconfig.check.json && tsgo -p packages/utils-cli/tsconfig.check.json"
   ```

10. **Run `yarn install`** (Yarn 4 picks up the new workspace automatically).

11. **Run the pre-commit chain** until fully clean.

---

## Scripts

Root-level scripts live in `scripts/`. They are run directly by Node 24 (no compilation step) using its built-in TypeScript strip-only mode.

### Entry points

| Script                       | Purpose                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/buildPackages.ts`   | Clean `dist/`, compile with `tsgo -b --force`, copy `package.json` into each `dist/`                                                             |
| `scripts/publishPackages.ts` | Build first, then check npm for latest versions, compute conventional-commit version bump, write changelog, publish all packages, create git tag |

Invoked from root `package.json` scripts as `node scripts/buildPackages.ts` etc.

`publishPackages.ts` is a **dry run by default** — it computes the release plan and logs it without touching npm, `CHANGELOG.md`, or git. Pass `--publish` to execute the real release:

```sh
node scripts/publishPackages.ts           # dry run — safe, no side effects
node scripts/publishPackages.ts --publish # real release
```

### Feature structure

Each script delegates to a DI-based feature under `scripts/features/<FeatureName>/`. The pattern mirrors the package feature pattern but uses `@webiny/di` directly (no `createAbstraction` / `createFeature` wrappers from `utils-common` — scripts are standalone and must not depend on built package output).

```
scripts/features/BuildPackages/
├── abstractions/
│   ├── ProjectConfig.ts   # Abstraction token
│   ├── Cleaner.ts
│   ├── Compiler.ts
│   ├── ArtifactCopier.ts
│   ├── BuildOrchestrator.ts
│   └── index.ts
├── Cleaner.ts             # Implementation
├── Compiler.ts
├── ArtifactCopier.ts
├── BuildOrchestrator.ts
└── index.ts               # run(rootDir) — wires container and executes
```

Abstraction tokens are created with `new Abstraction<T>(name)` from `@webiny/di`:

```ts
import { Abstraction } from "@webiny/di";

export interface ICleaner {
  clean(absDir: string): void;
}

export const Cleaner = new Abstraction<ICleaner>("Scripts/Build/Cleaner");

export namespace Cleaner {
  export type Interface = ICleaner;
}
```

Implementations use `abstraction.createImplementation(...)`:

```ts
import { Cleaner as CleanerAbstraction } from "./abstractions/Cleaner.ts";

class CleanerImpl implements CleanerAbstraction.Interface {
    public clean(absDir: string): void { ... }
}

export const Cleaner = CleanerAbstraction.createImplementation({
    implementation: CleanerImpl,
    dependencies: []
});
```

The `index.ts` creates a `Container`, registers all implementations, and resolves the orchestrator:

```ts
import { Container } from "@webiny/di";
import { ProjectConfig, BuildOrchestrator } from "./abstractions/index.ts";
import { Cleaner as CleanerImpl } from "./Cleaner.ts";
// ...

export function run(rootDir: string): void {
  const container = new Container();
  container.registerInstance(ProjectConfig, { rootDir, packages });
  container.register(CleanerImpl).inSingletonScope();
  // ...
  container.resolve(BuildOrchestrator).run();
}
```

### Node 24 strip-only constraints

Scripts run under Node 24's native TypeScript support, which **strips types only** — it does not transform syntax or remap module specifiers. Two constraints follow from this:

**1. Use `.ts` extensions in all relative imports within `scripts/`.**

Node's module loader resolves specifiers literally. A `.js` specifier looks for a `.js` file on disk and fails if only a `.ts` file exists. The tsgo "`.js` maps to `.ts`" convention only works when tsgo performs the compilation step — it does not apply when Node runs `.ts` files directly.

```ts
// CORRECT — scripts/
import { run } from "./features/BuildPackages/index.ts";
import { Cleaner as CleanerAbstraction } from "./abstractions/Cleaner.ts";

// WRONG — scripts/ (only valid in compiled packages/src/)
import { run } from "./features/BuildPackages/index.js";
```

Package source files under `packages/*/src/` continue to use `.js` extensions as before.

**2. No TypeScript parameter properties in script classes.**

Node 24 strip-only mode does not support the `private readonly x: T` constructor shorthand. Expand to explicit field declarations and assignments:

```ts
// CORRECT
class CompilerImpl implements CompilerAbstraction.Interface {
  private readonly config: ProjectConfig.Interface;

  public constructor(config: ProjectConfig.Interface) {
    this.config = config;
  }
}

// WRONG — fails at runtime with ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX
class CompilerImpl implements CompilerAbstraction.Interface {
  public constructor(private readonly config: ProjectConfig.Interface) {}
}
```

This constraint applies only to files run directly by Node (i.e. everything under `scripts/`). Package source compiled by tsgo has no such restriction.

### Conventional commit version strategy

`scripts/features/PublishPackages/` reads git commit messages since the last published tag and applies these rules:

| Commit type                                                                          | Bump                                                                 |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `feat`                                                                               | minor (patch reset to 0)                                             |
| `fix`, `refactor`, `test`, `chore`, `docs`, `style`, `perf`, `build`, `ci`, `revert` | patch                                                                |
| anything else                                                                        | **hard failure** (`process.exit(1)`) — unknown types are not allowed |

If there are no commits since the last tag, publish is skipped. The version is written into `dist/package.json` before publishing; it is never committed back to source.

### Changelog generation

`ChangelogWriter` prepends a new entry to `CHANGELOG.md` at the repo root on every real release (not dry run). Format follows [Keep a Changelog](https://keepachangelog.com). Commit types map to sections in this order:

| Commit type                             | Section       |
| --------------------------------------- | ------------- |
| `feat`                                  | Added         |
| `fix`                                   | Fixed         |
| `refactor`, `perf`                      | Changed       |
| `revert`                                | Reverted      |
| `docs`                                  | Documentation |
| `chore`, `build`, `ci`, `test`, `style` | Maintenance   |

The `type(scope): ` prefix is stripped; only the description appears in the entry. Sections with no commits are omitted. The file is created if it does not exist.

### Dry-run behaviour

`dryRun: boolean` lives on `ProjectConfig` and is set in `scripts/features/PublishPackages/index.ts` based on `process.argv`. In dry-run mode `PublishOrchestrator` exits early after logging the plan — no filesystem writes (`CHANGELOG.md`, `dist/package.json`), no npm publish, no git tag. Git reads (`tagExists`, `commitsSince`) still run because they power the plan output.

---

## Inter-Package Dependencies

- `utils-node` and `utils-browser` both depend on `utils-common`
- Use the workspace protocol: `"@webiny/utils-common": "0.0.0"`
- `utils-node` and `utils-browser` must NOT depend on each other

---

## Package `package.json` Shape

```json
{
  "name": "@webiny/utils-node",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsgo -b --force",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Version**: Always `0.0.0`. The real version is injected at publish time.

---

## Build

Run a full build from the repo root:

```sh
yarn build
# expands to: yarn clean && tsgo -b --force packages/common && tsgo -b --force packages/node && tsgo -b --force packages/browser
```

`yarn clean` always runs first — it wipes all `dist/` directories so there are never stale compiled artifacts. Always use `--force` — builds must be complete rebuilds, not incremental. tsgo's project-reference ordering is unreliable in the current beta, so the root build script sequences each package explicitly.

Run tests:

```sh
yarn test               # all packages via vitest workspace
yarn test --project utils-node   # single package
yarn test:coverage      # with v8 coverage
```

### Known tsgo gotchas

- tsgo is a beta compiler (`@typescript/native-preview`). Occasionally it produces incorrect error messages for valid code. If you see something that looks like a tsgo bug, try `yarn clean && yarn build` with `--force` before concluding it's a real error.
- Always use `--force`. Incremental builds are unreliable with the current beta — stale `.tsbuildinfo` files can cause silently wrong output.
- Do not add `tsc`, `tsup`, or `esbuild` as supplementary build utils. tsgo handles everything.
- tsgo resolves `.js` imports to `.ts` source files at compile time. Always write `.js` in relative imports in `.ts` source, even though the `.ts` file is what actually exists.

---

## Committing

**Always commit your work when a logical unit is complete** — don't leave changes staged or unstaged.

**Branch rules:**

- `main` — while the repo is being set up, short `wip: <description>` messages are acceptable.
- `fix/*`, `feat/*`, `test/*`, `refactor/*`, and all other named branches — commits **must** have a proper message:
  - Subject line: `<type>(<scope>): <short imperative summary>` (≤72 chars)
  - Blank line
  - Body: explain **why** the change was made, not what the diff already shows. Include relevant context (what broke, what the constraint is, what the tradeoff was).

Example of a good commit on a feature branch:

```
feat(utils-node): add FileTool.appendFile

Needed for log-rotation helpers that write incrementally.
writeFile always truncates, so a separate append path avoids
a read-modify-write cycle on large files.
```

**Before every commit, run the full pre-commit chain and loop until it is completely clean:**

```sh
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

All five steps must pass with zero errors and zero warnings before staging and committing. If any step fails, fix the issue and run the full chain again from the start. Do not commit while anything is red.

Never use `--no-verify` or skip hooks.

**Never push, merge, or pull.** Local commits only. No `git push`, `git merge`, `git pull`, or `gh pr` commands — ever.

---

## Conventions

- **No default exports.** Always use named exports.
- **Every feature folder has a `README.md`.** Format: (1) one-paragraph description, (2) Interface section with JSDoc excerpts from the abstraction file, (3) Usage section with two snippets — DI container wiring and direct factory instantiation. Keep it current: if you change a method signature, add/remove a method, or change constructor dependencies, update the feature README in the same commit. Also update the package-level `README.md` table if you add or rename a feature.
- **JSDoc comments are preferred** on interface methods, abstraction types, and public class methods. See JSDoc Comments section above.
- **No inline comments that explain what the code does.** Only comment the non-obvious why (hidden constraints, subtle invariants, workarounds).
- **Strict TypeScript.** All strict flags listed in `tsconfig.base.json` must pass.
- **`.js` extensions in package source imports.** Under `packages/*/src/`, use `import { Foo } from "./Foo.js"` (not `.ts`). The `nodenext` module resolution requires explicit extensions; tsgo resolves `.js` to `.ts` source files at compile time. **Exception: `scripts/`** — scripts are run directly by Node 24 (not compiled), so use `.ts` extensions there (see Scripts section).
- **`node:` prefix for Node built-ins.** Always `import { readFileSync } from "node:fs"`, never `"fs"`.
- **Singletons via DI.** Register utils as `.inSingletonScope()` unless there's a reason not to.
- **No barrel re-exports of types only.** If something is exported, it should be usable, not just a type alias.
- **DI token names use `"Domain/ToolName"` format.** `"Core/FileTool"`, `"Core/Logger"`, `"Node/PinoLoggerConfig"`, etc. Common utils use `"Core/"` prefix; Node-specific utils use `"Node/"` prefix.
- **Namespace pattern for interface types.** Always export `namespace ToolName { export type Interface = IToolName }` alongside the token so consumers can use `ToolName.Interface` as the type.
