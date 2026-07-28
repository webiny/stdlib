---
name: di-patterns
description: How dependency injection works in @webiny/stdlib — abstractions, implementations, features, and container wiring.
context: guides
---

# DI Patterns in @webiny/stdlib

Everything in this repo is built on constructor injection via `@webiny/di`. Tool code never uses `@webiny/di` directly — it always goes through the `createAbstraction` / `createFeature` wrappers exported from `@webiny/stdlib`.

## Mental model

Every service lives behind an **abstraction** — a typed token. Implementations are classes bound to that token. Consumers resolve the abstraction, never the implementation:

```ts
import { createAbstraction } from "@webiny/stdlib";

interface IFileTool {
  readFile(path: string): string | null;
}

export const FileTool = createAbstraction<IFileTool>("Core/FileTool");

export namespace FileTool {
  export type Interface = IFileTool;
}
```

The `namespace FileTool { export type Interface }` pattern lets consumers write `FileTool.Interface` as the type and `FileTool` as the DI token — one import, both concepts.

The token name (`"Core/FileTool"`) follows a `"Domain/ToolName"` format: `"Core/"` prefix for common utils, `"Node/"` prefix for Node-specific ones. It's used only for debug/error messages — uniqueness comes from an internal symbol, not the string.

## createAbstraction

```ts
const FileTool = createAbstraction<IFileTool>("Core/FileTool");
```

Creates the DI token. Always paired with the `namespace ... { export type Interface }` block described above.

## createImplementation

Attaches a concrete class to an abstraction token:

```ts
import { Logger } from "~/common/index.js";
import { FileTool as FileToolAbstraction } from "./abstractions/FileTool.js";
import { DirectoryTool } from "../DirectoryTool/abstractions/DirectoryTool.js";

class FileToolImpl implements FileToolAbstraction.Interface {
  public constructor(
    private readonly logger: Logger.Interface,
    private readonly directoryTool: DirectoryTool.Interface
  ) {}
  // ...
}

export const FileTool = FileToolAbstraction.createImplementation({
  implementation: FileToolImpl,
  dependencies: [Logger, DirectoryTool] // order MUST match constructor params exactly
});
```

Note the local rename alias (`FileTool as FileToolAbstraction`) — it avoids a name collision, since the implementation file re-exports its own `const FileTool` (the `createImplementation` output). Consumers never import from this file directly; only `feature.ts` does.

**The `dependencies` array is positional.** It must match the constructor parameter order exactly. TypeScript statically enforces this — a mismatched array is a compile error.

### Optional dependencies

Wrap the token in a tuple with `{ optional: true }`. The container passes `undefined` if nothing is registered for that token:

```ts
export const PinoLogger = Logger.createImplementation({
  implementation: PinoLoggerImpl,
  dependencies: [[PinoLoggerConfig, { optional: true }]]
});
```

The constructor receives `PinoLoggerConfig.Interface | undefined` and must handle both cases. This is how `PinoLoggerFeature` and `ConsoleLoggerFeature` accept configuration without a required registration — callers who don't care about config just skip registering `PinoLoggerConfig`.

## createFeature

A "feature" bundles related registrations behind one name — the composition unit that bootstrap code calls instead of registering individual tokens.

Most features take no parameters:

```ts
import { createFeature } from "@webiny/stdlib";
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

Call it as `MyFeature.register(container, { logLevel: "error" })`. The `params!` non-null assertion is required because `createFeature<TRegister>` types the parameter as `TRegister | undefined` to support both the parameterless and parameterized calling forms.

Features compose — a larger feature can call other features from its own `register`, keeping the bootstrap/composition root tidy.

## Container

Used in application bootstrap and in tests to wire everything up:

```ts
import { Container } from "@webiny/di";

const container = new Container();
container.register(FileTool).inSingletonScope(); // class-based registration
container.registerInstance(Logger, myLoggerInstance); // pre-created instance
const tool = container.resolve(FileTool); // returns FileTool.Interface
```

- `register(ImplClass)` — registers an implementation class produced by `createImplementation`. Returns a builder; chain `.inSingletonScope()` for singleton lifetime. Default is transient (a new instance per `resolve`).
- `registerInstance(abstraction, value)` — registers a pre-built value. Always singleton in effect.
- `resolve(abstraction)` — returns a single instance. Throws if nothing is registered for the token.

## Singleton scope

**Always register utils as `.inSingletonScope()` unless there's a specific reason not to.** Without it, the container creates a new instance on every `resolve` call, which is almost never what you want for stateless services like loggers, caches, and filesystem tools.

```ts
// Correct — one instance per container
container.register(FileTool).inSingletonScope();

// Wrong for a stateless tool — fresh instance every resolve
container.register(FileTool);
```

## The four-file layout

Every tool/service in this repo follows the same shape:

1. **`abstractions/ToolName.ts`** — interface, `createAbstraction` token, `namespace ToolName { export type Interface }`.
2. **`ToolName.ts`** — implementation class + `createImplementation`, using the local rename alias.
3. **`feature.ts`** — `createFeature` call that registers the implementation.
4. **`index.ts`** — re-exports the abstraction token and the feature. Never re-exports the implementation class or the `createImplementation` output — those stay internal to the feature folder.

See the `adding-a-feature` skill for the full step-by-step when creating a new one.
