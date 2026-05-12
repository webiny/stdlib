# @webiny/stdlib

Opinionated standard library for [Webiny](https://www.webiny.com). This is an internal package — we make breaking changes freely and do not follow semver for external consumers.

## Design

Services are built on a lightweight dependency injection system. Each feature follows the same three-layer pattern: an **abstraction** (DI token + interface), an **implementation** (concrete class), and a **feature** (registers the implementation in the DI container). This keeps code testable and lets different environments (Node.js, browser) swap implementations behind the same interface.

## Subpath exports

The package is ESM-only and ships three subpath exports. Because each is a separate entry point, Node.js-specific code is never bundled into a browser build and vice versa — unless you explicitly import the wrong subpath.

| Import                   | Environment | Description                 |
| ------------------------ | ----------- | --------------------------- |
| `@webiny/stdlib`         | Any         | Platform-agnostic utilities |
| `@webiny/stdlib/node`    | Node.js     | Node.js-specific tools      |
| `@webiny/stdlib/browser` | Browser     | Browser-specific tools      |

---

## `@webiny/stdlib` — Common

| Feature                                                                              | Description                                                                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `Result` / `ResultAsync`                                                             | Typed success/failure values — synchronous and async                                        |
| `BaseError`                                                                          | Abstract base class for typed domain errors                                                 |
| `Logger` / `ConsoleLogger` / `ConsoleLoggerFeature`                                  | Logging abstraction + console implementation — [docs](src/common/features/Logger/README.md) |
| `Cache` / `MemoryCacheFeature`                                                       | Synchronous key-value cache — [docs](src/common/features/Cache/README.md)                   |
| `AsyncCache` / `AsyncMemoryCacheFeature`                                             | Async key-value cache — [docs](src/common/features/Cache/README.md)                         |
| `immutableGet` / `immutableSet` / `immutableDelete` / `mutableSet` / `mutableDelete` | Dot-notation get/set/delete on nested objects — [docs](src/common/utils/README.md#dotprop)  |
| `toBoolean` / `isTruthy` / `isFalsy`                                                 | Semantic boolean coercion — [docs](src/common/utils/README.md#boolean)                      |

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

---

## Versioning

The package version in `package.json` is always `0.0.0`. The real version is injected at publish time by the release pipeline using conventional commits: `feat` bumps the minor, everything else (`fix`, `chore`, `refactor`, …) bumps the patch. There are no major version bumps — breaking changes may land on minor releases.
