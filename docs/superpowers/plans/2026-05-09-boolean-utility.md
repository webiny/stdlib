# Boolean Utility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `toBoolean`, `isTruthy`, and `isFalsy` pure utility functions to `@webiny/stdlib` as a drop-in replacement for the `boolean` npm package.

**Architecture:** Three plain exported functions live in a new `src/common/utils/boolean.ts` file. `toBoolean` implements exact parity with the `boolean` package using `Object.prototype.toString` dispatch. `isTruthy` and `isFalsy` delegate to it. All three are re-exported from the existing `src/common/index.ts` barrel.

**Tech Stack:** TypeScript (tsgo / `@typescript/native-preview`), Vitest for tests.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/common/utils/boolean.ts` | The three utility functions |
| Modify | `src/common/index.ts` | Re-export `toBoolean`, `isTruthy`, `isFalsy` |
| Create | `__tests__/boolean.test.ts` | Full test coverage |

---

### Task 1: Write the failing tests

**Files:**
- Create: `__tests__/boolean.test.ts`

- [ ] **Step 1: Create `__tests__/boolean.test.ts`** with the full test suite

```ts
import { describe, expect, it } from "vitest";
import { toBoolean, isTruthy, isFalsy } from "@webiny/stdlib";

describe("toBoolean", () => {
    describe("strings — truthy set", () => {
        it.each(["true", "t", "yes", "y", "on", "1"])(
            'returns true for "%s"',
            value => {
                expect(toBoolean(value)).toBe(true);
            }
        );

        it.each(["TRUE", "True", "YES", "Yes", "ON", "On", "T", "Y"])(
            'returns true for uppercase/mixed "%s"',
            value => {
                expect(toBoolean(value)).toBe(true);
            }
        );

        it.each([" true ", " 1 ", " yes "])(
            'returns true for whitespace-padded "%s"',
            value => {
                expect(toBoolean(value)).toBe(true);
            }
        );
    });

    describe("strings — falsy set", () => {
        it.each(["false", "f", "no", "n", "off", "0", "", "banana", "2", "null"])(
            'returns false for "%s"',
            value => {
                expect(toBoolean(value)).toBe(false);
            }
        );
    });

    describe("numbers", () => {
        it("returns true for 1", () => {
            expect(toBoolean(1)).toBe(true);
        });

        it.each([0, 2, -1, 100, NaN])(
            "returns false for %s",
            value => {
                expect(toBoolean(value)).toBe(false);
            }
        );
    });

    describe("booleans", () => {
        it("returns true for true", () => {
            expect(toBoolean(true)).toBe(true);
        });

        it("returns false for false", () => {
            expect(toBoolean(false)).toBe(false);
        });
    });

    describe("other types", () => {
        it.each([null, undefined, {}, [], () => {}, Symbol("x")])(
            "returns false for non-string/number/boolean values",
            value => {
                expect(toBoolean(value)).toBe(false);
            }
        );
    });
});

describe("isTruthy", () => {
    it("mirrors toBoolean for a truthy value", () => {
        expect(isTruthy("true")).toBe(true);
        expect(isTruthy(1)).toBe(true);
        expect(isTruthy(true)).toBe(true);
    });

    it("mirrors toBoolean for a falsy value", () => {
        expect(isTruthy("false")).toBe(false);
        expect(isTruthy(0)).toBe(false);
        expect(isTruthy(null)).toBe(false);
    });
});

describe("isFalsy", () => {
    it("is the inverse of toBoolean for a truthy value", () => {
        expect(isFalsy("true")).toBe(false);
        expect(isFalsy(1)).toBe(false);
        expect(isFalsy(true)).toBe(false);
    });

    it("is the inverse of toBoolean for a falsy value", () => {
        expect(isFalsy("false")).toBe(true);
        expect(isFalsy(0)).toBe(true);
        expect(isFalsy(null)).toBe(true);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```sh
yarn test --reporter=verbose __tests__/boolean.test.ts
```

Expected: all tests fail with `toBoolean is not a function` (or similar import error).

---

### Task 2: Implement the utility functions

**Files:**
- Create: `src/common/utils/boolean.ts`

- [ ] **Step 1: Create `src/common/utils/boolean.ts`**

```ts
/**
 * Coerces a value to boolean with the same rules as the `boolean` npm package.
 *
 * Truthy strings (case-insensitive, trimmed): "true", "t", "yes", "y", "on", "1".
 * Truthy number: 1 only.
 * Booleans pass through.
 * Everything else returns false.
 */
export function toBoolean(value: unknown): boolean {
    switch (Object.prototype.toString.call(value)) {
        case "[object String]":
            return ["true", "t", "yes", "y", "on", "1"].includes(
                (value as string).trim().toLowerCase()
            );
        case "[object Number]":
            return (value as number).valueOf() === 1;
        case "[object Boolean]":
            return (value as boolean).valueOf();
        default:
            return false;
    }
}

/** Returns `toBoolean(value)`. Readable alias for use in predicates. */
export function isTruthy(value: unknown): boolean {
    return toBoolean(value);
}

/** Returns `!toBoolean(value)`. Readable inverse of `isTruthy`. */
export function isFalsy(value: unknown): boolean {
    return !toBoolean(value);
}
```

- [ ] **Step 2: Run the tests to verify they pass**

```sh
yarn test --reporter=verbose __tests__/boolean.test.ts
```

Expected: all tests pass.

---

### Task 3: Export from the common barrel

**Files:**
- Modify: `src/common/index.ts`

- [ ] **Step 1: Add exports to `src/common/index.ts`**

Add this line at the end of the file:

```ts
export { toBoolean, isTruthy, isFalsy } from "./utils/boolean.js";
```

The full file should now look like:

```ts
export { Result, ResultAsync, BaseError, createAbstraction, createFeature } from "./core/index.js";
export type { ErrorInput } from "./core/index.js";
export { Logger, type ILogger } from "./features/Logger/abstractions/Logger.js";
export { ConsoleLoggerConfig } from "./features/Logger/abstractions/ConsoleLoggerConfig.js";
export { ConsoleLoggerFeature } from "./features/Logger/feature.js";
export { ConsoleLogger } from "./features/Logger/ConsoleLogger.js";
export {
    Cache,
    AsyncCache,
    CacheError,
    MemoryCacheFeature,
    AsyncMemoryCacheFeature
} from "./features/Cache/index.js";
export type { ICache, IAsyncCache } from "./features/Cache/index.js";
export { toBoolean, isTruthy, isFalsy } from "./utils/boolean.js";
```

- [ ] **Step 2: Run the full test suite to confirm nothing regressed**

```sh
yarn test
```

Expected: all tests pass.

---

### Task 4: Run the full pre-commit chain and commit

**Files:** none new — validation only

- [ ] **Step 1: Run the full pre-commit chain**

```sh
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Expected: all five steps exit with code 0, zero errors, zero warnings.

- [ ] **Step 2: Stage and commit**

```sh
git add src/common/utils/boolean.ts src/common/index.ts __tests__/boolean.test.ts docs/superpowers/specs/2026-05-09-boolean-utility-design.md docs/superpowers/plans/2026-05-09-boolean-utility.md
git commit -m "$(cat <<'EOF'
feat(stdlib/common): add toBoolean, isTruthy, isFalsy utilities

Replaces the `boolean` npm package with a native @webiny/stdlib
implementation. Exact coercion parity: truthy strings are
"true", "t", "yes", "y", "on", "1" (case-insensitive, trimmed);
truthy number is 1 only; booleans pass through.
isTruthy and isFalsy are readable wrappers on top.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
