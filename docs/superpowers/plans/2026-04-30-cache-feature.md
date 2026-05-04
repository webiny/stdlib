# Cache Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Cache` and `AsyncCache` abstractions with `MemoryCache`, `AsyncMemoryCache` (in `tools-common`) and `LocalStorageCache` (in `tools-browser`) implementations, following the existing DI feature pattern.

**Architecture:** `Cache` (sync) and `AsyncCache` (async) abstractions live in `tools-common` alongside a `MemoryCache` and `AsyncMemoryCache` implementation each backed by a private `Map`. `LocalStorageCache` implements `Cache` in `tools-browser`, backed by `window.localStorage`. All methods return `Result`/`ResultAsync`. `byPrefix(prefix)` returns a scoped view sharing the same underlying store with `"."` as the separator; `clear()` and `keys()` respect the prefix scope. `AsyncMemoryCache` is independent from `MemoryCache` — it has its own internal `Map`.

**Tech Stack:** Yarn 4, `@typescript/native-preview` (tsgo), Vitest 4 + `happy-dom` (browser tests), `@webiny/di`, `@webiny/tools-common` (workspace dep).

---

## File Map

### `tools-common` — create
```
packages/common/src/features/Cache/
├── abstractions/
│   ├── CacheError.ts          — abstract CacheError extends BaseError
│   ├── Cache.ts               — Cache abstraction token + ICache interface
│   ├── AsyncCache.ts          — AsyncCache abstraction token + IAsyncCache interface
│   └── index.ts
├── MemoryCache.ts             — MemoryCache (implements Cache, Map-backed)
├── AsyncMemoryCache.ts        — AsyncMemoryCache (implements AsyncCache, own Map)
├── MemoryCacheFeature.ts      — registers MemoryCache
├── AsyncMemoryCacheFeature.ts — registers AsyncMemoryCache
├── __tests__/
│   ├── MemoryCache.test.ts
│   └── AsyncMemoryCache.test.ts
└── index.ts                   — public surface for this feature
```

### `tools-common` — modify
- `packages/common/src/index.ts` — add Cache, AsyncCache, CacheError, MemoryCacheFeature, AsyncMemoryCacheFeature

### `tools-browser` — create
```
packages/browser/src/features/LocalStorageCache/
├── errors.ts                  — LocalStorageParseError, LocalStorageQuotaExceededError, LocalStorageUnavailableError
├── LocalStorageCache.ts       — LocalStorageCache (implements Cache, localStorage-backed)
├── feature.ts                 — registers LocalStorageCache
├── __tests__/
│   └── LocalStorageCache.test.ts
└── index.ts
```

### `tools-browser` — modify
- `packages/browser/package.json` — add `happy-dom` devDependency
- `packages/browser/vitest.config.ts` — add `environment: "happy-dom"`
- `packages/browser/src/index.ts` — add LocalStorageCache exports

---

## Task 1: Cache abstractions

**Files:**
- Create: `packages/common/src/features/Cache/abstractions/CacheError.ts`
- Create: `packages/common/src/features/Cache/abstractions/Cache.ts`
- Create: `packages/common/src/features/Cache/abstractions/AsyncCache.ts`
- Create: `packages/common/src/features/Cache/abstractions/index.ts`

No tests — these are type definitions only.

- [ ] **Step 1: Create `CacheError.ts`**

```ts
// packages/common/src/features/Cache/abstractions/CacheError.ts
import { BaseError } from "../../../core/index.js";

/** Base error for all Cache and AsyncCache implementations. */
export abstract class CacheError extends BaseError {}
```

- [ ] **Step 2: Create `Cache.ts`**

```ts
// packages/common/src/features/Cache/abstractions/Cache.ts
import { createAbstraction } from "../../../core/index.js";
import type { Result } from "../../../core/index.js";
import type { CacheError } from "./CacheError.js";

export interface ICache {
    /** Returns the parsed value, or null if the key does not exist. */
    get<T>(key: string): Result<T | null, CacheError>;
    /** Serialises value to JSON and stores it under key. */
    set<T>(key: string, value: T): Result<void, CacheError>;
    /** Removes the entry. No-op if key does not exist. */
    remove(key: string): Result<void, CacheError>;
    /** Returns true if the key exists, false otherwise. */
    has(key: string): Result<boolean, CacheError>;
    /**
     * Removes all entries. On a prefixed instance only removes
     * entries whose key starts with this prefix.
     */
    clear(): Result<void, CacheError>;
    /**
     * Returns all stored keys. On a prefixed instance returns only
     * keys within the prefix, with the prefix stripped.
     */
    keys(): Result<string[], CacheError>;
    /**
     * Returns the cached value for key if present; otherwise calls
     * factory, stores the result, and returns it. Factory errors
     * propagate — they are NOT captured in the Result.
     */
    getOrSet<T>(key: string, factory: () => T): Result<T, CacheError>;
    /**
     * Returns a scoped view of this cache. Keys in the child are
     * stored as `<prefix>.<key>`. Nesting is supported:
     * `byPrefix("a").byPrefix("b")` stores keys as `a.b.<key>`.
     */
    byPrefix(prefix: string): ICache;
}

export const Cache = createAbstraction<ICache>("Core/Cache");

export namespace Cache {
    export type Interface = ICache;
}
```

- [ ] **Step 3: Create `AsyncCache.ts`**

