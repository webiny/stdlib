# Monorepo Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the migration from a single-package `src/` layout to a Yarn 4 monorepo with three publishable packages (`@webiny/tools-common`, `@webiny/tools-node`, `@webiny/tools-browser`), including a refactored Logger system split across the two non-browser packages.

**Architecture:** Root workspace delegates build/test to per-package configs via `tsgo` project references and a Vitest workspace config. `tools-common` holds platform-agnostic primitives and a `ConsoleLogger` default. `tools-node` holds Node-specific tools (`FileTool`, `DirectoryTool`) and an opt-in `PinoLogger`. `tools-browser` is a skeleton. All packages publish-ready (`exports`, `files`, `main`, `types`). Versions are `0.0.0` in source — bumped only at publish time.

**Tech Stack:** Yarn 4 (node-modules linker), `@typescript/native-preview` (tsgo), Vitest 4, `@webiny/di` (external, already imports `reflect-metadata` — do NOT import it yourself), pino@^10.3.1 + pino-pretty@^13.1.3 (tools-node only), oxlint, oxfmt.

---

## Design Reference

### Logger split

| Location | What |
|---|---|
| `tools-common/src/features/Logger/abstractions/Logger.ts` | `Logger` abstraction token + `ILogger` interface (no `done()`) |
| `tools-common/src/features/Logger/abstractions/ConsoleLoggerConfig.ts` | `ConsoleLoggerConfig` abstraction + `ConsoleLoggerConfig.Config` type |
| `tools-common/src/features/Logger/ConsoleLogger.ts` | `ConsoleLoggerImpl` class (private) + `ConsoleLogger` createImplementation export |
| `tools-common/src/features/Logger/feature.ts` | `ConsoleLoggerFeature` — `container.register(ConsoleLogger).inSingletonScope()` |
| `tools-node/src/features/PinoLogger/abstractions/PinoLoggerConfig.ts` | `PinoLoggerConfig` abstraction + `PinoLoggerConfig.Config` type |
| `tools-node/src/features/PinoLogger/PinoLogger.ts` | `PinoLoggerImpl` class (private) + `PinoLogger` createImplementation export |
| `tools-node/src/features/PinoLogger/feature.ts` | `PinoLoggerFeature` — `container.register(PinoLogger).inSingletonScope()` |

### `ConsoleLoggerConfig.Config`
```ts
{
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal"; // default: "debug" (log everything)
    prefix?: string;
    timestamp?: boolean;                                       // default: false
    formatTimestamp?: (date: Date) => string;                  // default: d => d.toISOString()
}
```
When `ConsoleLoggerConfig` is not registered, `ConsoleLogger` defaults to `logLevel: "debug"`, no prefix, no timestamp.

### `PinoLoggerConfig.Config`
```ts
{
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal"; // default: "info"
    transport?: "pretty" | "json";                             // default: "pretty"
}
```
No file transport — users who need custom transports provide their own `Logger` implementation.

### DI pattern for optional config
Both loggers use `Abstraction.createImplementation` with `[ConfigAbstraction, { optional: true }]` in `dependencies`. The constructor receives `ConfigAbstraction.Interface | undefined`. `child()` creates new instances directly within the module (private class accessible in same scope).

### tsconfig per package
- Root: base compiler options, no `types`, project references
- `tools-common`: extends root, `"types": []` (enforces platform-agnostic constraint)
- `tools-node`: extends root, `"types": ["node"]`
- `tools-browser`: extends root, `"types": []`, `"lib": ["dom", "esnext"]`

### Import rules
- Within `tools-common`, internal imports use relative paths (e.g. `"../../core/index.ts"`).
- `tools-node` and `tools-browser` import from `tools-common` via `"@webiny/tools-common"`.
- No `~/` path aliases anywhere — removed.
- All local imports use `.ts` extensions (not `.js`).
- Tests use a `Container` instance — never construct implementation classes directly.

---

## File Map

**Create:**
- `packages/tools-common/tsconfig.json`
- `packages/tools-common/vitest.config.ts`
- `packages/tools-common/src/index.ts`
- `packages/tools-common/src/features/Logger/ConsoleLogger.ts`
- `packages/tools-common/src/features/Logger/abstractions/ConsoleLoggerConfig.ts`
- `packages/tools-common/src/features/Logger/__tests__/ConsoleLogger.test.ts`
- `packages/tools-node/package.json`
- `packages/tools-node/tsconfig.json`
- `packages/tools-node/vitest.config.ts`
- `packages/tools-node/src/index.ts`
- `packages/tools-node/src/features/PinoLogger/abstractions/PinoLoggerConfig.ts`
- `packages/tools-node/src/features/PinoLogger/abstractions/index.ts`
- `packages/tools-node/src/features/PinoLogger/PinoLogger.ts`
- `packages/tools-node/src/features/PinoLogger/feature.ts`
- `packages/tools-node/src/features/PinoLogger/index.ts`
- `packages/tools-node/src/features/PinoLogger/__tests__/PinoLogger.test.ts`
- `packages/tools-browser/package.json`
- `packages/tools-browser/tsconfig.json`
- `packages/tools-browser/vitest.config.ts`
- `packages/tools-browser/src/index.ts`
- `vitest.workspace.ts`

