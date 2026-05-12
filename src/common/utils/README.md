# Common Utils

Standalone utility functions exported from `@webiny/stdlib`. No DI container required — import and call directly.

---

## dotProp

Immutable and mutable operations on nested objects via dot-notation paths. Wraps the [`dot-prop`](https://github.com/deoxxa/dot-prop) package with explicit immutable/mutable variants and `structuredClone`-based deep cloning.

### API

```ts
function immutableGet<T = unknown>(
  object: Record<string, any> | null | undefined,
  path: string,
  defaultValue?: T
): T;
```

Gets the value at `path`. Clones `object` before reading; returns a clone of `defaultValue` when `object` is null or undefined.

```ts
function immutableSet<T extends Record<string, any>>(
  object: T,
  path: string,
  value: unknown | ((current: any) => unknown)
): T;
```

Returns a deep clone of `object` with `value` set at `path`. Pass a function as `value` to compute the new value from the current one.

```ts
function immutableDelete<T extends Record<string, any>>(object: T, path: string): T;
```

Returns a deep clone of `object` with the property at `path` removed.

```ts
function mutableSet<T extends Record<string, any>>(object: T, path: string, value: unknown): T;
```

Sets `value` at `path` on `object` in place. Returns `object`.

```ts
function mutableDelete<T extends Record<string, any>>(object: T, path: string): void;
```

Removes the property at `path` from `object` in place.

### Usage

```ts
import {
  immutableGet,
  immutableSet,
  immutableDelete,
  mutableSet,
  mutableDelete
} from "@webiny/stdlib";

const config = { server: { port: 3000, host: "localhost" } };

const port = immutableGet<number>(config, "server.port"); // 3000

const updated = immutableSet(config, "server.port", 4000);
// config.server.port is still 3000; updated.server.port is 4000

const doubled = immutableSet(config, "server.port", (v: number) => v * 2);
// doubled.server.port is 6000

const withoutHost = immutableDelete(config, "server.host");
// config still has host; withoutHost does not

mutableSet(config, "server.port", 5000); // mutates config
mutableDelete(config, "server.host"); // mutates config
```

---

## boolean

Semantic boolean coercion with exact parity to the [`boolean`](https://www.npmjs.com/package/boolean) npm package. Converts environment variable strings, form values, and other stringly-typed inputs to `boolean` using a well-defined set of truthy tokens.

### API

```ts
function toBoolean(value: unknown): boolean;
```

Converts any value to `boolean`:

- **Strings** (case-insensitive, trimmed): `"true"`, `"t"`, `"yes"`, `"y"`, `"on"`, `"1"` → `true`; everything else → `false`
- **Numbers**: `1` → `true`; all other numbers → `false`
- **Booleans**: `.valueOf()` result
- **Anything else**: `false`

```ts
function isTruthy(value: unknown): boolean;
```

Readable alias for `toBoolean(value)`. Intended for use in array predicates.

```ts
function isFalsy(value: unknown): boolean;
```

Readable inverse: returns `!toBoolean(value)`.

### Usage

```ts
import { toBoolean, isTruthy, isFalsy } from "@webiny/stdlib";

toBoolean("yes"); // true
toBoolean("no"); // false
toBoolean("1"); // true
toBoolean("2"); // false
toBoolean(1); // true
toBoolean(0); // false
toBoolean(true); // true

const flags = ["on", "off", "true", "false"];
flags.filter(isTruthy); // ["on", "true"]
flags.filter(isFalsy); // ["off", "false"]

// Typical env var usage
const debug = isTruthy(process.env.DEBUG);
```