```ts
// packages/common/src/features/Cache/abstractions/AsyncCache.ts
import { createAbstraction } from "../../../core/index.js";
import type { ResultAsync } from "../../../core/index.js";
import type { CacheError } from "./CacheError.js";

export interface IAsyncCache {
    /** Returns the parsed value, or null if the key does not exist. */
    get<T>(key: string): ResultAsync<T | null, CacheError>;
    /** Serialises value to JSON and stores it under key. */
    set<T>(key: string, value: T): ResultAsync<void, CacheError>;
    /** Removes the entry. No-op if key does not exist. */
    remove(key: string): ResultAsync<void, CacheError>;
    /** Returns true if the key exists, false otherwise. */
    has(key: string): ResultAsync<boolean, CacheError>;
    /**
     * Removes all entries. On a prefixed instance only removes
     * entries whose key starts with this prefix.
     */
    clear(): ResultAsync<void, CacheError>;
    /**
     * Returns all stored keys. On a prefixed instance returns only
     * keys within the prefix, with the prefix stripped.
     */
    keys(): ResultAsync<string[], CacheError>;
    /**
     * Returns the cached value for key if present; otherwise calls
     * factory (sync or async), stores the result, and returns it.
     * Factory errors propagate — they are NOT captured in the ResultAsync.
     */
    getOrSet<T>(key: string, factory: () => T | Promise<T>): ResultAsync<T, CacheError>;
    /**
     * Returns a scoped view of this cache. Keys in the child are
     * stored as `<prefix>.<key>`. Nesting is supported:
     * `byPrefix("a").byPrefix("b")` stores keys as `a.b.<key>`.
     */
    byPrefix(prefix: string): IAsyncCache;
}

export const AsyncCache = createAbstraction<IAsyncCache>("Core/AsyncCache");

export namespace AsyncCache {
    export type Interface = IAsyncCache;
}
```

- [ ] **Step 4: Create `abstractions/index.ts`**

```ts
// packages/common/src/features/Cache/abstractions/index.ts
export { Cache } from "./Cache.js";
export { AsyncCache } from "./AsyncCache.js";
export { CacheError } from "./CacheError.js";
```

- [ ] **Step 5: Build to verify types**

```sh
cd packages/common && yarn build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```sh
git add packages/common/src/features/Cache/abstractions/
git commit -m "wip: add Cache, AsyncCache, CacheError abstractions"
```

---

## Task 2: MemoryCache — TDD

**Files:**
- Create: `packages/common/src/features/Cache/__tests__/MemoryCache.test.ts`
- Create: `packages/common/src/features/Cache/MemoryCache.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/common/src/features/Cache/__tests__/MemoryCache.test.ts
import { Container } from "@webiny/di";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryCache } from "../MemoryCache.js";
import { Cache } from "../abstractions/Cache.js";

function makeCache(): Cache.Interface {
    const container = new Container();
    container.register(MemoryCache).inSingletonScope();
    return container.resolve(Cache);
}

describe("MemoryCache", () => {
    let cache: Cache.Interface;

    beforeEach(() => {
        cache = makeCache();
    });

    describe("get / set", () => {
        it("returns null for a missing key", () => {
            const result = cache.get("missing");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) expect(result.value).toBeNull();
        });

        it("returns a stored string", () => {
            cache.set("name", "Alice");
            const result = cache.get<string>("name");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) expect(result.value).toBe("Alice");
        });

        it("returns a stored object", () => {
            cache.set("user", { id: 1, name: "Alice" });
            const result = cache.get<{ id: number; name: string }>("user");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) expect(result.value).toEqual({ id: 1, name: "Alice" });
        });

        it("overwrites an existing key", () => {
            cache.set("x", 1);
            cache.set("x", 2);
            const result = cache.get<number>("x");
            if (result.isOk()) expect(result.value).toBe(2);
        });
    });

    describe("has", () => {
        it("returns false for a missing key", () => {
            const result = cache.has("missing");
            if (result.isOk()) expect(result.value).toBe(false);
        });

        it("returns true for an existing key", () => {
            cache.set("x", 1);
            const result = cache.has("x");
            if (result.isOk()) expect(result.value).toBe(true);
        });
    });

    describe("remove", () => {
        it("removes an existing key", () => {
            cache.set("x", 1);
            cache.remove("x");
            const result = cache.get("x");
            if (result.isOk()) expect(result.value).toBeNull();
        });

        it("is a no-op for missing key", () => {
            expect(() => cache.remove("missing")).not.toThrow();
        });
    });

    describe("clear", () => {
        it("removes all entries on a root cache", () => {
            cache.set("a", 1);
            cache.set("b", 2);
            cache.clear();
            const keys = cache.keys();
            if (keys.isOk()) expect(keys.value).toEqual([]);
        });

        it("removes only prefixed entries on a scoped cache", () => {
            cache.set("other", "keep");
            const scoped = cache.byPrefix("app");
            scoped.set("x", 1);
            scoped.set("y", 2);
            scoped.clear();
            const scopedKeys = scoped.keys();
            if (scopedKeys.isOk()) expect(scopedKeys.value).toEqual([]);
            const rootGet = cache.get("other");
            if (rootGet.isOk()) expect(rootGet.value).toBe("keep");
        });
    });

    describe("keys", () => {
        it("returns empty array when cache is empty", () => {
            const result = cache.keys();
            if (result.isOk()) expect(result.value).toEqual([]);
        });

        it("returns all stored keys on root cache", () => {
            cache.set("a", 1);
            cache.set("b", 2);
            const result = cache.keys();
            if (result.isOk()) expect(result.value.sort()).toEqual(["a", "b"]);
        });

        it("returns only scoped keys stripped of prefix", () => {
            const scoped = cache.byPrefix("app");
            scoped.set("x", 1);
            scoped.set("y", 2);
            cache.set("other", 3);
            const result = scoped.keys();
            if (result.isOk()) expect(result.value.sort()).toEqual(["x", "y"]);
        });
    });

    describe("getOrSet", () => {
        it("calls factory and stores result when key is missing", () => {
            let calls = 0;
            const result = cache.getOrSet("x", () => {
                calls++;
                return 42;
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) expect(result.value).toBe(42);
            expect(calls).toBe(1);
        });

        it("returns existing value without calling factory", () => {
            cache.set("x", 99);
            let calls = 0;
            const result = cache.getOrSet("x", () => {
                calls++;
                return 0;
            });
            if (result.isOk()) expect(result.value).toBe(99);
            expect(calls).toBe(0);
        });
    });

    describe("byPrefix", () => {
        it("scopes reads and writes under the prefix", () => {
            const scoped = cache.byPrefix("ns");
            scoped.set("key", "value");
            const direct = cache.get<string>("ns.key");
            if (direct.isOk()) expect(direct.value).toBe("value");
        });

        it("does not leak keys between prefixes", () => {
            cache.byPrefix("a").set("x", 1);
            const result = cache.byPrefix("b").get("x");
            if (result.isOk()) expect(result.value).toBeNull();
        });

        it("nests prefixes with dot separator", () => {
            const nested = cache.byPrefix("app").byPrefix("user");
            nested.set("name", "Alice");
            const direct = cache.get<string>("app.user.name");
            if (direct.isOk()) expect(direct.value).toBe("Alice");
        });
    });
});
```

- [ ] **Step 2: Run tests — expect failure**

```sh
cd packages/common && yarn test --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find|Error"
```

Expected: import error — `MemoryCache.ts` does not exist yet.

- [ ] **Step 3: Implement `MemoryCache.ts`**

```ts
// packages/common/src/features/Cache/MemoryCache.ts
import { Result } from "../../core/index.js";
import { Cache as CacheAbstraction } from "./abstractions/Cache.js";
import type { CacheError } from "./abstractions/CacheError.js";

