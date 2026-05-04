import { CacheError } from "~/common";

/** Thrown when JSON.parse fails on a stored cache entry. */
export class LocalStorageParseError extends CacheError<{ key: string }> {
    public readonly code = "PARSE_ERROR" as const;
    public constructor(input: { message: string; data: { key: string }; stack: string }) {
        super(input);
    }
}

/** Thrown when localStorage.setItem throws a QuotaExceededError. */
export class LocalStorageQuotaExceededError extends CacheError<{ key: string; valueSize: number }> {
    public readonly code = "QUOTA_EXCEEDED" as const;
    public constructor(input: {
        message: string;
        data: { key: string; valueSize: number };
        stack: string;
    }) {
        super(input);
    }
}

/** Thrown when window.localStorage is not available (e.g. SSR, security restrictions). */
export class LocalStorageUnavailableError extends CacheError {
    public readonly code = "STORAGE_UNAVAILABLE" as const;
    public constructor(input: { message: string; stack: string }) {
        super(input);
    }
}
