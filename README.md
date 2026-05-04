# @webiny/stdlib

Standard library for Webiny applications. Published as three subpath exports:

| Import                   | Environment | Description                 |
| ------------------------ | ----------- | --------------------------- |
| `@webiny/stdlib`         | Any         | Platform-agnostic utilities |
| `@webiny/stdlib/node`    | Node.js     | Node.js-specific tools      |
| `@webiny/stdlib/browser` | Browser     | Browser-specific tools      |

---

## `@webiny/stdlib` — Common

| Feature                                             | Description                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Result` / `ResultAsync`                            | Typed success/failure values — synchronous and async                                        |
| `BaseError`                                         | Abstract base class for typed domain errors                                                 |
| `Logger` / `ConsoleLogger` / `ConsoleLoggerFeature` | Logging abstraction + console implementation — [docs](src/common/features/Logger/README.md) |
| `Cache` / `MemoryCacheFeature`                      | Synchronous key-value cache — [docs](src/common/features/Cache/README.md)                   |
| `AsyncCache` / `AsyncMemoryCacheFeature`            | Async key-value cache — [docs](src/common/features/Cache/README.md)                         |

---

## `@webiny/stdlib/node` — Node.js

| Feature                                              | Description                                                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `FileTool` / `FileToolFeature`                       | Read, write, copy, remove files — [docs](src/node/features/FileTool/README.md)                                                      |
| `DirectoryTool` / `DirectoryToolFeature`             | Create, read, remove, copy, glob directories — [docs](src/node/features/DirectoryTool/README.md)                                    |
| `JsonFileTool` / `JsonFileToolFeature`               | Read and write JSON files with optional schema validation — [docs](src/node/features/JsonFileTool/README.md)                        |
| `PathTool` / `PathToolFeature`                       | `node:path` wrapper + `resolvePackageFile` for package-relative paths — [docs](src/node/features/PathTool/README.md)                |
| `PinoLogger` / `PinoLoggerFeature`                   | pino-based `Logger` implementation — [docs](src/node/features/PinoLogger/README.md)                                                 |
| `NdJsonReaderTool` / `NdJsonReaderToolFeature`       | Parse NDJSON from files, streams, or in-memory lines with checkpoint support — [docs](src/node/features/NdJsonReaderTool/README.md) |
| `ReadStreamFactory` / `ReadStreamFactoryFeature`     | Disposable `node:fs` read streams via `AsyncDisposable` — [docs](src/node/features/ReadStreamFactory/README.md)                     |
| `PackageJsonFileTool` / `PackageJsonFileToolFeature` | Read, validate, mutate, and write `package.json` files — [docs](src/node/features/PackageJsonFileTool/README.md)                    |

---

## `@webiny/stdlib/browser` — Browser

| Feature                    | Description                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `LocalStorageCacheFeature` | `Cache` implementation backed by `window.localStorage` — [docs](src/browser/features/LocalStorageCache/README.md) |
