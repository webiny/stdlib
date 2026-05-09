# Boolean Utility Design

**Date:** 2026-05-09  
**Package:** `@webiny/stdlib` (common slice)  
**Status:** Approved

## Goal

Replace `import { boolean } from "boolean"` with a native `@webiny/stdlib` utility. Add `isTruthy` and `isFalsy` as convenience wrappers on top.

## API

Three plain exported functions — no DI, no classes, no `Result` wrapping.

```ts
function toBoolean(value: unknown): boolean
function isTruthy(value: unknown): boolean
function isFalsy(value: unknown): boolean
```

### `toBoolean(value: unknown): boolean`

Exact parity with the `boolean` npm package. Uses `Object.prototype.toString` for type dispatch:

| Input type | Truthy values | All others |
|---|---|---|
| String (trimmed, lowercased) | `"true"`, `"t"`, `"yes"`, `"y"`, `"on"`, `"1"` | `false` |
| Number | `1` | `false` |
| Boolean | `true` | `false` |
| Anything else | — | `false` |

### `isTruthy(value: unknown): boolean`

Returns `toBoolean(value)`. Readable alias for use in filter predicates and condition checks.

### `isFalsy(value: unknown): boolean`

Returns `!toBoolean(value)`. Readable inverse.

## File Layout

```
src/common/utils/boolean.ts   ← new file
src/common/index.ts           ← add exports for toBoolean, isTruthy, isFalsy
__tests__/boolean.test.ts     ← new test file
```

No new `index.ts` barrel needed — single file, export directly from the common barrel.

## Tests

`__tests__/boolean.test.ts` covers:

- All six truthy string variants: `"true"`, `"t"`, `"yes"`, `"y"`, `"on"`, `"1"`
- Case variants: `"TRUE"`, `"Yes"`, `"ON"`
- Whitespace: `" true "`, `" 1 "`
- Number `1` → `true`; numbers `0`, `2`, `-1` → `false`
- Boolean `true` → `true`; `false` → `false`
- `null`, `undefined`, `{}`, `[]`, `""` → `false`
- Unknown strings like `"banana"` → `false`
- `isTruthy` mirrors `toBoolean`
- `isFalsy` is the inverse

## Out of Scope

- `parseBoolean` returning `Result<boolean, ParseError>` — not needed for this replacement
- `isBoolean` type guard — not part of this spec
- Strict mode / throws on unknown input — lenient behaviour matches the `boolean` package
