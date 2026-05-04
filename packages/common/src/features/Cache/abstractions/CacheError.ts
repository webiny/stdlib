import { BaseError } from "../../../core/index.js";

/** Base error for all Cache and AsyncCache implementations. */
export abstract class CacheError<TData = void> extends BaseError<TData> {}
