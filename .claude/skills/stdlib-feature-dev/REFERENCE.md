# stdlib Feature Dev — Reference

Code templates and conventions for `@webiny/stdlib` feature development. `AGENTS.md` is the source of truth — this file provides quick-reference templates.

---

## Abstraction

File: `src/<slice>/features/<ToolName>/abstractions/<ToolName>.ts`

```ts
import { createAbstraction } from "@webiny/stdlib";
// For node/browser slices, use the path alias instead:
// import { createAbstraction } from "~/common/index.js";

/**
 * One-line description of what this tool does.
 */
export interface I<ToolName> {
  /** JSDoc on every method — agents and IDE tooling read these. */
  methodName(param: string): Result<string, SomeError>;
}

export const <ToolName> = createAbstraction<I<ToolName>>("Domain/<ToolName>");

export namespace <ToolName> {
  export type Interface = I<ToolName>;
}
```

Barrel at `abstractions/index.ts`:

```ts
export { <ToolName> } from "./<ToolName>.js";
```

### DI token naming

- Common: `"Core/<ToolName>"` prefix
- Node: `"Node/<ToolName>"` prefix
- Browser: `"Browser/<ToolName>"` prefix
- Config abstractions: `"Domain/<ToolName>Config"`

---

## Implementation

File: `src/<slice>/features/<ToolName>/<ToolName>.ts`

```ts
import { <ToolName> as <ToolName>Abstraction } from "./abstractions/<ToolName>.js";
// Cross-slice imports (node/browser only):
import { Logger } from "~/common/index.js";
// Same-slice imports:
import { OtherTool } from "../OtherTool/abstractions/OtherTool.js";

class <ToolName>Impl implements <ToolName>Abstraction.Interface {
  public constructor(
    private readonly logger: Logger.Interface,
    private readonly otherTool: OtherTool.Interface
  ) {}

  public methodName(param: string): Result<string, SomeError> {
    // implementation
  }
}

export const <ToolName> = <ToolName>Abstraction.createImplementation({
  implementation: <ToolName>Impl,
  dependencies: [Logger, OtherTool] // ORDER MUST MATCH CONSTRUCTOR PARAMS
});
```

### Optional dependencies

```ts
dependencies: [[SomeConfig, { optional: true }]];
// Constructor receives: SomeConfig.Interface | undefined
```

### Import rules

| Location     | Extension | Example                                      |
| ------------ | --------- | -------------------------------------------- |
| `src/**`     | `.js`     | `import { Foo } from "./Foo.js"`             |
| Cross-slice  | `.js`     | `import { Logger } from "~/common/index.js"` |
| `scripts/**` | `.ts`     | `import { run } from "./index.ts"`           |

---

## Feature

File: `src/<slice>/features/<ToolName>/feature.ts`

```ts
import { createFeature } from "@webiny/stdlib";
// For node/browser slices:
// import { createFeature } from "~/common/index.js";
import { <ToolName> } from "./<ToolName>.js";

export const <ToolName>Feature = createFeature({
  name: "Domain/<ToolName>Feature",
  register(container) {
    container.register(<ToolName>).inSingletonScope();
  }
});
```

### Parameterised feature

```ts
interface <ToolName>FeatureParams {
  someOption: string;
}

export const <ToolName>Feature = createFeature<<ToolName>FeatureParams>({
  name: "Domain/<ToolName>Feature",
  register(container, params) {
    container.registerInstance(SomeConfig, params!.someOption);
    container.register(<ToolName>).inSingletonScope();
  }
});
```

---

## Feature index

File: `src/<slice>/features/<ToolName>/index.ts`

```ts
export { <ToolName> } from "./abstractions/index.js";
export { <ToolName>Feature } from "./feature.js";
```

Never export the implementation class. Export config abstractions and error types if they are part of the public API.

---

## Slice barrel

Add to `src/<slice>/index.ts`:

```ts
export { <ToolName>, <ToolName>Feature } from "./features/<ToolName>/index.js";
```

---

## Testing