class MemoryCacheImpl implements CacheAbstraction.Interface {
    private readonly store: Map<string, string>;
    private readonly prefix: string;

    public constructor(store?: Map<string, string>, prefix?: string) {
        this.store = store ?? new Map<string, string>();
        this.prefix = prefix ?? "";
    }

    private prefixedKey(key: string): string {
        return this.prefix ? `${this.prefix}.${key}` : key;
    }

    public get<T>(key: string): Result<T | null, CacheError> {
        const raw = this.store.get(this.prefixedKey(key));
        if (raw === undefined) {
            return Result.ok(null);
        }
        return Result.ok(JSON.parse(raw) as T);
    }

    public set<T>(key: string, value: T): Result<void, CacheError> {
        this.store.set(this.prefixedKey(key), JSON.stringify(value));
        return Result.ok();
    }

    public remove(key: string): Result<void, CacheError> {
        this.store.delete(this.prefixedKey(key));
        return Result.ok();
    }

    public has(key: string): Result<boolean, CacheError> {
        return Result.ok(this.store.has(this.prefixedKey(key)));
    }

    public clear(): Result<void, CacheError> {
        if (this.prefix) {
            const scopePrefix = `${this.prefix}.`;
            for (const key of [...this.store.keys()]) {
                if (key.startsWith(scopePrefix)) {
                    this.store.delete(key);
                }
            }
        } else {
            this.store.clear();
        }
        return Result.ok();
    }

    public keys(): Result<string[], CacheError> {
        if (this.prefix) {
            const scopePrefix = `${this.prefix}.`;
            return Result.ok(
                [...this.store.keys()]
                    .filter(k => k.startsWith(scopePrefix))
                    .map(k => k.slice(scopePrefix.length))
            );
        }
        return Result.ok([...this.store.keys()]);
    }

    public getOrSet<T>(key: string, factory: () => T): Result<T, CacheError> {
        const prefixed = this.prefixedKey(key);
        if (this.store.has(prefixed)) {
            return Result.ok(JSON.parse(this.store.get(prefixed)!) as T);
        }
        const value = factory();
        this.store.set(prefixed, JSON.stringify(value));
        return Result.ok(value);
    }

    public byPrefix(prefix: string): CacheAbstraction.Interface {
        const combined = this.prefix ? `${this.prefix}.${prefix}` : prefix;
        return new MemoryCacheImpl(this.store, combined);
    }
}

export const MemoryCache = CacheAbstraction.createImplementation({
    implementation: MemoryCacheImpl,
    dependencies: []
});
```

- [ ] **Step 4: Run tests — expect pass**

```sh
cd packages/common && yarn test --reporter=verbose 2>&1 | grep -E "✓|✗|PASS|FAIL"
```

Expected: all MemoryCache tests pass.

- [ ] **Step 5: Build to verify types**

```sh
cd packages/common && yarn build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```sh
git add packages/common/src/features/Cache/MemoryCache.ts packages/common/src/features/Cache/__tests__/MemoryCache.test.ts
git commit -m "wip: add MemoryCache implementation"
```

---

## Task 3: AsyncMemoryCache — TDD