**Modify:**
- `package.json` (root) — add `workspaces`, `build`/`test`/`test:coverage` scripts
- `tsconfig.json` (root) — project references, remove `allowImportingTsExtensions`, `paths`, `rootDir`, `outDir`, `include`, `types`
- `packages/tools-common/package.json` — add `exports`, `files`, `main`, `types`, `scripts`, `@webiny/di` dep, version `0.0.0`
- `packages/tools-common/src/core/index.ts` — fix `.js` → `.ts` extensions, add `createFeature` export
- `packages/tools-common/src/core/ResultAsync.ts` — fix `.js` → `.ts` import of `Result`
- `packages/tools-common/src/core/BaseError.ts` — make `stack` optional in constructor input
- `packages/tools-common/src/features/Logger/abstractions/Logger.ts` — remove `done()`, fix import, rename token `"Core/Logger"`
- `packages/tools-common/src/features/Logger/abstractions/index.ts` — add `ConsoleLoggerConfig` re-export
- `packages/tools-common/src/features/Logger/feature.ts` — rewrite to use `ConsoleLogger`
- `packages/tools-common/src/features/Logger/index.ts` — add `ConsoleLoggerConfig` export
- `packages/tools-node/src/features/FileTool/abstractions/FileTool.ts` — fix import (`~/base/` → `@webiny/tools-common`)
- `packages/tools-node/src/features/FileTool/feature.ts` — fix import (`~/base/` → `@webiny/tools-common`)
- `packages/tools-node/src/features/FileTool/FileTool.ts` — fix Logger import path
- `packages/tools-node/src/features/FileTool/index.ts` — ensure both `FileTool` and `FileToolFeature` are exported
- `packages/tools-node/src/features/DirectoryTool/feature.ts` — fix import (`~/base/` → `@webiny/tools-common`)
- `packages/tools-node/src/features/DirectoryTool/DirectoryTool.ts` — fix Logger import path
- `docs/webiny-di-guide.md` — update import paths from `~/base/` to `@webiny/tools-common`

**Delete:**
- `packages/tools-common/src/features/Logger/PinoLogger.ts`

---

## Task 1: Fix `core/` primitives

**Files:**
- Modify: `packages/tools-common/src/core/index.ts`
- Modify: `packages/tools-common/src/core/ResultAsync.ts`
- Modify: `packages/tools-common/src/core/BaseError.ts`

- [ ] **Step 1: Fix `core/index.ts` — extensions and missing export**

```ts
export { BaseError } from "./BaseError.ts";
export { createAbstraction } from "./createAbstraction.ts";
export { createFeature } from "./createFeature.ts";
export { Result } from "./Result.ts";
export { ResultAsync } from "./ResultAsync.ts";
```

- [ ] **Step 2: Fix `ResultAsync.ts` — wrong `.js` extension on Result import**

Change line 1 from:
```ts
import { Result } from "./Result.js";
```
To:
```ts
import { Result } from "./Result.ts";
```

- [ ] **Step 3: Fix `BaseError.ts` — make `stack` optional**

The current implementation requires `stack` in the constructor input but `super(input.message)` auto-captures the stack. Change the type so `stack` is optional and falls back to the auto-captured one:

```ts
type ErrorDataWithOptionalData<TData> = TData extends void
    ? { message: string; data?: never; stack?: string }
    : { message: string; data: TData; stack?: string };

export abstract class BaseError<TData = void> extends Error {
    public abstract readonly code: string;
    public readonly data: TData extends void ? undefined : TData;

    protected constructor(input: ErrorDataWithOptionalData<TData>) {
        super(input.message);
        if (input.stack) {
            this.stack = input.stack;
        }
        this.data = input.data as TData extends void ? undefined : TData;
    }
}
```

- [ ] **Step 4: Commit**
```bash
git add packages/tools-common/src/core/
git commit -m "fix: core primitives — extensions, BaseError optional stack, ResultAsync import"
```

---

## Task 2: Root monorepo config

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vitest.workspace.ts`

- [ ] **Step 1: Update root `package.json`**

```json
{
  "version": "0.0.0",
  "type": "module",
  "description": "Monorepo for tools used by Webiny",
  "license": "MIT",
  "packageManager": "yarn@4.14.1",
  "workspaces": ["packages/*"],
  "devDependencies": {
    "@types/node": "^25.6.0",
    "@typescript/native-preview": "beta",
    "adio": "^3.0.0",
    "oxfmt": "^0.47.0",
    "oxlint": "^1.62.0",
    "vitest": "^4.1.5"
  },
  "scripts": {
    "build": "yarn workspaces foreach -A run build",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "format": "oxfmt",
    "format:fix": "oxfmt",
    "format:check": "oxfmt --check",
    "lint": "oxlint --deny-warnings",
    "lint:fix": "oxlint --fix"
  }
}
```

- [ ] **Step 2: Rewrite root `tsconfig.json`**

The root config is now a base config only — no `rootDir`, `outDir`, `include`, `types`, or path aliases. Per-package tsconfigs extend this and add their own specifics:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "esnext",
    "lib": ["esnext"],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "isolatedDeclarations": true,
    "erasableSyntaxOnly": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  },
  "references": [
    { "path": "./packages/tools-common" },
    { "path": "./packages/tools-node" },
    { "path": "./packages/tools-browser" }
  ]
}
```

- [ ] **Step 3: Create `vitest.workspace.ts`**

```ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
    "packages/tools-common/vitest.config.ts",
    "packages/tools-node/vitest.config.ts",
    "packages/tools-browser/vitest.config.ts"
]);
```

- [ ] **Step 4: Commit**
```bash
git add package.json tsconfig.json vitest.workspace.ts
git commit -m "chore: root monorepo config — workspaces, tsconfig project refs, vitest workspace"
```

---

## Task 3: Scaffold `tools-common` package

**Files:**
- Modify: `packages/tools-common/package.json`
- Create: `packages/tools-common/tsconfig.json`
- Create: `packages/tools-common/vitest.config.ts`
- Create: `packages/tools-common/src/index.ts`

- [ ] **Step 1: Update `packages/tools-common/package.json`**

```json
{
  "name": "@webiny/tools-common",
  "version": "0.0.0",
  "type": "module",
  "description": "Platform-agnostic utilities for Webiny (DI-based)",
  "license": "MIT",
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
    "@webiny/di": "^0.2.3"
  },
  "devDependencies": {
    "@typescript/native-preview": "beta",
    "vitest": "^4.1.5"
  },
  "scripts": {
    "build": "tsgo --build",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 2: Create `packages/tools-common/tsconfig.json`**

No `types` here — `tools-common` is platform-agnostic; accidentally using Node or browser APIs should be a type error:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "types": []
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/tools-common/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node"
    }
});
```

