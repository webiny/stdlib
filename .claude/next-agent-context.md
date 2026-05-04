# Next Agent Context

Read this before doing anything. It contains everything you need to execute the implementation plan.

---

## What this is

A Yarn 4 monorepo migration for `@webiny/tools-common`, `@webiny/tools-node`, `@webiny/tools-browser`. The design has been fully decided through two grilling sessions. The implementation plan is at:

```
docs/superpowers/plans/2026-04-30-monorepo-setup.md
```

Execute that plan task-by-task using `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

---

## Current state of the repo (before any plan task runs)

### What exists and is correct

- `packages/tools-common/src/core/` — BaseError, Result, ResultAsync, createAbstraction, createFeature (all correct, just need minor fixes per Task 1)
- `packages/tools-node/src/features/FileTool/` — implementation present but imports are broken (stale `~/base/` and `../Logger/` paths)
- `packages/tools-node/src/features/DirectoryTool/` — same import issues
- `packages/tools-common/src/features/Logger/abstractions/Logger.ts` — exists but has `done()` and uses `~/base/` import
- `packages/tools-common/src/features/Logger/PinoLogger.ts` — exists, must be DELETED (moves to tools-node)
- `docs/webiny-di-guide.md` — exists, needs import path updates

### What does NOT exist yet (must be created by the plan)

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
- `packages/tools-node/src/features/PinoLogger/` (entire directory)
- `packages/tools-browser/` (entire package — skeleton)
- `vitest.workspace.ts`

### What needs to be modified

- `package.json` (root) — add `workspaces`, scripts
- `tsconfig.json` (root) — project references, strip old flags
- `packages/tools-common/package.json` — add exports/files/scripts/deps
- `packages/tools-common/src/core/index.ts` — `.js` → `.ts` extensions, add `createFeature`
- `packages/tools-common/src/core/ResultAsync.ts` — `.js` → `.ts` on Result import
- `packages/tools-common/src/core/BaseError.ts` — make `stack` optional
- `packages/tools-common/src/features/Logger/abstractions/Logger.ts` — remove `done()`, fix import, rename token
- `packages/tools-common/src/features/Logger/abstractions/index.ts` — add ConsoleLoggerConfig re-export
- `packages/tools-common/src/features/Logger/feature.ts` — rewrite to use ConsoleLogger
- `packages/tools-common/src/features/Logger/index.ts` — add ConsoleLoggerConfig export
- `packages/tools-node/src/features/FileTool/abstractions/FileTool.ts` — fix import
- `packages/tools-node/src/features/FileTool/feature.ts` — fix import
- `packages/tools-node/src/features/FileTool/FileTool.ts` — fix Logger import
- `packages/tools-node/src/features/FileTool/index.ts` — ensure FileToolFeature is exported
- `packages/tools-node/src/features/DirectoryTool/feature.ts` — fix import
- `packages/tools-node/src/features/DirectoryTool/DirectoryTool.ts` — fix Logger import
- `docs/webiny-di-guide.md` — replace `~/base/` with `@webiny/tools-common`
- `AGENTS.md` — update to reflect completed structure (last task)

---

## Key design decisions (do not deviate from these)

### Versioning

All `package.json` files use `"version": "0.0.0"`. Never bump in source.

### tsconfig structure

- Root `tsconfig.json`: base compiler options only. No `types`, no `rootDir`, no `include`. Has project `references`.
- `tools-common/tsconfig.json`: extends root. Adds `composite`, `rootDir: ./src`, `outDir: ./dist`, **`types: []`** (enforces platform-agnostic constraint at type level).
- `tools-node/tsconfig.json`: extends root. Adds `composite`, `rootDir`, `outDir`, **`types: ["node"]`**, `references: [../tools-common]`.
- `tools-browser/tsconfig.json`: extends root. Adds `composite`, `rootDir`, `outDir`, **`types: []`**, **`lib: ["dom","esnext"]`**, `references: [../tools-common]`.

### Logger split

- `tools-common`: `Logger` abstraction + `ConsoleLogger` + `ConsoleLoggerConfig` abstraction
- `tools-node`: `PinoLogger` + `PinoLoggerFeature` + `PinoLoggerConfig` abstraction
- PinoLogger has NO file transport — users provide their own if needed

### ConsoleLogger.Config (via ConsoleLoggerConfig.Config)

```ts
{
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal"; // default: "debug"
    prefix?: string;
    timestamp?: boolean;                                       // default: false
    formatTimestamp?: (date: Date) => string;                  // default: d => d.toISOString()
}
```

### PinoLogger.Config (via PinoLoggerConfig.Config)

```ts
{
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal"; // default: "info"
    transport?: "pretty" | "json";                             // default: "pretty"
}
```

### DI pattern for optional config

Both loggers use `Logger.createImplementation` with `[ConfigAbstraction, { optional: true }]` in `dependencies`. Constructor receives `ConfigAbstraction.Interface | undefined` and calls `config?.getConfig()`.

### Testing

Tests use a `Container` instance. Never construct implementation classes directly (`new ConsoleLoggerImpl(...)` is wrong). Always `container.register(...).inSingletonScope()` then `container.resolve(Logger)`.

### Import rules

- Within `tools-common`: relative imports (e.g. `"../../core/index.ts"`)
- `tools-node` and `tools-browser` import from `tools-common` via `"@webiny/tools-common"`
- No `~/` path aliases anywhere
- All local imports use `.ts` extensions (not `.js`)

### Comments

JSDoc comments ARE preferred — agents read this code. Do not strip existing JSDoc.

### Dependency versions

- pino: `^10.3.1`
- pino-pretty: `^13.1.3`
- jsdom: `^29.1.1` (tools-browser devDep)
- @types/node: `^25.6.0`
- vitest: `^4.1.5`
- @typescript/native-preview: `beta`

### adio

Only checks that packages declared in `package.json` are used in code and vice versa. No boundary enforcement config needed.

### Known TypeScript gotchas in the plan code

- `LOG_LEVEL_PRIORITY[key]` returns `number | undefined` under `noUncheckedIndexedAccess` even with `Record<LogLevel, number>`. Use `!` non-null assertion.
- PinoLogger args spread: use `...(args as unknown[])` not `Parameters<typeof pino.debug>`.
- `vi.setSystemTime()` requires `vi.useFakeTimers()` first in Vitest 4.

---

## Package dependency graph

```
tools-common   (no workspace deps)
tools-node     → tools-common (workspace:*)
tools-browser  → tools-common (workspace:*)
tools-node and tools-browser do NOT depend on each other
```

---

## DI guide reference

`docs/webiny-di-guide.md` — read this before writing any DI code. Covers optional deps (`[Abstraction, { optional: true }]`), singleton scope, testing with containers, and all conventions.
