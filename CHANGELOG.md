# @webiny/stdlib

## 0.0.8

### Patch Changes

- a77c5eb: Updated dependencies to their latest versions.

## 0.0.7

### Patch Changes

- 5924242: Add nanoid-based ID generators: `generateId`, `generateAlphaNumericId`, `generateAlphaNumericLowerCaseId`, `generateAlphaId`, `generateAlphaLowerCaseId`, `generateAlphaUpperCaseId`. All accept an optional `size` parameter (default 21). Import from `@webiny/stdlib`.

## 0.0.6

### Patch Changes

- 17a0aeb: Add `mdbid` utility that generates MongoDB-compatible ObjectId hex strings via `bson-objectid`. Import from `@webiny/stdlib` — no DI setup required.

## 0.0.5

### Patch Changes

- 5fa60fc: feat(common): add uuid v4 generator with native randomUUID and getRandomValues fallback

## 0.0.4

### Patch Changes

- 36d941e: feat: add HashFolderTool — deterministic SHA-256 folder hashing with sync and async (parallel I/O) methods, replacing the unmaintained folder-hash library

## 0.0.3

### Patch Changes

- fd576ba: refactor: add array index support to immutableDelete and mutableDelete

## 0.0.2

### Patch Changes

- 7b96df9: v0.0.2

## 0.0.1

### Patch Changes

- 4baee5b: Initial release of @webiny/stdlib — platform-agnostic, Node.js, and browser utilities built on @webiny/di dependency injection.

  Includes Result/ResultAsync types, BaseError, Logger (Console + Pino), Cache (Memory + AsyncMemory + LocalStorage), FileTool, DirectoryTool, JsonFileTool, PathTool, NdJsonReaderTool, ReadStreamFactory, and PackageJsonFileTool.
