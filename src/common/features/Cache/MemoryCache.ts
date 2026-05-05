import { Result } from "../../core/index.js";
import { Cache as CacheAbstraction } from "./abstractions/Cache.js";
import type { CacheError } from "./abstractions/CacheError.js";

class MemoryCacheImpl implements CacheAbstraction.Interface {
    private store: Map<string, string> = new Map();
    private prefix: string = "";

    public constructor() {}

    private static fromStore(store: Map<string, string>, prefix: string): MemoryCacheImpl {
        const instance = new MemoryCacheImpl();
        instance.store = store;
        instance.prefix = prefix;
        return instance;
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
        return MemoryCacheImpl.fromStore(this.store, combined);
    }
}

export const MemoryCache = CacheAbstraction.createImplementation({
    implementation: MemoryCacheImpl,
    dependencies: []
});
