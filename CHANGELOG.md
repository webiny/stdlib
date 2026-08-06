# @webiny/stdlib

## 0.0.17

### Patch Changes

- 64aa022: register GlobTool via DirectoryTool feature

## 0.0.16

### Patch Changes

- 477e31a: Add GlobTool to the available tools - replaces fast-glob

## 0.0.15

### Patch Changes

- b425764: Replace filesystem-scanning skill discovery with a build-time manifest. The build now generates `skills.json` at the package root with metadata (name, description, context, path) for each skill. The MCP server reads the manifest on startup and loads skill bodies on demand, eliminating recursive directory walking at runtime.

## 0.0.14

### Patch Changes

- d5bc832: Fix broken `stdlib-mcp` bin entry in published package

  The build script's `ArtifactCopier` rewrites `main`, `types`, and `exports` paths when copying `package.json` into `dist/`, but was not rewriting `bin` entries. Since the package publishes from `dist/` (via `publishConfig.directory`), the bin path `./dist/mcp/cli.js` resolved to the nonexistent `dist/dist/mcp/cli.js`, causing `npx -y @webiny/stdlib stdlib-mcp` to fail with `command not found`. The `bin` field is now rewritten with the same `stripDist()` logic as the other path fields.

## 0.0.13

### Patch Changes

- 3fb0ed7: feat: add MCP server for AI agent skill discovery (`stdlib-mcp serve` / `stdlib-mcp configure`)

## 0.0.12

### Patch Changes

- 3b7c40e: Add WorkspaceTool for discovering workspaces from root package.json (drop-in replacement for get-yarn-workspaces)

## 0.0.11

### Patch Changes

- 809c44a: Replace `await using` / `AsyncDisposable` on `ReadStreamFactory` with explicit `destroy()` method for bundler compatibility

## 0.0.10

### Patch Changes

- 93f9f83: Add `createProcessEnv()` and `createBrowserEnv()` factory functions for using Env implementations outside of DI.

## 0.0.9

### Patch Changes

- 2f17d08: Add `Env` abstraction for typed environment variable access with `getString`, `getNumber`, and `getBoolean` families (each with bare, default, and OrThrow variants). Node implementation (`ProcessEnvFeature`) reads from `process.env`; browser implementation (`BrowserEnvFeature`) accepts an injected variables object.

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