**Files:**
- Create: `packages/common/src/features/Cache/__tests__/AsyncMemoryCache.test.ts`
- Create: `packages/common/src/features/Cache/AsyncMemoryCache.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/common/src/features/Cache/__tests__/AsyncMemoryCache.test.ts
import { Container } from "@webiny/di";
import { describe, it, expect, beforeEach } from "vitest";
import { AsyncMemoryCache } from "../AsyncMemoryCache.js";
import { AsyncCache } from "../abstractions/AsyncCache.js";

function makeCache(): AsyncCache.Interface {
    const container = new Container();
    container.register(AsyncMemoryCache).inSingletonScope();
    return container.resolve(AsyncCache);
}

describe("AsyncMemoryCache", () => {
    let cache: AsyncCache.Interface;

    beforeEach(() => {
        cache = makeCache();
    });

    describe("get / set", () => {
        it("returns null for a missing key", async () => {
            const result = await cache.get("missing").unwrap();
            expect(result.isOk()).toBe(true);
            if (result.isOk()) expect(result.value).toBeNull();
        });

        it("returns a stored string", async () => {
            await cache.set("name", "Alice").unwrap();
            const result = await cache.get<string>("name").unwrap();
            if (result.isOk()) expect(result.value).toBe("Alice");
        });

        it("returns a stored object", async () => {
            await cache.set("user", { id: 1 }).unwrap();
            const result = await cache.get<{ id: number }>("user").unwrap();
            if (result.isOk()) expect(result.value).toEqual({ id: 1 });
        });
    });

    describe("has", () => {
        it("returns false for a missing key", async () => {
            const result = await cache.has("missing").unwrap();
            if (result.isOk()) expect(result.value).toBe(false);
        });

        it("returns true for an existing key", async () => {
            await cache.set("x", 1).unwrap();
            const result = await cache.has("x").unwrap();
            if (result.isOk()) expect(result.value).toBe(true);
        });
    });

    describe("remove", () => {
        it("removes an existing key", async () => {
            await cache.set("x", 1).unwrap();
            await cache.remove("x").unwrap();
            const result = await cache.get("x").unwrap();
            if (result.isOk()) expect(result.value).toBeNull();
        });
    });

    describe("clear", () => {
        it("removes all entries on root cache", async () => {
            await cache.set("a", 1).unwrap();
            await cache.set("b", 2).unwrap();
            await cache.clear().unwrap();
            const keys = await cache.keys().unwrap();
            if (keys.isOk()) expect(keys.value).toEqual([]);
        });

        it("removes only prefixed entries on scoped cache", async () => {
            await cache.set("other", "keep").unwrap();
            const scoped = cache.byPrefix("app");
            await scoped.set("x", 1).unwrap();
            await scoped.clear().unwrap();
            const scopedKeys = await scoped.keys().unwrap();
            if (scopedKeys.isOk()) expect(scopedKeys.value).toEqual([]);
            const rootGet = await cache.get("other").unwrap();
            if (rootGet.isOk()) expect(rootGet.value).toBe("keep");
        });
    });

    describe("keys", () => {
        it("returns empty array when cache is empty", async () => {
            const result = await cache.keys().unwrap();
            if (result.isOk()) expect(result.value).toEqual([]);
        });

        it("returns only scoped keys stripped of prefix", async () => {
            const scoped = cache.byPrefix("app");
            await scoped.set("x", 1).unwrap();
            await scoped.set("y", 2).unwrap();
            await cache.set("other", 3).unwrap();
            const result = await scoped.keys().unwrap();
            if (result.isOk()) expect(result.value.sort()).toEqual(["x", "y"]);
        });
    });

    describe("getOrSet", () => {
        it("calls sync factory and stores result when key is missing", async () => {
            let calls = 0;
            const result = await cache.getOrSet("x", () => { calls++; return 42; }).unwrap();
            if (result.isOk()) expect(result.value).toBe(42);
            expect(calls).toBe(1);
        });

        it("calls async factory and stores result when key is missing", async () => {
            let calls = 0;
            const result = await cache.getOrSet("x", async () => { calls++; return 42; }).unwrap();
            if (result.isOk()) expect(result.value).toBe(42);
            expect(calls).toBe(1);
        });

        it("returns existing value without calling factory", async () => {
            await cache.set("x", 99).unwrap();
            let calls = 0;
            const result = await cache.getOrSet("x", () => { calls++; return 0; }).unwrap();
            if (result.isOk()) expect(result.value).toBe(99);
            expect(calls).toBe(0);
        });
    });

    describe("byPrefix", () => {
        it("scopes reads and writes under the prefix", async () => {
            const scoped = cache.byPrefix("ns");
            await scoped.set("key", "value").unwrap();
            const direct = await cache.get<string>("ns.key").unwrap();
            if (direct.isOk()) expect(direct.value).toBe("value");
        });

        it("nests prefixes with dot separator", async () => {
            const nested = cache.byPrefix("app").byPrefix("user");
            await nested.set("name", "Alice").unwrap();
            const direct = await cache.get<string>("app.user.name").unwrap();
            if (direct.isOk()) expect(direct.value).toBe("Alice");
        });
    });
});
```

- [ ] **Step 2: Run tests — expect failure**

```sh
cd packages/common && yarn test --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find|Error"
```

Expected: import error — `AsyncMemoryCache.ts` does not exist yet.

- [ ] **Step 3: Implement `AsyncMemoryCache.ts`**

