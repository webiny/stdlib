---
name: dot-prop
description: Immutable and mutable get/set/delete operations on nested objects via dot-notation paths.
context: common
---

# dotProp

Immutable and mutable operations on nested objects via dot-notation paths. Wraps the [`dot-prop`](https://github.com/deoxxa/dot-prop) package with explicit immutable/mutable variants and `structuredClone`-based deep cloning.

## API

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

## Usage

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
