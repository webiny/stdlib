---
name: stdlib-feature-dev
description: Guided feature development for @webiny/stdlib using the DI abstraction → implementation → feature → index pattern. Use when adding a new tool, service, or feature to any slice (common, node, browser). Enforces TDD, file conventions, barrel exports, README creation, and the pre-commit chain. CRITICAL — existing tests must never be modified unless genuinely buggy.
---

# stdlib Feature Development

Rigid, TDD-oriented workflow for adding features to `@webiny/stdlib`. Follow every step in order. Read `AGENTS.md` first — it is the source of truth.

## Golden rule

**No existing test may be modified to make a new feature pass.** New features are additive. If an existing test fails, your feature has a regression — fix the feature, not the test. The only exception is a test that is genuinely buggy (wrong assertion, testing the wrong thing). If you suspect a buggy test, flag it to the user before touching it.

## Workflow

### 1. Determine slice placement

| Uses only JS built-ins | → `src/common/` (re-exported via `src/index.ts`) |
| Uses `node:*` APIs | → `src/node/` |
| Uses browser APIs | → `src/browser/` |

### 2. Run existing tests first

```sh
yarn test:coverage
```

Record the pass count. This is your baseline. Every subsequent run must match or exceed it.

### 3. Create the abstraction

Path: `src/<slice>/features/<ToolName>/abstractions/<ToolName>.ts`

See [REFERENCE.md](REFERENCE.md) §Abstraction for the template. Key points:

- Define `interface I<ToolName>` with JSDoc on each method
- `export const <ToolName> = createAbstraction<I<ToolName>>("Domain/ToolName")`
- `export namespace <ToolName> { export type Interface = I<ToolName> }`
- Create barrel at `abstractions/index.ts`

### 4. Write tests (RED phase)

Path: `__tests__/<slice>/<ToolName>.test.ts`

See [REFERENCE.md](REFERENCE.md) §Testing for the `makeContainer` pattern. Write tests for the happy path and error paths. Tests must fail now (no implementation yet). Run:

```sh
yarn test:coverage
```

Confirm: new tests fail, **all existing tests still pass**.

### 5. Create the implementation (GREEN phase)

Path: `src/<slice>/features/<ToolName>/<ToolName>.ts`

See [REFERENCE.md](REFERENCE.md) §Implementation for the template. Key points:

- Alias import: `import { <ToolName> as <ToolName>Abstraction } from "./abstractions/<ToolName>.js"`
- Cross-slice: `import { Logger } from "~/common/index.js"` (node/browser slices)
- `dependencies` array order must match constructor parameter order
- Use `.js` extensions in all imports under `src/`

Run tests — all should pass now (new + existing).

### 6. Create the feature

Path: `src/<slice>/features/<ToolName>/feature.ts`

See [REFERENCE.md](REFERENCE.md) §Feature for the template.

### 7. Create the feature index

Path: `src/<slice>/features/<ToolName>/index.ts`

Export only the abstraction token and the feature. Never export the implementation class.

### 8. Add to slice barrel

Add re-exports to `src/<slice>/index.ts`.

### 9. Create the feature README

Path: `src/<slice>/features/<ToolName>/README.md`

Format: (1) one-paragraph description, (2) Interface section with JSDoc, (3) Usage section with DI wiring + factory snippets. Update root `README.md` table.

### 10. REFACTOR phase

Review the implementation. Simplify if possible. Run tests again — all must pass.

### 11. Run the full pre-commit chain

```sh
yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

All seven steps must pass with zero errors and zero warnings. Loop until clean.

### 12. Verify no regressions

Compare test count to baseline from step 2. It must be equal or higher. No existing test may have been removed, skipped, or modified.
