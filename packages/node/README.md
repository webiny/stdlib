# @webiny/utils-node

Node.js utilities built on constructor injection. Depends on `@webiny/utils-common`.

## Installation

```sh
yarn add @webiny/utils-node
```

## Features

| Feature                                                           | Description                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [FileTool](src/features/FileTool/README.md)                       | Read, write, copy, and remove files                                                         |
| [DirectoryTool](src/features/DirectoryTool/README.md)             | Create, read, copy, remove, and glob directories                                            |
| [JsonFileTool](src/features/JsonFileTool/README.md)               | Read and write JSON files with optional schema validation                                   |
| [PathTool](src/features/PathTool/README.md)                       | Injectable `node:path` wrapper (`join`, `resolve`, `dirname`, `basename`)                   |
| [PinoLogger](src/features/PinoLogger/README.md)                   | Pino-based `Logger` implementation                                                          |
| [NdJsonReaderTool](src/features/NdJsonReaderTool/README.md)       | Stream-parse NDJSON from files, streams, or line iterables with resumption via line numbers |
| [ReadStreamFactory](src/features/ReadStreamFactory/README.md)     | Disposable `node:fs` read streams with `AsyncDisposable` / `await using`                    |
| [PackageJsonFileTool](src/features/PackageJsonFileTool/README.md) | Read, validate, mutate, and write `package.json` files                                      |