File: `__tests__/<slice>/<ToolName>.test.ts`

### Node test

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Container } from "@webiny/di";
import { PinoLoggerConfig, PinoLoggerFeature } from "@webiny/stdlib/node";
import { <ToolName>, <ToolName>Feature } from "@webiny/stdlib/node";
// Add other feature dependencies as needed

function makeContainer(): Container {
  const container = new Container();
  container.registerInstance(PinoLoggerConfig, {
    getConfig: () => ({ logLevel: "error" as const, transport: "json" as const })
  });
  PinoLoggerFeature.register(container);
  // Register dependencies before the feature under test
  <ToolName>Feature.register(container);
  return container;
}

describe("<ToolName>", () => {
  let tool: <ToolName>.Interface;

  beforeEach(() => {
    tool = makeContainer().resolve(<ToolName>);
  });

  it("should do the happy path", () => {
    // test
  });

  it("should handle the error path", () => {
    // test
  });
});
```

### Common test (no Logger or use ConsoleLogger)

```ts
import { Container } from "@webiny/di";
import { ConsoleLoggerConfig, ConsoleLoggerFeature } from "@webiny/stdlib";

function makeContainer(): Container {
  const container = new Container();
  container.registerInstance(ConsoleLoggerConfig, {
    getConfig: () => ({ logLevel: "error" as const })
  });
  ConsoleLoggerFeature.register(container);
  return container;
}
```

### Browser test

Add the environment directive at the top of the file:

```ts
// @vitest-environment happy-dom
```

### File system tests

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

### happy-dom spy cleanup

`vi.restoreAllMocks()` does not reliably clean up `vi.spyOn` on happy-dom objects. Always call `spy.mockRestore()` explicitly in a `finally` block.

---

## Feature README

File: `src/<slice>/features/<ToolName>/README.md`

```md
# <ToolName>

One paragraph: what it does and when to reach for it.

## Interface

Brief description of each method (copy JSDoc from abstraction).

## Usage

### DI container wiring

\`\`\`ts
import { Container } from "@webiny/di";
import { <ToolName>, <ToolName>Feature } from "@webiny/stdlib/node";

const container = new Container();
<ToolName>Feature.register(container);
const tool = container.resolve(<ToolName>);
\`\`\`

### Factory function (if applicable)

\`\`\`ts
import { create<ToolName> } from "@webiny/stdlib/node";
const tool = create<ToolName>();
\`\`\`
```

Also update the root `README.md` feature table.

---

## Errors

Subclass `BaseError` for domain errors:

```ts
import { BaseError } from "@webiny/stdlib";
// For node/browser slices:
// import { BaseError } from "~/common/index.js";

class <ToolName>NotFoundError extends BaseError {
  public readonly code = "<TOOL_NAME>_NOT_FOUND" as const;
}

// With typed data payload
class <ToolName>ValidationError extends BaseError<{ field: string }> {
  public readonly code = "<TOOL_NAME>_VALIDATION" as const;
}

// Creating instances — always capture stack
throw new <ToolName>NotFoundError({
  message: "descriptive message",
  stack: new Error().stack ?? ""
});
```

---

## Result types

```ts
import { Result, ResultAsync } from "@webiny/stdlib";

// Sync
function doThing(): Result<string, SomeError> {
  if (bad) return Result.fail(new SomeError({ message: "...", stack: new Error().stack ?? "" }));
  return Result.ok("value");
}

// Async
function doAsyncThing(): ResultAsync<string, SomeError> {
  return ResultAsync.from(async () => {
    // ...
    return Result.ok("value");
  });
}
```

---

## Error export conventions

### Where error files live

Errors that are part of a feature's public API live in the feature's `abstractions/` folder alongside the abstraction they relate to. If a feature has multiple error types, group them in `abstractions/errors.ts` and re-export from `abstractions/index.ts`.

```
src/node/features/FileTool/
├── abstractions/
│   ├── FileTool.ts          # interface + token
│   ├── errors.ts            # FileNotFoundError, FileWriteError, etc.
│   └── index.ts             # re-exports FileTool + errors
├── FileTool.ts
├── feature.ts
└── index.ts                 # re-exports abstraction token, feature, AND public errors
```

