import { Result } from "~/common/index.js";
import { Cache as CacheAbstraction } from "~/common/index.js";
import {
    LocalStorageParseError,
    LocalStorageQuotaExceededError,
    LocalStorageUnavailableError
} from "./errors.js";

type LocalStorageCacheError =
    | LocalStorageParseError
    | LocalStorageQuotaExceededError
    | LocalStorageUnavailableError;

class LocalStorageCacheImpl implements CacheAbstraction.Interface {
    private prefix: string = "";

    private readonly localStorage: Storage | null;

    public constructor() {
        this.localStorage =
            typeof window !== "undefined" && window?.localStorage ? window.localStorage : null;
    }

    private static fromPrefix(prefix: string): LocalStorageCacheImpl {
        const instance = new LocalStorageCacheImpl();
        instance.prefix = prefix;
        return instance;
    }

    private prefixedKey(key: string): string {
        return this.prefix ? `${this.prefix}.${key}` : key;
    }

    private unavailable(): Result<never, LocalStorageUnavailableError> {
        return Result.fail(
            new LocalStorageUnavailableError({
                message: "localStorage is not available"
            })
        );
    }

    public get<T>(key: string): Result<T | null, LocalStorageCacheError> {
        if (!this.localStorage) {
            return this.unavailable();
        }
        const raw = this.localStorage.getItem(this.prefixedKey(key));
        if (raw === null) {
            return Result.ok(null);
        }
        try {
            return Result.ok(JSON.parse(raw) as T);
        } catch {
            return Result.fail(
                new LocalStorageParseError({
                    message: `Failed to parse cache entry for key "${key}"`,
                    data: { key }
                })
            );
        }
    }

    public set<T>(key: string, value: T): Result<void, LocalStorageCacheError> {
        if (!this.localStorage) {
            return this.unavailable();
        }
        const serialised = JSON.stringify(value);
        try {
            this.localStorage.setItem(this.prefixedKey(key), serialised);
            return Result.ok();
        } catch {
            return Result.fail(
                new LocalStorageQuotaExceededError({
                    message: `Storage quota exceeded for key "${key}"`,
                    data: { key, valueSize: serialised.length }
                })
            );
        }
    }

    public remove(key: string): Result<void, LocalStorageCacheError> {
        if (!this.localStorage) {
            return this.unavailable();
        }
        this.localStorage.removeItem(this.prefixedKey(key));
        return Result.ok();
    }

    public has(key: string): Result<boolean, LocalStorageCacheError> {
        if (!this.localStorage) {
            return this.unavailable();
        }
        return Result.ok(this.localStorage.getItem(this.prefixedKey(key)) !== null);
    }

    public clear(): Result<void, LocalStorageCacheError> {
        if (!this.localStorage) {
            return this.unavailable();
        }
        if (this.prefix) {
            const scopePrefix = `${this.prefix}.`;
            const keysToRemove: string[] = [];
            for (let i = 0; i < this.localStorage.length; i++) {
                const k = this.localStorage.key(i);
                if (k !== null && k.startsWith(scopePrefix)) {
                    keysToRemove.push(k);
                }
            }
            for (const k of keysToRemove) {
                this.localStorage.removeItem(k);
            }
        } else {
            this.localStorage.clear();
        }
        return Result.ok();
    }

    public keys(): Result<string[], LocalStorageCacheError> {
        if (!this.localStorage) {
            return this.unavailable();
        }
        if (this.prefix) {
            const scopePrefix = `${this.prefix}.`;
            const result: string[] = [];
            for (let i = 0; i < this.localStorage.length; i++) {
                const k = this.localStorage.key(i);
                if (k !== null && k.startsWith(scopePrefix)) {
                    result.push(k.slice(scopePrefix.length));
                }
            }
            return Result.ok(result);
        }
        const result: string[] = [];
        for (let i = 0; i < this.localStorage.length; i++) {
            const k = this.localStorage.key(i);
            if (k !== null) {
                result.push(k);
            }
        }
        return Result.ok(result);
    }

    public getOrSet<T>(key: string, factory: () => T): Result<T, LocalStorageCacheError> {
        if (!this.localStorage) {
            return this.unavailable();
        }
        const prefixed = this.prefixedKey(key);
        const existing = this.localStorage.getItem(prefixed);
        if (existing !== null) {
            try {
                return Result.ok(JSON.parse(existing) as T);
            } catch {
                return Result.fail(
                    new LocalStorageParseError({
                        message: `Failed to parse cache entry for key "${key}"`,
                        data: { key }
                    })
                );
            }
        }
        const value = factory();
        const serialised = JSON.stringify(value);
        try {
            this.localStorage.setItem(prefixed, serialised);
        } catch {
            return Result.fail(
                new LocalStorageQuotaExceededError({
                    message: `Storage quota exceeded for key "${key}"`,
                    data: { key, valueSize: serialised.length }
                })
            );
        }
        return Result.ok(value);
    }

    public byPrefix(prefix: string): CacheAbstraction.Interface {
        const combined = this.prefix ? `${this.prefix}.${prefix}` : prefix;
        return LocalStorageCacheImpl.fromPrefix(combined);
    }
}

export const LocalStorageCache = CacheAbstraction.createImplementation({
    implementation: LocalStorageCacheImpl,
    dependencies: []
});

export function createLocalStorageCache(): CacheAbstraction.Interface {
    return new LocalStorageCacheImpl();
}