```ts
// packages/common/src/features/Cache/AsyncMemoryCache.ts
import { Result, ResultAsync } from "../../core/index.js";
import { AsyncCache as AsyncCacheAbstraction } from "./abstractions/AsyncCache.js";
import type { CacheError } from "./abstractions/CacheError.js";

class AsyncMemoryCacheImpl implements AsyncCacheAbstraction.Interface {
    private readonly store: Map<string, string>;
    private readonly prefix: string;

    public constructor(store?: Map<string, string>, prefix?: string) {
        this.store = store ?? new Map<string, string>();
        this.prefix = prefix ?? "";
    }

    private prefixedKey(key: string): string {
        return this.prefix ? `${this.prefix}.${key}` : key;
    }

    public get<T>(key: string): ResultAsync<T | null, CacheError> {
        return ResultAsync.from<T | null, CacheError>(async () => {
            const raw = this.store.get(this.prefixedKey(key));
            if (raw === undefined) {
                return Result.ok(null);
            }
            return Result.ok(JSON.parse(raw) as T);
        });
    }

    public set<T>(key: string, value: T): ResultAsync<void, CacheError> {
        return ResultAsync.from<void, CacheError>(async () => {
            this.store.set(this.prefixedKey(key), JSON.stringify(value));
            return Result.ok();
        });
    }

    public remove(key: string): ResultAsync<void, CacheError> {
        return ResultAsync.from<void, CacheError>(async () => {
            this.store.delete(this.prefixedKey(key));
            return Result.ok();
        });
    }

    public has(key: string): ResultAsync<boolean, CacheError> {
        return ResultAsync.from<boolean, CacheError>(async () => {
            return Result.ok(this.store.has(this.prefixedKey(key)));
        });
    }

    public clear(): ResultAsync<void, CacheError> {
        return ResultAsync.from<void, CacheError>(async () => {
            if (this.prefix) {
                const scopePrefix = `${this.prefix}.`;
                for (const key of [...this.store.keys()]) {
                    if (key.startsWith(scopePrefix)) {
                        this.store.delete(key);
                    }
                }
            } else {
                this.store.clear();
            }
            return Result.ok();
        });
    }

    public keys(): ResultAsync<string[], CacheError> {
        return ResultAsync.from<string[], CacheError>(async () => {
            if (this.prefix) {
                const scopePrefix = `${this.prefix}.`;
                return Result.ok(
                    [...this.store.keys()]
                        .filter(k => k.startsWith(scopePrefix))
                        .map(k => k.slice(scopePrefix.length))
                );
            }
            return Result.ok([...this.store.keys()]);
        });
    }

    public getOrSet<T>(key: string, factory: () => T | Promise<T>): ResultAsync<T, CacheError> {
        return ResultAsync.from<T, CacheError>(async () => {
            const prefixed = this.prefixedKey(key);
            if (this.store.has(prefixed)) {
                return Result.ok(JSON.parse(this.store.get(prefixed)!) as T);
            }
            const value = await factory();
            this.store.set(prefixed, JSON.stringify(value));
            return Result.ok(value);
        });
    }

    public byPrefix(prefix: string): AsyncCacheAbstraction.Interface {
        const combined = this.prefix ? `${this.prefix}.${prefix}` : prefix;
        return new AsyncMemoryCacheImpl(this.store, combined);
    }
}

export const AsyncMemoryCache = AsyncCacheAbstraction.createImplementation({
    implementation: AsyncMemoryCacheImpl,
    dependencies: []
});
```

- [ ] **Step 4: Run tests — expect pass**

```sh
cd packages/common && yarn test --reporter=verbose 2>&1 | grep -E "✓|✗|PASS|FAIL"
```

Expected: all tests pass.

- [ ] **Step 5: Build**

```sh
cd packages/common && yarn build
```

- [ ] **Step 6: Commit**

```sh
git add packages/common/src/features/Cache/AsyncMemoryCache.ts packages/common/src/features/Cache/__tests__/AsyncMemoryCache.test.ts
git commit -m "wip: add AsyncMemoryCache implementation"
```

---

## Task 4: Features + common package exports

**Files:**
- Create: `packages/common/src/features/Cache/MemoryCacheFeature.ts`
- Create: `packages/common/src/features/Cache/AsyncMemoryCacheFeature.ts`
- Create: `packages/common/src/features/Cache/index.ts`
- Modify: `packages/common/src/index.ts`

- [ ] **Step 1: Create `MemoryCacheFeature.ts`**

```ts
// packages/common/src/features/Cache/MemoryCacheFeature.ts
import { createFeature } from "../../core/index.js";
import { MemoryCache } from "./MemoryCache.js";

/** Registers MemoryCache as the Cache implementation. */
export const MemoryCacheFeature = createFeature({
    name: "Core/MemoryCacheFeature",
    register(container) {
        container.register(MemoryCache).inSingletonScope();
    }
});
```

- [ ] **Step 2: Create `AsyncMemoryCacheFeature.ts`**

```ts
// packages/common/src/features/Cache/AsyncMemoryCacheFeature.ts
import { createFeature } from "../../core/index.js";
import { AsyncMemoryCache } from "./AsyncMemoryCache.js";

/** Registers AsyncMemoryCache as the AsyncCache implementation. */
export const AsyncMemoryCacheFeature = createFeature({
    name: "Core/AsyncMemoryCacheFeature",
    register(container) {
        container.register(AsyncMemoryCache).inSingletonScope();
    }
});
```

- [ ] **Step 3: Create `Cache/index.ts`**

```ts
// packages/common/src/features/Cache/index.ts
export { Cache } from "./abstractions/Cache.js";
export { AsyncCache } from "./abstractions/AsyncCache.js";
export { CacheError } from "./abstractions/CacheError.js";
export { MemoryCacheFeature } from "./MemoryCacheFeature.js";
export { AsyncMemoryCacheFeature } from "./AsyncMemoryCacheFeature.js";
```

- [ ] **Step 4: Update `packages/common/src/index.ts`**

Add after the Logger exports:

```ts
export { Cache, AsyncCache, CacheError, MemoryCacheFeature, AsyncMemoryCacheFeature } from "./features/Cache/index.js";
```

- [ ] **Step 5: Build + test**