### When to export errors

- **Export** errors that callers need to catch or discriminate on (e.g. `FileNotFoundError` — callers may want to handle "not found" differently from "permission denied").
- **Don't export** internal implementation errors that callers never see (e.g. an error used only inside `flatMap` chains within the implementation).

Feature `index.ts` with errors:

```ts
export { FileTool } from "./abstractions/index.js";
export { FileNotFoundError, FileWriteError } from "./abstractions/index.js";
export { FileToolFeature } from "./feature.js";
```

Slice barrel mirrors the same exports.

---

## Reference implementations

When in doubt, read these real features for guidance. They are well-structured and follow all conventions.

### Node slice — good examples

| Feature                 | Path                                     | Why it's useful                                                             |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| **FileTool**            | `src/node/features/FileTool/`            | Clean 4-file layout, Logger dependency, error handling with Result types    |
| **PinoLogger**          | `src/node/features/PinoLogger/`          | Optional config abstraction (`PinoLoggerConfig`), cross-slice Logger import |
| **NdJsonReaderTool**    | `src/node/features/NdJsonReaderTool/`    | Multiple dependencies, generator-based API, `ReadStreamFactory` dependency  |
| **PackageJsonFileTool** | `src/node/features/PackageJsonFileTool/` | Zod validation, value object pattern, multiple dependency features          |

### Common slice — good examples

| Feature                    | Path                          | Why it's useful                                                                       |
| -------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| **Logger** (ConsoleLogger) | `src/common/features/Logger/` | Optional config pattern without node dependencies                                     |
| **Cache**                  | `src/common/features/Cache/`  | Two abstractions (sync + async) in one feature folder, `byPrefix` scoped view pattern |

### Browser slice — good examples

| Feature               | Path                                      | Why it's useful                                                          |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| **LocalStorageCache** | `src/browser/features/LocalStorageCache/` | Browser-specific errors, `// @vitest-environment happy-dom` test pattern |

Read the abstraction file first, then the implementation, then the test. That order matches the development workflow.

---

## Common mistakes checklist

Before running the pre-commit chain, verify you haven't hit these:

- [ ] **Missing `namespace` export** — Every abstraction must have `export namespace <ToolName> { export type Interface = I<ToolName> }` alongside the token. Without it, consumers can't write `<ToolName>.Interface`.
- [ ] **Wrong `dependencies` array order** — Must exactly match constructor parameter order. `dependencies: [Logger, FileTool]` means the constructor is `constructor(logger, fileTool)`, not the reverse.
- [ ] **Missing `.js` extension** — All relative imports under `src/` must use `.js`. Writing `"./Foo"` or `"./Foo.ts"` will fail at build time.
- [ ] **Forgot `inSingletonScope()`** — Feature registrations should almost always use `.inSingletonScope()`. Without it, every `resolve()` creates a new instance.
- [ ] **Exported the implementation class** — The feature `index.ts` should export the abstraction token and the feature, never the `*Impl` class directly.
- [ ] **Wrong cross-slice import** — Node/browser slices import from common via `~/common/index.js`, not `@webiny/stdlib` or a relative path climbing out of the slice.
- [ ] **Missing `as const` on error code** — `public readonly code = "SOME_CODE" as const` — the `as const` is required for literal type narrowing.
- [ ] **Forgot `stack` in BaseError constructor** — Always pass `stack: new Error().stack ?? ""` when creating error instances.
- [ ] **Modified an existing test** — New features must pass all existing tests as-is. If one fails, your feature has a regression.
- [ ] **Missing feature README** — Every feature folder needs a `README.md`. Also update the root `README.md` table.
- [ ] **Missing slice barrel export** — After creating the feature, add re-exports to `src/<slice>/index.ts`.

---

## Pre-commit chain

Run all seven steps and loop until clean:

```sh
yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Never use `--no-verify` or skip hooks. Never push, merge, or pull.
