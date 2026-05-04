import { createAbstraction } from "../../../core/index.js";
import type { Result } from "../../../core/index.js";
import type { CacheError } from "./CacheError.js";

export interface ICache {
    /** Returns the parsed value, or null if the key does not exist. */
    get<T>(key: string): Result<T | null, CacheError<any>>;
    /** Serialises value to JSON and stores it under key. */
    set<T>(key: string, value: T): Result<void, CacheError<any>>;
    /** Removes the entry. No-op if key does not exist. */
    remove(key: string): Result<void, CacheError<any>>;
    /** Returns true if the key exists, false otherwise. */
    has(key: string): Result<boolean, CacheError<any>>;
    /**
     * Removes all entries. On a prefixed instance only removes
     * entries whose key starts with this prefix.
     */
    clear(): Result<void, CacheError<any>>;
    /**
     * Returns all stored keys. On a prefixed instance returns only
     * keys within the prefix, with the prefix stripped.
     */
    keys(): Result<string[], CacheError<any>>;
    /**
     * Returns the cached value for key if present; otherwise calls
     * factory, stores the result, and returns it. Factory errors
     * propagate — they are NOT captured in the Result.
     */
    getOrSet<T>(key: string, factory: () => T): Result<T, CacheError<any>>;
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