- [ ] **Step 4: Create `packages/tools-common/src/index.ts`**

```ts
export { BaseError } from "./core/BaseError.ts";
export { createAbstraction } from "./core/createAbstraction.ts";
export { createFeature } from "./core/createFeature.ts";
export { Result } from "./core/Result.ts";
export { ResultAsync } from "./core/ResultAsync.ts";
export { Logger } from "./features/Logger/abstractions/Logger.ts";
export { ConsoleLoggerConfig } from "./features/Logger/abstractions/ConsoleLoggerConfig.ts";
export { ConsoleLoggerFeature } from "./features/Logger/feature.ts";
```

- [ ] **Step 5: Commit**
```bash
git add packages/tools-common/package.json packages/tools-common/tsconfig.json packages/tools-common/vitest.config.ts packages/tools-common/src/index.ts
git commit -m "chore: scaffold tools-common package config"
```

---

## Task 4: Scaffold `tools-node` package

**Files:**
- Create: `packages/tools-node/package.json`
- Create: `packages/tools-node/tsconfig.json`
- Create: `packages/tools-node/vitest.config.ts`

- [ ] **Step 1: Create `packages/tools-node/package.json`**

```json
{
  "name": "@webiny/tools-node",
  "version": "0.0.0",
  "type": "module",
  "description": "Node.js tools for Webiny (DI-based)",
  "license": "MIT",
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
    "@webiny/tools-common": "workspace:*",
    "pino": "^10.3.1",
    "pino-pretty": "^13.1.3"
  },
  "devDependencies": {
    "@types/node": "^25.6.0",
    "@typescript/native-preview": "beta",
    "vitest": "^4.1.5"
  },
  "scripts": {
    "build": "tsgo --build",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 2: Create `packages/tools-node/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../tools-common" }
  ]
}
```

- [ ] **Step 3: Create `packages/tools-node/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node"
    }
});
```

- [ ] **Step 4: Commit**
```bash
git add packages/tools-node/
git commit -m "chore: scaffold tools-node package config"
```

---

## Task 5: Scaffold `tools-browser` skeleton

**Files:**
- Create: `packages/tools-browser/package.json`
- Create: `packages/tools-browser/tsconfig.json`
- Create: `packages/tools-browser/vitest.config.ts`
- Create: `packages/tools-browser/src/index.ts`

- [ ] **Step 1: Create `packages/tools-browser/package.json`**

```json
{
  "name": "@webiny/tools-browser",
  "version": "0.0.0",
  "type": "module",
  "description": "Browser tools for Webiny (DI-based)",
  "license": "MIT",
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
    "@webiny/tools-common": "workspace:*"
  },
  "devDependencies": {
    "@typescript/native-preview": "beta",
    "jsdom": "^29.1.1",
    "vitest": "^4.1.5"
  },
  "scripts": {
    "build": "tsgo --build",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 2: Create `packages/tools-browser/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "types": [],
    "lib": ["dom", "esnext"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../tools-common" }
  ]
}
```

- [ ] **Step 3: Create `packages/tools-browser/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom"
    }
});
```

- [ ] **Step 4: Create `packages/tools-browser/src/index.ts`**

```ts
// Browser-specific tools — to be added
export {};
```

- [ ] **Step 5: Commit**
```bash
git add packages/tools-browser/
git commit -m "chore: add tools-browser skeleton"
```

---

## Task 6: Install deps and verify workspace

- [ ] **Step 1: Install**
```bash
yarn install
```
Expected: resolves workspace links, no errors.

- [ ] **Step 2: Verify workspace packages are linked**
```bash
yarn workspaces list
```
Expected output includes:
```
. (root)
packages/tools-browser
packages/tools-common
packages/tools-node
```

- [ ] **Step 3: Commit lock file**
```bash
git add yarn.lock
git commit -m "chore: yarn install after workspace setup"
```

---

## Task 7: Refactor Logger abstraction

**Files:**
- Modify: `packages/tools-common/src/features/Logger/abstractions/Logger.ts`

- [ ] **Step 1: Rewrite `Logger.ts` — remove `done`, fix import, rename DI token**

```ts
import { createAbstraction } from "../../../core/index.ts";

/**
 * Logger abstraction — the DI token and interface for all logger implementations.
 *
 * Register a concrete implementation (ConsoleLoggerFeature or PinoLoggerFeature)
 * before resolving this abstraction from the container.
 */
interface ILogger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    fatal(message: string, ...args: unknown[]): void;
    /** Creates a child logger that prepends `prefix` to every message. */
    child(prefix: string): ILogger;
}

export const Logger = createAbstraction<ILogger>("Core/Logger");

export namespace Logger {
    export type Interface = ILogger;
}
```

- [ ] **Step 2: Commit**
```bash
git add packages/tools-common/src/features/Logger/abstractions/Logger.ts
git commit -m "refactor: Logger abstraction — remove done(), rename token Core/Logger, fix import"
```

---

## Task 8: ConsoleLogger + ConsoleLoggerConfig

**Files:**
- Create: `packages/tools-common/src/features/Logger/abstractions/ConsoleLoggerConfig.ts`
- Modify: `packages/tools-common/src/features/Logger/abstractions/index.ts`
- Create: `packages/tools-common/src/features/Logger/__tests__/ConsoleLogger.test.ts`
- Create: `packages/tools-common/src/features/Logger/ConsoleLogger.ts`

- [ ] **Step 1: Create `abstractions/ConsoleLoggerConfig.ts`**

```ts
import { createAbstraction } from "../../../core/index.ts";

/**
 * Configuration shape returned by ConsoleLoggerConfig implementations.
 * All fields are optional — ConsoleLogger uses sensible defaults for any omitted field.
 */
export type ConsoleLoggerConfigData = {
    /** Minimum log level to output. Default: "debug" (logs everything). */
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal";
    /** String prepended to every message, e.g. "MyApp". Default: none. */
    prefix?: string;
    /** Whether to include a timestamp in each message. Default: false. */
    timestamp?: boolean;
    /**
     * Custom timestamp formatter. Only called when `timestamp` is true.
     * Default: `(d) => d.toISOString()`.
     */
    formatTimestamp?: (date: Date) => string;
};

interface IConsoleLoggerConfig {
    getConfig(): ConsoleLoggerConfigData;
}

export const ConsoleLoggerConfig = createAbstraction<IConsoleLoggerConfig>("Core/ConsoleLoggerConfig");

export namespace ConsoleLoggerConfig {
    export type Interface = IConsoleLoggerConfig;
    export type Config = ConsoleLoggerConfigData;
}
```

- [ ] **Step 2: Update `abstractions/index.ts`**

```ts
export { Logger } from "./Logger.ts";
export { ConsoleLoggerConfig } from "./ConsoleLoggerConfig.ts";
```

- [ ] **Step 3: Write the failing tests**

Tests use a `Container` instance — never construct `ConsoleLoggerImpl` directly.

Create `packages/tools-common/src/features/Logger/__tests__/ConsoleLogger.test.ts`:
```ts
import { Container } from "@webiny/di";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleLogger } from "../ConsoleLogger.ts";
import { Logger } from "../abstractions/Logger.ts";
import { ConsoleLoggerConfig } from "../abstractions/ConsoleLoggerConfig.ts";

function makeContainer(config?: ConsoleLoggerConfig.Config): {
    logger: Logger.Interface;
    container: Container;
} {
    const container = new Container();
    if (config !== undefined) {
        container.registerInstance(ConsoleLoggerConfig, { getConfig: () => config });
    }
    container.register(ConsoleLogger).inSingletonScope();
    return { logger: container.resolve(Logger), container };
}

describe("ConsoleLogger", () => {
    beforeEach(() => {
        vi.spyOn(console, "debug").mockImplementation(() => {});
        vi.spyOn(console, "info").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("log level filtering", () => {
        it("logs everything by default when no config is registered", () => {
            const { logger } = makeContainer();
            logger.debug("hi");
            expect(console.debug).toHaveBeenCalledWith("hi");
        });

        it("suppresses debug when logLevel is info", () => {
            const { logger } = makeContainer({ logLevel: "info" });
            logger.debug("hidden");
            expect(console.debug).not.toHaveBeenCalled();
        });

        it("logs info when logLevel is info", () => {
            const { logger } = makeContainer({ logLevel: "info" });
            logger.info("visible");
            expect(console.info).toHaveBeenCalledWith("visible");
        });

        it("suppresses debug and info when logLevel is warn", () => {
            const { logger } = makeContainer({ logLevel: "warn" });
            logger.debug("d");
            logger.info("i");
            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
        });

        it("logs warn, error, fatal when logLevel is warn", () => {
            const { logger } = makeContainer({ logLevel: "warn" });
            logger.warn("w");
            logger.error("e");
            logger.fatal("f");
            expect(console.warn).toHaveBeenCalledWith("w");
            expect(console.error).toHaveBeenCalledWith("e");
            expect(console.error).toHaveBeenCalledWith("f");
        });
    });

    describe("prefix", () => {
        it("prepends prefix to messages", () => {
            const { logger } = makeContainer({ prefix: "App" });
            logger.info("started");
            expect(console.info).toHaveBeenCalledWith("[App] started");
        });

        it("does not add prefix brackets when prefix is not configured", () => {
            const { logger } = makeContainer();
            logger.info("plain");
            expect(console.info).toHaveBeenCalledWith("plain");
        });
    });

    describe("timestamp", () => {
        it("does not include timestamp by default", () => {
            const { logger } = makeContainer();
            logger.info("msg");
            expect(console.info).toHaveBeenCalledWith("msg");
        });

        it("includes ISO timestamp when timestamp is true", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
            const { logger } = makeContainer({ timestamp: true });
            logger.info("msg");
            expect(console.info).toHaveBeenCalledWith("[2026-01-01T00:00:00.000Z] msg");
            vi.useRealTimers();
        });

        it("uses custom formatTimestamp when provided", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
            const { logger } = makeContainer({
                timestamp: true,
                formatTimestamp: (d) => String(d.getFullYear())
            });
            logger.info("msg");
            expect(console.info).toHaveBeenCalledWith("[2026] msg");
            vi.useRealTimers();
        });
    });

    describe("child()", () => {
        it("creates child logger with combined prefix", () => {
            const { logger } = makeContainer({ prefix: "App" });
            const child = logger.child("DB");
            child.info("query");
            expect(console.info).toHaveBeenCalledWith("[App:DB] query");
        });

        it("creates child with prefix when parent has none", () => {
            const { logger } = makeContainer();
            const child = logger.child("Worker");
            child.warn("slow");
            expect(console.warn).toHaveBeenCalledWith("[Worker] slow");
        });

        it("child inherits parent log level", () => {
            const { logger } = makeContainer({ logLevel: "error" });
            const child = logger.child("Sub");
            child.info("suppressed");
            expect(console.info).not.toHaveBeenCalled();
            child.error("visible");
            expect(console.error).toHaveBeenCalled();
        });
    });
});
```

- [ ] **Step 4: Run tests — expect failure (module not found)**
```bash
cd packages/tools-common && yarn test
```
Expected: FAIL — `Cannot find module '../ConsoleLogger.ts'`

- [ ] **Step 5: Create `ConsoleLogger.ts`**

`ConsoleLoggerImpl` is private to the module. `ConsoleLogger` is the `createImplementation` export bound to the `Logger` abstraction. `child()` creates children by constructing `ConsoleLoggerImpl` directly (within the same module scope — no DI needed for children).

Note: `LOG_LEVEL_PRIORITY[key]` returns `number | undefined` under `noUncheckedIndexedAccess` even with `Record<LogLevel, number>`. Use non-null assertion (`!`) on those lookups.

```ts
import { Logger } from "./abstractions/Logger.ts";
import { ConsoleLoggerConfig } from "./abstractions/ConsoleLoggerConfig.ts";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
};

/** Console-based logger. Registered under the Logger abstraction by ConsoleLoggerFeature. */
class ConsoleLoggerImpl implements Logger.Interface {
    private readonly minLevel: number;
    private readonly prefix: string;
    private readonly timestamp: boolean;
    private readonly formatTimestamp: (date: Date) => string;

    public constructor(configProvider?: ConsoleLoggerConfig.Interface) {
        const config = configProvider?.getConfig();
        this.minLevel = LOG_LEVEL_PRIORITY[config?.logLevel ?? "debug"]!;
        this.prefix = config?.prefix ?? "";
        this.timestamp = config?.timestamp ?? false;
        this.formatTimestamp = config?.formatTimestamp ?? ((d) => d.toISOString());
    }

    private shouldLog(level: LogLevel): boolean {
        return (LOG_LEVEL_PRIORITY[level] ?? 0) >= this.minLevel;
    }

    private format(message: string): string {
        const parts: string[] = [];
        if (this.timestamp) {
            parts.push(`[${this.formatTimestamp(new Date())}]`);
        }
        if (this.prefix) {
            parts.push(`[${this.prefix}]`);
        }
        parts.push(message);
        return parts.join(" ");
    }

    public debug(message: string, ...args: unknown[]): void {
        if (this.shouldLog("debug")) {
            console.debug(this.format(message), ...args);
        }
    }

    public info(message: string, ...args: unknown[]): void {
        if (this.shouldLog("info")) {
            console.info(this.format(message), ...args);
        }
    }

    public warn(message: string, ...args: unknown[]): void {
        if (this.shouldLog("warn")) {
            console.warn(this.format(message), ...args);
        }
    }

    public error(message: string, ...args: unknown[]): void {
        if (this.shouldLog("error")) {
            console.error(this.format(message), ...args);
        }
    }

    public fatal(message: string, ...args: unknown[]): void {
        if (this.shouldLog("fatal")) {
            console.error(this.format(message), ...args);
        }
    }

    public child(prefix: string): Logger.Interface {
        const combined = this.prefix ? `${this.prefix}:${prefix}` : prefix;
        // Wrap the current resolved config so the child uses the same settings.
        const configOverride: ConsoleLoggerConfig.Interface = {
            getConfig: () => ({
                logLevel: (Object.keys(LOG_LEVEL_PRIORITY) as LogLevel[]).find(
                    (k) => LOG_LEVEL_PRIORITY[k] === this.minLevel
                ) ?? "debug",
                prefix: combined,
                timestamp: this.timestamp,
                formatTimestamp: this.formatTimestamp
            })
        };
        return new ConsoleLoggerImpl(configOverride);
    }
}

/**
 * Console-based Logger implementation.
 * Register via ConsoleLoggerFeature. Optionally pair with ConsoleLoggerConfig
 * to configure log level, prefix, and timestamps.
 */
export const ConsoleLogger = Logger.createImplementation({
    implementation: ConsoleLoggerImpl,
    dependencies: [[ConsoleLoggerConfig, { optional: true }]]
});
```

- [ ] **Step 6: Run tests — expect pass**
```bash
cd packages/tools-common && yarn test
```
Expected: all ConsoleLogger tests PASS.

- [ ] **Step 7: Commit**
```bash
git add packages/tools-common/src/features/Logger/
git commit -m "feat: ConsoleLogger — log level, prefix, timestamp, child support"
```

---

## Task 9: Rewrite `ConsoleLoggerFeature`

**Files:**
- Modify: `packages/tools-common/src/features/Logger/feature.ts`
- Modify: `packages/tools-common/src/features/Logger/index.ts`

- [ ] **Step 1: Rewrite `feature.ts`**

```ts
import { createFeature } from "../../core/index.ts";
import { ConsoleLogger } from "./ConsoleLogger.ts";

/**
 * Registers ConsoleLogger as the Logger implementation.
 * Optionally pair with ConsoleLoggerConfig to override defaults.
 */
export const ConsoleLoggerFeature = createFeature({
    name: "Core/ConsoleLoggerFeature",
    register(container) {
        container.register(ConsoleLogger).inSingletonScope();
    }
});
```

- [ ] **Step 2: Update `index.ts`**

```ts
export { Logger } from "./abstractions/Logger.ts";
export { ConsoleLoggerConfig } from "./abstractions/ConsoleLoggerConfig.ts";
export { ConsoleLoggerFeature } from "./feature.ts";
```

- [ ] **Step 3: Commit**
```bash
git add packages/tools-common/src/features/Logger/feature.ts packages/tools-common/src/features/Logger/index.ts
git commit -m "feat: ConsoleLoggerFeature — delegates config to optional ConsoleLoggerConfig"
```

---

## Task 10: Remove PinoLogger from `tools-common`

**Files:**
- Delete: `packages/tools-common/src/features/Logger/PinoLogger.ts`

- [ ] **Step 1: Delete the file**
```bash
git rm packages/tools-common/src/features/Logger/PinoLogger.ts
```

- [ ] **Step 2: Commit**
```bash
git commit -m "chore: remove PinoLogger from tools-common — moves to tools-node"
```

---

## Task 11: PinoLogger in `tools-node`

**Files:**
- Create: `packages/tools-node/src/features/PinoLogger/abstractions/PinoLoggerConfig.ts`
- Create: `packages/tools-node/src/features/PinoLogger/abstractions/index.ts`
- Create: `packages/tools-node/src/features/PinoLogger/__tests__/PinoLogger.test.ts`
- Create: `packages/tools-node/src/features/PinoLogger/PinoLogger.ts`
- Create: `packages/tools-node/src/features/PinoLogger/feature.ts`
- Create: `packages/tools-node/src/features/PinoLogger/index.ts`

- [ ] **Step 1: Create `abstractions/PinoLoggerConfig.ts`**

```ts
import { createAbstraction } from "@webiny/tools-common";

/**
 * Configuration shape for PinoLogger.
 * All fields are optional — PinoLogger defaults to info level + pretty transport.
 */
export type PinoLoggerConfigData = {
    /** Minimum log level. Default: "info". */
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal";
    /**
     * Output transport.
     * - "pretty": human-readable coloured output (default, good for development)
     * - "json": compact JSON line per message (good for structured log pipelines)
     *
     * File transport is intentionally omitted — provide a custom Logger implementation
     * if file logging is needed (e.g. Lambda environments where file logging is useless).
     */
    transport?: "pretty" | "json";
};

interface IPinoLoggerConfig {
    getConfig(): PinoLoggerConfigData;
}

export const PinoLoggerConfig = createAbstraction<IPinoLoggerConfig>("Node/PinoLoggerConfig");

export namespace PinoLoggerConfig {
    export type Interface = IPinoLoggerConfig;
    export type Config = PinoLoggerConfigData;
}
```

- [ ] **Step 2: Create `abstractions/index.ts`**

```ts
export { PinoLoggerConfig } from "./PinoLoggerConfig.ts";
```

- [ ] **Step 3: Write failing tests**

Create `packages/tools-node/src/features/PinoLogger/__tests__/PinoLogger.test.ts`:
```ts
import { Container } from "@webiny/di";
import { describe, it, expect } from "vitest";
import { PinoLogger } from "../PinoLogger.ts";
import { Logger } from "@webiny/tools-common";
import { PinoLoggerConfig } from "../abstractions/PinoLoggerConfig.ts";

function makeContainer(config?: PinoLoggerConfig.Config): Logger.Interface {
    const container = new Container();
    if (config !== undefined) {
        container.registerInstance(PinoLoggerConfig, { getConfig: () => config });
    }
    container.register(PinoLogger).inSingletonScope();
    return container.resolve(Logger);
}

describe("PinoLogger", () => {
    it("constructs without config (defaults to info + pretty)", () => {
        expect(() => makeContainer()).not.toThrow();
    });

    it("constructs with explicit logLevel and transport", () => {
        expect(() => makeContainer({ logLevel: "debug", transport: "json" })).not.toThrow();
    });

    it("child() returns a Logger.Interface instance", () => {
        const logger = makeContainer();
        const child = logger.child("Worker");
        expect(child).toBeDefined();
        expect(typeof child.info).toBe("function");
    });

    it("child logger does not throw when logging", () => {
        const logger = makeContainer({ transport: "json", logLevel: "info" });
        const child = logger.child("DB");
        expect(() => child.info("query executed")).not.toThrow();
    });
});
```

- [ ] **Step 4: Run tests — expect failure**
```bash
cd packages/tools-node && yarn test
```
Expected: FAIL — `Cannot find module '../PinoLogger.ts'`

- [ ] **Step 5: Create `PinoLogger.ts`**

No file transport. `PinoLoggerImpl` is private. `child()` reuses the parent pino instance with a prefix wrapper — no new pino logger created per child.

Note: When spreading `args` into pino methods, use `unknown[]` cast to avoid overload resolution issues.

```ts
import pino from "pino";
import pretty from "pino-pretty";
import { Writable } from "node:stream";
import { Logger } from "@webiny/tools-common";
import { PinoLoggerConfig } from "./abstractions/PinoLoggerConfig.ts";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

type JsonLogType = "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_TO_TYPE: Record<number, JsonLogType> = {
    20: "debug",
    30: "info",
    40: "warn",
    50: "error",
    60: "fatal"
};

const createJsonDestination = (): Writable => {
    return new Writable({
        write(chunk, _enc, cb) {
            try {
                const entry = JSON.parse(chunk.toString()) as { level: number; msg: string };
                const type: JsonLogType = LEVEL_TO_TYPE[entry.level] ?? "info";
                process.stdout.write(JSON.stringify({ type, message: entry.msg }) + "\n");
            } catch {
                // ignore malformed lines
            }
            cb();
        }
    });
};

const createPrettyDestination = (): Writable => {
    return pretty({
        colorize: true,
        customColors: "fatal:red,error:red,warn:yellow,info:blue,debug:gray",
        ignore: "pid,hostname,time",
        messageFormat: "{msg}"
    });
};

/** Pino-based logger. Registered under the Logger abstraction by PinoLoggerFeature. */
class PinoLoggerImpl implements Logger.Interface {
    private readonly pinoLogger: pino.Logger;
    private readonly resolvedConfig: Required<PinoLoggerConfig.Config>;
    private readonly prefix: string;

    public constructor(configProvider?: PinoLoggerConfig.Interface, prefix?: string) {
        const cfg = configProvider?.getConfig();
        this.resolvedConfig = {
            logLevel: cfg?.logLevel ?? "info",
            transport: cfg?.transport ?? "pretty"
        };
        this.prefix = prefix ?? "";

        const stream =
            this.resolvedConfig.transport === "json"
                ? createJsonDestination()
                : createPrettyDestination();

        this.pinoLogger = pino({ level: this.resolvedConfig.logLevel }, stream);
    }

    public debug(message: string, ...args: unknown[]): void {
        this.pinoLogger.debug(this.prefix + message, ...(args as unknown[]));
    }

    public info(message: string, ...args: unknown[]): void {
        this.pinoLogger.info(this.prefix + message, ...(args as unknown[]));
    }

    public warn(message: string, ...args: unknown[]): void {
        this.pinoLogger.warn(this.prefix + message, ...(args as unknown[]));
    }

    public error(message: string, ...args: unknown[]): void {
        this.pinoLogger.error(this.prefix + message, ...(args as unknown[]));
    }

    public fatal(message: string, ...args: unknown[]): void {
        this.pinoLogger.fatal(this.prefix + message, ...(args as unknown[]));
    }

    public child(prefix: string): Logger.Interface {
        const combined = this.prefix ? `${this.prefix}${prefix}` : prefix;
        // Wrap resolved config so the child shares the same settings.
        const configWrapper: PinoLoggerConfig.Interface = {
            getConfig: () => this.resolvedConfig
        };
        return new PinoLoggerImpl(configWrapper, combined);
    }
}

/**
 * Pino-based Logger implementation for Node.js.
 * Register via PinoLoggerFeature. Optionally pair with PinoLoggerConfig
 * to configure log level and transport.
 */
export const PinoLogger = Logger.createImplementation({
    implementation: PinoLoggerImpl,
    dependencies: [[PinoLoggerConfig, { optional: true }]]
});
```

- [ ] **Step 6: Create `feature.ts`**

```ts
import { createFeature } from "@webiny/tools-common";
import { PinoLogger } from "./PinoLogger.ts";

/**
 * Registers PinoLogger as the Logger implementation.
 * Optionally pair with PinoLoggerConfig to override defaults (info + pretty).
 */
export const PinoLoggerFeature = createFeature({
    name: "Node/PinoLoggerFeature",
    register(container) {
        container.register(PinoLogger).inSingletonScope();
    }
});
```

- [ ] **Step 7: Create `index.ts`**

```ts
export { PinoLoggerConfig } from "./abstractions/PinoLoggerConfig.ts";
export { PinoLoggerFeature } from "./feature.ts";
```

- [ ] **Step 8: Run tests — expect pass**
```bash
cd packages/tools-node && yarn test
```
Expected: all PinoLogger tests PASS.

- [ ] **Step 9: Commit**
```bash
git add packages/tools-node/src/features/PinoLogger/
git commit -m "feat: PinoLogger and PinoLoggerFeature in tools-node"
```

---

## Task 12: Fix imports in `tools-node` + barrel export

**Files:**
- Modify: `packages/tools-node/src/features/FileTool/abstractions/FileTool.ts`
- Modify: `packages/tools-node/src/features/FileTool/feature.ts`
- Modify: `packages/tools-node/src/features/FileTool/FileTool.ts`
- Modify: `packages/tools-node/src/features/FileTool/index.ts`
- Modify: `packages/tools-node/src/features/DirectoryTool/feature.ts`
- Modify: `packages/tools-node/src/features/DirectoryTool/DirectoryTool.ts`
- Create: `packages/tools-node/src/index.ts`

- [ ] **Step 1: Fix `FileTool/abstractions/FileTool.ts`**

```ts
import { createAbstraction } from "@webiny/tools-common";

interface IFileTool {
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

- [ ] **Step 2: Fix `FileTool/feature.ts`**

```ts
import { createFeature } from "@webiny/tools-common";
import { FileTool } from "./FileTool.ts";

export const FileToolFeature = createFeature({
    name: "Core/FileToolFeature",
    register(container) {
        container.register(FileTool).inSingletonScope();
    }
});
```

- [ ] **Step 3: Fix `FileTool/FileTool.ts` — Logger import**

```ts
import { existsSync, readFileSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import { Logger } from "@webiny/tools-common";
import { FileTool as FileToolAbstraction } from "./abstractions/FileTool.ts";
import { DirectoryTool } from "../DirectoryTool/abstractions/DirectoryTool.ts";

class FileToolImpl implements FileToolAbstraction.Interface {
    public constructor(
        private readonly logger: Logger.Interface,
        private readonly directoryTool: DirectoryTool.Interface
    ) {}

    public exists(path: string): boolean {
        return existsSync(path);
    }

    public readFile(path: string): string | null {
        if (!existsSync(path)) {
            this.logger.warn(`File not found: "${path}"`);
            return null;
        }
        return readFileSync(path, "utf-8");
    }

    public readFileOrThrow(path: string): string {
        if (!existsSync(path)) {
            throw new Error(`File not found: "${path}"`);
        }
        return readFileSync(path, "utf-8");
    }

    public writeFile(path: string, content: string): void {
        try {
            this.directoryTool.create(dirname(path));
            writeFileSync(path, content, "utf-8");
        } catch (error) {
            this.logger.warn(`Failed to write file "${path}": ${error}`);
        }
    }

    public writeFileOrThrow(path: string, content: string): void {
        this.directoryTool.create(dirname(path));
        writeFileSync(path, content, "utf-8");
    }

    public remove(path: string): void {
        rmSync(path, { force: true });
    }

    public copy(source: string, target: string): void {
        if (!existsSync(source)) {
            this.logger.warn(`Source file not found: "${source}"`);
            return;
        }
        this.directoryTool.create(dirname(target));
        copyFileSync(source, target);
    }

    public copyOrThrow(source: string, target: string): void {
        if (!existsSync(source)) {
            throw new Error(`Source file not found: "${source}"`);
        }
        this.directoryTool.create(dirname(target));
        copyFileSync(source, target);
    }
}

export const FileTool = FileToolAbstraction.createImplementation({
    implementation: FileToolImpl,
    dependencies: [Logger, DirectoryTool]
});
```

- [ ] **Step 4: Verify `FileTool/index.ts` exports both abstraction and feature**

```ts
export { FileTool } from "./abstractions/index.ts";
export { FileToolFeature } from "./feature.ts";
```

- [ ] **Step 5: Fix `DirectoryTool/feature.ts`**

```ts
import { createFeature } from "@webiny/tools-common";
import { DirectoryTool } from "./DirectoryTool.ts";

export const DirectoryToolFeature = createFeature({
    name: "Core/DirectoryToolFeature",
    register(container) {
        container.register(DirectoryTool).inSingletonScope();
    }
});
```

- [ ] **Step 6: Fix `DirectoryTool/DirectoryTool.ts` — Logger import**

```ts
import {
    existsSync,
    mkdirSync,
    readdirSync,
    rmSync,
    cpSync,
    chmodSync,
    accessSync,
    constants
} from "node:fs";
import { dirname } from "node:path";
import { Logger } from "@webiny/tools-common";
import { DirectoryTool as DirectoryToolAbstraction } from "./abstractions/DirectoryTool.ts";

class DirectoryToolImpl implements DirectoryToolAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public exists(path: string): boolean {
        return existsSync(path);
    }

    public create(path: string): void {
        try {
            if (existsSync(path)) {
                try {
                    accessSync(path, constants.W_OK);
                } catch {
                    chmodSync(path, 0o755);
                }
                return;
            }
            mkdirSync(path, { recursive: true, mode: 0o755 });
        } catch (error) {
            this.logger.warn(`Failed to create directory "${path}": ${error}`);
        }
    }

    public readDir(path: string): string[] | null {
        if (!existsSync(path)) {
            this.logger.warn(`Directory not found: "${path}"`);
            return null;
        }
        return readdirSync(path);
    }

    public readDirOrThrow(path: string): string[] {
        if (!existsSync(path)) {
            throw new Error(`Directory not found: "${path}"`);
        }
        return readdirSync(path);
    }

    public remove(path: string): void {
        rmSync(path, { recursive: true, force: true });
    }

    public copy(source: string, target: string): void {
        if (!existsSync(source)) {
            this.logger.warn(`Source directory not found: "${source}"`);
            return;
        }
        this.create(dirname(target));
        cpSync(source, target, { recursive: true });
    }

    public copyOrThrow(source: string, target: string): void {
        if (!existsSync(source)) {
            throw new Error(`Source directory not found: "${source}"`);
        }
        this.create(dirname(target));
        cpSync(source, target, { recursive: true });
    }
}

export const DirectoryTool = DirectoryToolAbstraction.createImplementation({
    implementation: DirectoryToolImpl,
    dependencies: [Logger]
});
```

- [ ] **Step 7: Create `packages/tools-node/src/index.ts`**

```ts
export { FileTool, FileToolFeature } from "./features/FileTool/index.ts";
export { DirectoryTool, DirectoryToolFeature } from "./features/DirectoryTool/index.ts";
export { PinoLoggerConfig, PinoLoggerFeature } from "./features/PinoLogger/index.ts";
```

- [ ] **Step 8: Commit**
```bash
git add packages/tools-node/
git commit -m "fix: tools-node — remove ~/base/ alias, Logger from @webiny/tools-common, barrel export"
```

---

## Task 13: Update `docs/webiny-di-guide.md`

The guide has examples using `~/base/createAbstraction.ts` and `~/base/createFeature.ts`. Update all such references to `@webiny/tools-common`.

- [ ] **Step 1: Replace all `~/base/` import paths in the guide**

In `docs/webiny-di-guide.md`, update every occurrence of:
```ts
import { createAbstraction } from "~/base/createAbstraction.ts";
import { createFeature } from "~/base/createFeature.ts";
import { createAbstraction } from "~/base/index.ts";
```
To:
```ts
import { createAbstraction } from "@webiny/tools-common";
import { createFeature } from "@webiny/tools-common";
```

Also update the prose description in §3 that refers to `src/base/createAbstraction.ts` and `src/base/createFeature.ts` — these files now live in `packages/tools-common/src/core/` and are exported from `@webiny/tools-common`.

- [ ] **Step 2: Commit**
```bash
git add docs/webiny-di-guide.md
git commit -m "docs: update webiny-di-guide import paths — ~/base/ → @webiny/tools-common"
```

---

## Task 14: Full build + test verification

- [ ] **Step 1: Install any new deps**
```bash
yarn install
```

- [ ] **Step 2: Build all packages**
```bash
yarn build
```
Expected: all three packages compile with no errors. `dist/` directories appear in each package.

- [ ] **Step 3: Run all tests**
```bash
yarn test
```
Expected: all tests pass across all packages.

- [ ] **Step 4: Run with coverage**
```bash
yarn test:coverage
```
Expected: coverage report generated for `tools-common` and `tools-node`.

- [ ] **Step 5: Verify dist structure**
```bash
ls packages/tools-common/dist/ packages/tools-node/dist/ packages/tools-browser/dist/
```
Expected: `index.js`, `index.d.ts` present in each `dist/`.

- [ ] **Step 6: Final commit**
```bash
git add .
git commit -m "chore: verify full monorepo build and tests pass"
```

---

## Task 15: Update `AGENTS.md`

- [ ] **Step 1: Rewrite the AGENTS.md to reflect the completed state**

Key sections to update:
- Remove "Current Migration State" section — replace with "Structure is complete"
- Update monorepo structure diagram to show `features/` subdirectory pattern
- Update `@webiny/tools-common` package contents to include `Logger`, `ConsoleLogger`, `ConsoleLoggerConfig`
- Update `@webiny/tools-node` to include `PinoLogger`, `PinoLoggerFeature`, `PinoLoggerConfig`
- Remove reference to `~/` path alias — it no longer exists
- Remove the "No comments" convention — comments and JSDoc are preferred (agents read the code)
- Add note about `types: []` in tools-common (platform-agnostic constraint enforced at type level)
- Add note about DI optional deps pattern: `[Abstraction, { optional: true }]`
- Update the code pattern section to reflect `features/` subdirectory layout

- [ ] **Step 2: Commit**
```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md to reflect completed monorepo structure"
```
