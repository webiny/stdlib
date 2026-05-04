# @webiny/utils-common

Platform-agnostic TypeScript utilities. No Node.js or browser APIs — safe to use in any environment (Node, browser, edge workers).

## Installation

```sh
npm install @webiny/utils-common
```

## Features

| Feature                                                 | Description                                               |
| ------------------------------------------------------- | --------------------------------------------------------- |
| [Cache / AsyncCache](src/features/Cache/README.md)      | Sync and async key-value caches with a `Result`-based API |
| [Logger / ConsoleLogger](src/features/Logger/README.md) | Shared `Logger` DI token + `console`-based implementation |

## Core types

| Type                | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `Result<T, E>`      | Typed result for operations that can fail without throwing |
| `ResultAsync<T, E>` | Async variant of `Result`                                  |
| `BaseError<TData>`  | Typed domain errors with a mandatory `code` literal        |