```sh
cd packages/common && yarn build && yarn test
```

Expected: all tests pass, no build errors.

- [ ] **Step 6: Commit**

```sh
git add packages/common/src/features/Cache/MemoryCacheFeature.ts packages/common/src/features/Cache/AsyncMemoryCacheFeature.ts packages/common/src/features/Cache/index.ts packages/common/src/index.ts
git commit -m "wip: wire Cache feature exports"
```

---

## Task 5: Browser setup — happy-dom + LocalStorageCache errors

**Files:**
- Modify: `packages/browser/package.json`
- Modify: `packages/browser/vitest.config.ts`
- Create: `packages/browser/src/features/LocalStorageCache/errors.ts`

- [ ] **Step 1: Add `happy-dom` devDependency**

```sh
cd packages/browser && yarn add -D happy-dom
```

- [ ] **Step 2: Update `vitest.config.ts`**

```ts
// packages/browser/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "happy-dom",
        include: ["src/**/*.{test,spec}.{ts,tsx}"]
    }
});
```

- [ ] **Step 3: Create `errors.ts`**

```ts
// packages/browser/src/features/LocalStorageCache/errors.ts
import { CacheError } from "@webiny/tools-common";

/** Thrown when JSON.parse fails on a stored cache entry. */
export class LocalStorageParseError extends CacheError<{ key: string }> {
    public readonly code = "PARSE_ERROR" as const;
}

/** Thrown when localStorage.setItem throws a QuotaExceededError. */
export class LocalStorageQuotaExceededError extends CacheError<{ key: string; valueSize: number }> {
    public readonly code = "QUOTA_EXCEEDED" as const;
}

/** Thrown when window.localStorage is not available (e.g. SSR, security restrictions). */
export class LocalStorageUnavailableError extends CacheError {
    public readonly code = "STORAGE_UNAVAILABLE" as const;
}
```

- [ ] **Step 4: Build browser package to verify CacheError import resolves**

```sh
cd packages/browser && yarn build
```

Expected: no errors (browser/src/index.ts is still just `export {}`).

- [ ] **Step 5: Commit**

```sh
git add packages/browser/package.json packages/browser/vitest.config.ts packages/browser/src/features/LocalStorageCache/errors.ts yarn.lock
git commit -m "wip: add happy-dom + LocalStorageCache error classes"
```

---

## Task 6: LocalStorageCache — TDD

**Files:**
- Create: `packages/browser/src/features/LocalStorageCache/__tests__/LocalStorageCache.test.ts`
- Create: `packages/browser/src/features/LocalStorageCache/LocalStorageCache.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/browser/src/features/LocalStorageCache/__tests__/LocalStorageCache.test.ts
import { Container } from "@webiny/di";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LocalStorageCache } from "../LocalStorageCache.js";
import { Cache } from "@webiny/tools-common";
import { LocalStorageParseError, LocalStorageQuotaExceededError, LocalStorageUnavailableError } from "../errors.js";

function makeCache(): Cache.Interface {
    const container = new Container();
    container.register(LocalStorageCache).inSingletonScope();
    return container.resolve(Cache);
}

describe("LocalStorageCache", () => {
    let cache: Cache.Interface;

    beforeEach(() => {
        localStorage.clear();
        cache = makeCache();
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe("get", () => {
        it("returns null for a missing key", () => {
            const result = cache.get("missing");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) expect(result.value).toBeNull();
        });

        it("returns a stored string", () => {
            cache.set("name", "Alice");
            const result = cache.get<string>("name");
            if (result.isOk()) expect(result.value).toBe("Alice");
        });

        it("returns a stored object", () => {
            cache.set("user", { id: 1 });
            const result = cache.get<{ id: number }>("user");
            if (result.isOk()) expect(result.value).toEqual({ id: 1 });
        });

        it("returns PARSE_ERROR for corrupted data", () => {
            localStorage.setItem("bad", "not-json{{{");
            const result = cache.get("bad");
            expect(result.isFail()).toBe(true);
            if (result.isFail()) {
                expect(result.error).toBeInstanceOf(LocalStorageParseError);
                expect(result.error.data).toEqual({ key: "bad" });
            }
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const result = cache.get("x");
            expect(result.isFail()).toBe(true);
            if (result.isFail()) expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
        });
    });

    describe("set", () => {
        it("stores and retrieves a value", () => {
            cache.set("x", 42);
            const result = cache.get<number>("x");
            if (result.isOk()) expect(result.value).toBe(42);
        });

        it("returns QUOTA_EXCEEDED when storage is full", () => {
            vi.spyOn(localStorage, "setItem").mockImplementation(() => {
                throw new DOMException("QuotaExceededError");
            });
            const result = cache.set("x", "value");
            expect(result.isFail()).toBe(true);
            if (result.isFail()) expect(result.error).toBeInstanceOf(LocalStorageQuotaExceededError);
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const result = cache.set("x", 1);
            expect(result.isFail()).toBe(true);
            if (result.isFail()) expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
        });
    });

    describe("has", () => {
        it("returns false for missing key", () => {
            const result = cache.has("missing");
            if (result.isOk()) expect(result.value).toBe(false);
        });

        it("returns true for existing key", () => {
            cache.set("x", 1);
            const result = cache.has("x");
            if (result.isOk()) expect(result.value).toBe(true);
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const result = cache.has("x");
            expect(result.isFail()).toBe(true);
            if (result.isFail()) expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
        });
    });

    describe("remove", () => {
        it("removes an existing key", () => {
            cache.set("x", 1);
            cache.remove("x");
            const result = cache.get("x");
            if (result.isOk()) expect(result.value).toBeNull();
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const result = cache.remove("x");
            expect(result.isFail()).toBe(true);
            if (result.isFail()) expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
        });
    });

    describe("clear", () => {
        it("clears all entries on root cache", () => {
            cache.set("a", 1);
            cache.set("b", 2);
            cache.clear();
            const keys = cache.keys();
            if (keys.isOk()) expect(keys.value).toEqual([]);
        });

        it("clears only prefixed entries on scoped cache", () => {
            cache.set("other", "keep");
            const scoped = cache.byPrefix("app");
            scoped.set("x", 1);
            scoped.clear();
            const scopedKeys = scoped.keys();
            if (scopedKeys.isOk()) expect(scopedKeys.value).toEqual([]);
            const rootGet = cache.get("other");
            if (rootGet.isOk()) expect(rootGet.value).toBe("keep");
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const result = cache.clear();
            expect(result.isFail()).toBe(true);
            if (result.isFail()) expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
        });
    });

    describe("keys", () => {
        it("returns all keys on root cache", () => {
            cache.set("a", 1);
            cache.set("b", 2);
            const result = cache.keys();
            if (result.isOk()) expect(result.value.sort()).toEqual(["a", "b"]);
        });

        it("returns only scoped keys stripped of prefix", () => {
            const scoped = cache.byPrefix("app");
            scoped.set("x", 1);
            scoped.set("y", 2);
            cache.set("other", 3);
            const result = scoped.keys();
            if (result.isOk()) expect(result.value.sort()).toEqual(["x", "y"]);
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const result = cache.keys();
            expect(result.isFail()).toBe(true);
            if (result.isFail()) expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
        });
    });

    describe("getOrSet", () => {
        it("calls factory and stores result when key is missing", () => {
            let calls = 0;
            const result = cache.getOrSet("x", () => { calls++; return 42; });
            if (result.isOk()) expect(result.value).toBe(42);
            expect(calls).toBe(1);
        });

        it("returns existing value without calling factory", () => {
            cache.set("x", 99);
            let calls = 0;
            const result = cache.getOrSet("x", () => { calls++; return 0; });
            if (result.isOk()) expect(result.value).toBe(99);
            expect(calls).toBe(0);
        });
    });

    describe("byPrefix", () => {
        it("scopes reads and writes under the prefix", () => {
            const scoped = cache.byPrefix("ns");
            scoped.set("key", "value");
            const direct = cache.get<string>("ns.key");
            if (direct.isOk()) expect(direct.value).toBe("value");
        });

        it("does not leak keys between prefixes", () => {
            cache.byPrefix("a").set("x", 1);
            const result = cache.byPrefix("b").get("x");
            if (result.isOk()) expect(result.value).toBeNull();
        });

        it("nests prefixes with dot separator", () => {
            const nested = cache.byPrefix("app").byPrefix("user");
            nested.set("name", "Alice");
            const direct = cache.get<string>("app.user.name");
            if (direct.isOk()) expect(direct.value).toBe("Alice");
        });
    });
});
```

