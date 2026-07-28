---
name: testing-patterns
description: Testing conventions for @webiny/stdlib — container setup, tmpdir patterns, browser environment directives.
context: guides
---

# Testing Patterns in @webiny/stdlib

Tests live in `__tests__/` at the repo root (outside `src/`), organised into `__tests__/node/` and `__tests__/browser/`. A single `vitest.config.ts` at the repo root handles both test discovery and coverage — there is no workspace file.

## Container setup — `makeContainer()`

Every test file that tests a tool creates a `makeContainer()` helper. Silence logs during tests by registering a config instance with `logLevel: "error"` before registering the logger feature, then register the features under test.

```ts
import { Container } from "@webiny/di";
import { FileTool, FileToolFeature } from "../features/FileTool/index.js";
import { DirectoryToolFeature } from "../features/DirectoryTool/index.js";
import { PinoLoggerConfig, PinoLoggerFeature } from "@webiny/stdlib/node";

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

For stdlib common tests (testing with `ConsoleLogger` instead of `PinoLogger`), use `ConsoleLoggerConfig` and `ConsoleLoggerFeature` from `@webiny/stdlib` instead.

Resolve instances in `beforeEach` so each test gets a fresh container — this avoids singleton state bleeding across tests:

```ts
let tool: FileTool.Interface;

beforeEach(() => {
  tool = makeContainer().resolve(FileTool);
});
```

**Rule**: never construct an implementation class directly in a test. Always resolve via the container, so the test exercises the same wiring as production.

## tmpdir cleanup

Use Node's `tmpdir()` for temporary directories in filesystem tests. Always clean up in `afterEach`:

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

## Browser environment directive

`vitest.config.ts` does NOT set a global `environment`. Browser tests opt into the happy-dom environment on a per-file basis using a directive at the very top of the test file:

```ts
// __tests__/browser/LocalStorageCache.test.ts
// @vitest-environment happy-dom
import { ... } from "@webiny/stdlib/browser";
```

Node tests need no environment directive — Vitest defaults to the Node environment.

**happy-dom spy cleanup**: `vi.restoreAllMocks()` does not reliably clean up `vi.spyOn` calls on happy-dom objects (e.g. `localStorage.setItem`). Always call `spy.mockRestore()` explicitly in a `finally` block when spying on happy-dom storage.

## Type-checking tests

Test files must be type-correct. `yarn typecheck` covers `__tests__/` via each slice's check config (`tsconfig.check.common.json`, `tsconfig.check.node.json`, `tsconfig.check.browser.json`). Type errors in tests are caught before any test runs.

## Coverage

`yarn test:coverage` runs the full suite with v8 coverage in one invocation, using the coverage block in `vitest.config.ts`:

```ts
coverage: {
  provider: "v8",
  include: ["src/**/*.ts"],
  exclude: ["**/__tests__/**", "**/index.ts", "**/abstractions/**"]
}
```

Barrel files (`index.ts`) and abstraction files are excluded from coverage since they contain no executable logic worth measuring — only implementation and feature files are covered.

## Running tests

```sh
yarn test            # all tests
yarn test:coverage   # with v8 coverage
```

Both must pass as part of the pre-commit chain before committing:

```sh
yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

See the `adding-a-feature` skill for where writing tests fits into the overall workflow when introducing a new tool.
