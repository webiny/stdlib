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
function immutableDelete<T>(target: T[], index: number): T[];
```

Returns a deep clone with the property at `path` removed. When called on an array with a numeric index, splices the element out of the clone (the original array is unchanged).

```ts
function mutableSet<T extends Record<string, any>>(object: T, path: string, value: unknown): T;
```

Sets `value` at `path` on `object` in place. Returns `object`.

```ts
function mutableDelete<T extends Record<string, any>>(object: T, path: string): boolean;
function mutableDelete<T>(target: T[], index: number): boolean;
```

Removes the property at `path` from `object` in place. When called on an array with a numeric index, splices the element out. Returns `true` if the property/element existed, `false` otherwise.

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

// Array support — both delete functions accept a numeric index
const items = ["a", "b", "c"];

const without = immutableDelete(items, 1); // ["a", "c"] — items unchanged
mutableDelete(items, 0); // items is now ["b", "c"]
```

---

## uuid

Generates RFC 4122 v4 UUIDs. Uses the native `crypto.randomUUID()` when available (Node.js, secure browser contexts) and falls back to a manual implementation using `crypto.getRandomValues()` for insecure (HTTP) browser contexts. No external dependencies.

### API

```ts
function uuid(): string;
```

Returns a lowercase UUID v4 string in the standard `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` format, where `y` is one of `8`, `9`, `a`, or `b` (RFC 4122 variant bits).

### Usage

```ts
import { uuid } from "@webiny/stdlib";

const id = uuid(); // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
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