- [ ] **Step 2: Run tests — expect failure**

```sh
cd packages/browser && yarn test 2>&1 | grep -E "FAIL|Cannot find|Error"
```

Expected: import error — `LocalStorageCache.ts` does not exist yet.

- [ ] **Step 3: Implement `LocalStorageCache.ts`**

```ts
// packages/browser/src/features/LocalStorageCache/LocalStorageCache.ts
import { Result } from "@webiny/tools-common";
import { Cache as CacheAbstraction } from "@webiny/tools-common";
import { LocalStorageParseError, LocalStorageQuotaExceededError, LocalStorageUnavailableError } from "./errors.js";

type LocalStorageCacheError = LocalStorageParseError | LocalStorageQuotaExceededError | LocalStorageUnavailableError;

class LocalStorageCacheImpl implements CacheAbstraction.Interface {
    private readonly prefix: string;

    public constructor(prefix?: string) {
        this.prefix = prefix ?? "";
    }

    private prefixedKey(key: string): string {
        return this.prefix ? `${this.prefix}.${key}` : key;
    }

    private isAvailable(): boolean {
        return typeof localStorage !== "undefined" && localStorage !== null;
    }

    private unavailable(): Result<never, LocalStorageUnavailableError> {
        return Result.fail(
            new LocalStorageUnavailableError({
                message: "localStorage is not available",
                stack: new Error().stack ?? ""
            })
        );
    }

    public get<T>(key: string): Result<T | null, LocalStorageCacheError> {
        if (!this.isAvailable()) {
            return this.unavailable();
        }
        const raw = localStorage.getItem(this.prefixedKey(key));
        if (raw === null) {
            return Result.ok(null);
        }
        try {
            return Result.ok(JSON.parse(raw) as T);
        } catch {
            return Result.fail(
                new LocalStorageParseError({
                    message: `Failed to parse cache entry for key "${key}"`,
                    data: { key },
                    stack: new Error().stack ?? ""
                })
            );
        }
    }

    public set<T>(key: string, value: T): Result<void, LocalStorageCacheError> {
        if (!this.isAvailable()) {
            return this.unavailable();
        }
        const serialised = JSON.stringify(value);
        try {
            localStorage.setItem(this.prefixedKey(key), serialised);
            return Result.ok();
        } catch {
            return Result.fail(
                new LocalStorageQuotaExceededError({
                    message: `Storage quota exceeded for key "${key}"`,
                    data: { key, valueSize: serialised.length },
                    stack: new Error().stack ?? ""
                })
            );
        }
    }

    public remove(key: string): Result<void, LocalStorageCacheError> {
        if (!this.isAvailable()) {
            return this.unavailable();
        }
        localStorage.removeItem(this.prefixedKey(key));
        return Result.ok();
    }

    public has(key: string): Result<boolean, LocalStorageCacheError> {
        if (!this.isAvailable()) {
            return this.unavailable();
        }
        return Result.ok(localStorage.getItem(this.prefixedKey(key)) !== null);
    }

    public clear(): Result<void, LocalStorageCacheError> {
        if (!this.isAvailable()) {
            return this.unavailable();
        }
        if (this.prefix) {
            const scopePrefix = `${this.prefix}.`;
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k !== null && k.startsWith(scopePrefix)) {
                    keysToRemove.push(k);
                }
            }
            for (const k of keysToRemove) {
                localStorage.removeItem(k);
            }
        } else {
            localStorage.clear();
        }
        return Result.ok();
    }

    public keys(): Result<string[], LocalStorageCacheError> {
        if (!this.isAvailable()) {
            return this.unavailable();
        }
        if (this.prefix) {
            const scopePrefix = `${this.prefix}.`;
            const result: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k !== null && k.startsWith(scopePrefix)) {
                    result.push(k.slice(scopePrefix.length));
                }
            }
            return Result.ok(result);
        }
        const result: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k !== null) {
                result.push(k);
            }
        }
        return Result.ok(result);
    }

    public getOrSet<T>(key: string, factory: () => T): Result<T, LocalStorageCacheError> {
        if (!this.isAvailable()) {
            return this.unavailable();
        }
        const prefixed = this.prefixedKey(key);
        const existing = localStorage.getItem(prefixed);
        if (existing !== null) {
            try {
                return Result.ok(JSON.parse(existing) as T);
            } catch {
                return Result.fail(
                    new LocalStorageParseError({
                        message: `Failed to parse cache entry for key "${key}"`,
                        data: { key },
                        stack: new Error().stack ?? ""
                    })
                );
            }
        }
        const value = factory();
        const serialised = JSON.stringify(value);
        try {
            localStorage.setItem(prefixed, serialised);
        } catch {
            return Result.fail(
                new LocalStorageQuotaExceededError({
                    message: `Storage quota exceeded for key "${key}"`,
                    data: { key, valueSize: serialised.length },
                    stack: new Error().stack ?? ""
                })
            );
        }
        return Result.ok(value);
    }

    public byPrefix(prefix: string): CacheAbstraction.Interface {
        const combined = this.prefix ? `${this.prefix}.${prefix}` : prefix;
        return new LocalStorageCacheImpl(combined);
    }
}

export const LocalStorageCache = CacheAbstraction.createImplementation({
    implementation: LocalStorageCacheImpl,
    dependencies: []
});
```

