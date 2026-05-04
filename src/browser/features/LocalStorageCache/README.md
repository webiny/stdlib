# LocalStorageCache

A `Cache` implementation backed by `window.localStorage`. All methods return `Result` — they never throw. When `localStorage` is unavailable (SSR, private-browsing restrictions), every operation returns a typed `LocalStorageUnavailableError` instead of crashing.

## Interface

Implements `Cache.Interface` from `@webiny/stdlib`. See the `@webiny/stdlib` [Cache feature](../../../features/Cache/README.md) for the full `ICache` interface.

Error types specific to this implementation:

```ts
class LocalStorageUnavailableError extends CacheError {
  readonly code = "STORAGE_UNAVAILABLE";
}
class LocalStorageQuotaExceededError extends CacheError<{ key: string; valueSize: number }> {
  readonly code = "QUOTA_EXCEEDED";
}
class LocalStorageParseError extends CacheError<{ key: string }> {
  readonly code = "PARSE_ERROR";
}
```

## Usage

### With DI

```ts
import { Container } from "@webiny/di";
import { Cache } from "@webiny/stdlib";
import { LocalStorageCacheFeature } from "@webiny/stdlib/browser";

const container = new Container();
LocalStorageCacheFeature.register(container);

const cache = container.resolve(Cache);

const setResult = cache.set("theme", "dark");
if (setResult.isFail()) {
  console.error(setResult.error.code); // "STORAGE_UNAVAILABLE" | "QUOTA_EXCEEDED"
}

const getResult = cache.get<string>("theme");
if (getResult.isOk()) {
  console.log(getResult.value); // "dark" | null
}

// Scoped cache — keys stored as "user.<key>"
const userCache = cache.byPrefix("user");
userCache.set("name", "Alice");
```
