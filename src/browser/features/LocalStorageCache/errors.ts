import { CacheError } from "~/common/index.js";
import type { ErrorInput } from "~/common/index.js";

interface ParseErrorData {
    key: string;
}

interface QuotaExceededData {
    key: string;
    valueSize: number;
}

/** Thrown when JSON.parse fails on a stored cache entry. */
export class LocalStorageParseError extends CacheError<ParseErrorData> {
    public readonly code = "PARSE_ERROR" as const;
    public constructor(input: ErrorInput<ParseErrorData>) {
        super(input);
    }
}

/** Thrown when localStorage.setItem throws a QuotaExceededError. */
export class LocalStorageQuotaExceededError extends CacheError<QuotaExceededData> {
    public readonly code = "QUOTA_EXCEEDED" as const;
    public constructor(input: ErrorInput<QuotaExceededData>) {
        super(input);
    }
}

/** Thrown when window.localStorage is not available (e.g. SSR, security restrictions). */
export class LocalStorageUnavailableError extends CacheError {
    public readonly code = "STORAGE_UNAVAILABLE" as const;
    public constructor(input: ErrorInput) {
        super(input);
    }
}
