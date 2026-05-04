import { createAbstraction } from "../../../core/index.js";
import type { ResultAsync } from "../../../core/index.js";
import type { CacheError } from "./CacheError.js";

export interface IAsyncCache {
    /** Returns the parsed value, or null if the key does not exist. */
    get<T>(key: string): ResultAsync<T | null, CacheError<any>>;
    /** Serialises value to JSON and stores it under key. */
    set<T>(key: string, value: T): ResultAsync<void, CacheError<any>>;
    /** Removes the entry. No-op if key does not exist. */
    remove(key: string): ResultAsync<void, CacheError<any>>;
    /** Returns true if the key exists, false otherwise. */
    has(key: string): ResultAsync<boolean, CacheError<any>>;
    /**
     * Removes all entries. On a prefixed instance only removes
     * entries whose key starts with this prefix.
     */
    clear(): ResultAsync<void, CacheError<any>>;
    /**
     * Returns all stored keys. On a prefixed instance returns only
     * keys within the prefix, with the prefix stripped.
     */
    keys(): ResultAsync<string[], CacheError<any>>;
    /**
     * Returns the cached value for key if present; otherwise calls
     * factory (sync or async), stores the result, and returns it.
     * Factory errors propagate — they are NOT captured in the ResultAsync.
     */
    getOrSet<T>(key: string, factory: () => T | Promise<T>): ResultAsync<T, CacheError<any>>;
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
