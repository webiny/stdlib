---
name: adding-a-feature
description: Step-by-step guide for adding a new tool or service to @webiny/stdlib.
context: guides
---

# Adding a New Tool to @webiny/stdlib

This mirrors the "Step-by-step: Adding a New Tool to an Existing Package" section in the repo's `AGENTS.md`, which is the authoritative source — check there if this drifts.

First decide which slice the tool belongs in, based on its runtime dependencies:

| Uses only JS built-ins / standard lib | → `@webiny/stdlib` root (`src/`) |
| Uses `node:*` APIs or Node-only npm packages | → `@webiny/stdlib/node` (`src/node/`) |
| Uses `window`, `document`, React, browser APIs | → `@webiny/stdlib/browser` (`src/browser/`) |

`src/node/` and `src/browser/` must NOT import from each other. Both may import common code via `~/common/index.js`.

Example below: adding `HttpTool` to `@webiny/stdlib/node`. Substitute the appropriate slice and path for your tool.

## Steps

1. **Create the abstraction** at `src/node/features/HttpTool/abstractions/HttpTool.ts`:
   - Define `interface IHttpTool` with JSDoc on each method.
   - Export `const HttpTool = createAbstraction<IHttpTool>("Core/HttpTool")`.
   - Export `namespace HttpTool { export type Interface = IHttpTool }`.

2. **Create the abstraction barrel** at `src/node/features/HttpTool/abstractions/index.ts`:
   - `export { HttpTool } from "./HttpTool.js";`

3. **Create the implementation** at `src/node/features/HttpTool/HttpTool.ts`:
   - Rename the token import to avoid a name clash: `import { HttpTool as HttpToolAbstraction } from "./abstractions/HttpTool.js";`
   - Import cross-slice dependencies via the common barrel: `import { Logger } from "~/common/index.js";`
   - `class HttpToolImpl implements HttpToolAbstraction.Interface { ... }`
   - `export const HttpTool = HttpToolAbstraction.createImplementation({ implementation: HttpToolImpl, dependencies: [...] })`
   - The `dependencies` array order must match the constructor parameter order exactly.

4. **Create the feature** at `src/node/features/HttpTool/feature.ts`:
   - `export const HttpToolFeature = createFeature({ name: "Core/HttpToolFeature", register(container) { container.register(HttpTool).inSingletonScope(); } })`

5. **Create the feature index** at `src/node/features/HttpTool/index.ts`:
   - `export { HttpTool } from "./abstractions/index.js";`
   - `export { HttpToolFeature } from "./feature.js";`
   - Never re-export the implementation class or the `createImplementation` output.

6. **Create the feature README** at `src/node/features/HttpTool/README.md`:
   - One-paragraph description — what it does and when to reach for it.
   - Interface section — the public methods with JSDoc (copy from the abstraction file).
   - Usage section — two code snippets: DI container wiring, and a `createXxx()` factory function.
   - Prepend YAML front-matter (`name`, `description`, `context`) so the README is discoverable by the MCP server — see the front-matter block at the top of any existing feature README for the exact shape.
   - Update the repo root `README.md` table to add a row pointing to the new feature README.

7. **Add to the slice barrel** `src/node/index.ts`:
   - `export { HttpTool, HttpToolFeature } from "./features/HttpTool/index.js";`

8. **Write tests** at `__tests__/node/HttpTool.test.ts`:
   - Create a `makeContainer()` helper — see the `testing-patterns` skill.
   - Cover the happy path and error paths.
   - Node tests do not need a `// @vitest-environment` directive (only browser tests do).

9. **Run the pre-commit chain** until fully clean:

   ```sh
   yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
   ```

   All steps must pass with zero errors and zero warnings before staging and committing. If any step fails, fix the issue and run the full chain again from the start.

## Conventions to keep in mind throughout

- **No default exports.** Always use named exports.
- **JSDoc comments are preferred** on interface methods, abstraction types, and public class methods — they're read by both IDE tooling and agents. Don't write comments that just restate the method name.
- **Strict TypeScript** — all strict flags in `tsconfig.json` must pass.
- **`.js` extensions in package source imports** — under `src/`, `import { Foo } from "./Foo.js"` (not `.ts`); tsgo resolves `.js` to `.ts` at compile time. (Exception: `scripts/`, which runs directly under Node 24 and needs real `.ts` extensions.)
- **`node:` prefix for Node built-ins** — `import { readFileSync } from "node:fs"`, never `"fs"`.
- **Singletons via DI** — register utils as `.inSingletonScope()` unless there's a reason not to.
- **DI token names use `"Domain/ToolName"` format** — `"Core/"` prefix for common utils, `"Node/"` prefix for Node-specific ones.
- **Namespace pattern for interface types** — always export `namespace ToolName { export type Interface = IToolName }` alongside the token.

See the `di-patterns` skill for the underlying abstraction/implementation/feature mechanics, and AGENTS.md's "Step-by-step: Adding a New Slice to @webiny/stdlib" section if you're adding an entirely new runtime environment rather than a tool within an existing one.