- [ ] **Step 4: Run tests — expect pass**

```sh
cd packages/browser && yarn test --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 5: Build**

```sh
cd packages/browser && yarn build
```

- [ ] **Step 6: Commit**

```sh
git add packages/browser/src/features/LocalStorageCache/LocalStorageCache.ts packages/browser/src/features/LocalStorageCache/__tests__/LocalStorageCache.test.ts
git commit -m "wip: add LocalStorageCache implementation"
```

---

## Task 7: LocalStorageCache feature + browser barrel

**Files:**
- Create: `packages/browser/src/features/LocalStorageCache/feature.ts`
- Create: `packages/browser/src/features/LocalStorageCache/index.ts`
- Modify: `packages/browser/src/index.ts`

- [ ] **Step 1: Create `feature.ts`**

```ts
// packages/browser/src/features/LocalStorageCache/feature.ts
import { createFeature } from "@webiny/tools-common";
import { LocalStorageCache } from "./LocalStorageCache.js";

/** Registers LocalStorageCache as the Cache implementation. */
export const LocalStorageCacheFeature = createFeature({
    name: "Browser/LocalStorageCacheFeature",
    register(container) {
        container.register(LocalStorageCache).inSingletonScope();
    }
});
```

- [ ] **Step 2: Create `LocalStorageCache/index.ts`**

```ts
// packages/browser/src/features/LocalStorageCache/index.ts
export { LocalStorageCacheFeature } from "./feature.js";
export { LocalStorageParseError, LocalStorageQuotaExceededError, LocalStorageUnavailableError } from "./errors.js";
```

- [ ] **Step 3: Update `packages/browser/src/index.ts`**

```ts
// packages/browser/src/index.ts
export { LocalStorageCacheFeature, LocalStorageParseError, LocalStorageQuotaExceededError, LocalStorageUnavailableError } from "./features/LocalStorageCache/index.js";
```

- [ ] **Step 4: Build browser package**

```sh
cd packages/browser && yarn build
```

- [ ] **Step 5: Commit**

```sh
git add packages/browser/src/features/LocalStorageCache/feature.ts packages/browser/src/features/LocalStorageCache/index.ts packages/browser/src/index.ts
git commit -m "wip: wire LocalStorageCacheFeature + browser exports"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run the full pre-commit chain from the repo root**

```sh
yarn format:fix && yarn lint:fix && yarn build && yarn test:coverage
```

Expected: zero errors, zero warnings, all tests pass with coverage.

- [ ] **Step 2: Verify pack output for browser package contains no test files**

```sh
cd packages/browser && yarn pack --dry-run
```

Expected: only `dist/**` and `package.json`. No `__tests__` entries.

- [ ] **Step 3: Final commit**

```sh
git add -A
git commit -m "wip: Cache + AsyncCache + MemoryCache + LocalStorageCache complete"
```
