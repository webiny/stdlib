# boolean

Semantic boolean coercion with exact parity to the [`boolean`](https://www.npmjs.com/package/boolean) npm package. Converts environment variable strings, form values, and other stringly-typed inputs to `boolean` using a well-defined set of truthy tokens.

## API

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

## Usage

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
