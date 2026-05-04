import { Result, ResultAsync } from "../../core/index.js";
import { AsyncCache as AsyncCacheAbstraction } from "./abstractions/AsyncCache.js";
import type { CacheError } from "./abstractions/CacheError.js";

class AsyncMemoryCacheImpl implements AsyncCacheAbstraction.Interface {
    private store: Map<string, string> = new Map();
    private prefix: string = "";

    public constructor() {}

    private static fromStore(store: Map<string, string>, prefix: string): AsyncMemoryCacheImpl {
        const instance = new AsyncMemoryCacheImpl();
        instance.store = store;
        instance.prefix = prefix;
        return instance;
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
            const stored = this.store.get(prefixed);
            if (stored) {
                return Result.ok(JSON.parse(stored) as T);
            }
            const value = await factory();
            this.store.set(prefixed, JSON.stringify(value));
            return Result.ok(value);
        });
    }

    public byPrefix(prefix: string): AsyncCacheAbstraction.Interface {
        const combined = this.prefix ? `${this.prefix}.${prefix}` : prefix;
        return AsyncMemoryCacheImpl.fromStore(this.store, combined);
    }
}

export const AsyncMemoryCache = AsyncCacheAbstraction.createImplementation({
    implementation: AsyncMemoryCacheImpl,
    dependencies: []
});
