---
name: cache
description: Synchronous and async key-value caches with a Result-based API that never throw.
context: common
---

# Cache / AsyncCache

Synchronous and async key-value caches with a `Result`-based API — they never throw. All operations return `Result<T, CacheError>` (sync) or `ResultAsync<T, CacheError>` (async), so callers handle errors explicitly.

`MemoryCacheFeature` registers a synchronous in-memory `Cache`. `AsyncMemoryCacheFeature` registers an async in-memory `AsyncCache`. Both support prefix-scoping via `byPrefix()`.

## Interface

```ts
interface ICache {
  get<T>(key: string): Result<T | null, CacheError<any>>;
  set<T>(key: string, value: T): Result<void, CacheError<any>>;
  remove(key: string): Result<void, CacheError<any>>;
  has(key: string): Result<boolean, CacheError<any>>;
  clear(): Result<void, CacheError<any>>;
  keys(): Result<string[], CacheError<any>>;
  /** Returns the cached value, or calls factory, stores, and returns it. */
  getOrSet<T>(key: string, factory: () => T): Result<T, CacheError<any>>;
  /** Returns a scoped view — keys stored as `<prefix>.<key>`. */
  byPrefix(prefix: string): ICache;
}

interface IAsyncCache {
  get<T>(key: string): ResultAsync<T | null, CacheError<any>>;
  set<T>(key: string, value: T): ResultAsync<void, CacheError<any>>;
  remove(key: string): ResultAsync<void, CacheError<any>>;
  has(key: string): ResultAsync<boolean, CacheError<any>>;
  clear(): ResultAsync<void, CacheError<any>>;
  keys(): ResultAsync<string[], CacheError<any>>;
  /** Returns the cached value, or calls factory (sync or async), stores, and returns it. */
  getOrSet<T>(key: string, factory: () => T | Promise<T>): ResultAsync<T, CacheError<any>>;
  /** Returns a scoped view — keys stored as `<prefix>.<key>`. */
  byPrefix(prefix: string): IAsyncCache;
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { Cache, AsyncCache, MemoryCacheFeature, AsyncMemoryCacheFeature } from "@webiny/stdlib";

const container = new Container();
MemoryCacheFeature.register(container);
AsyncMemoryCacheFeature.register(container);

const cache = container.resolve(Cache);
cache.set("key", "value");

const scoped = cache.byPrefix("user");
scoped.set("name", "Alice"); // stored as "user.name"

const r = cache.get<string>("key");
if (r.isOk()) console.log(r.value); // "value"

const asyncCache = container.resolve(AsyncCache);
await asyncCache.set("k", 42);
const result = await asyncCache.get<number>("k");
if (result.isOk()) console.log(result.value); // 42
```
