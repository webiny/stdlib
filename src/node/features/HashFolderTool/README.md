# HashFolderTool

Computes a deterministic SHA-256 hash of a folder's contents. Walks the directory tree recursively, hashes each file individually, sorts entries by relative path for deterministic ordering, then produces a single combined hex digest. Use it to detect whether a folder's contents have changed — for example, to skip redundant builds when source files haven't been modified.

Two methods: `hash` (synchronous) for small-to-medium folders, and `hashAsync` (parallel I/O) for large directory trees where concurrent reads improve throughput. Both return a `HashFolderResult` object.

## Interface

```ts
interface IHashFolderTool {
  /** Returns a result containing the hex-encoded SHA-256 hash (synchronous). */
  hash(folderPath: string, options?: HashFolderOptions): HashFolderResult;
  /** Parallel variant — reads files and subdirectories concurrently. */
  hashAsync(folderPath: string, options?: HashFolderOptions): Promise<HashFolderResult>;
}

interface HashFolderResult {
  /** Hex-encoded SHA-256 digest. */
  hash: string;
}

interface HashFolderOptions {
  /** Folder names to skip during traversal (e.g. "node_modules", "dist"). */
  excludeFolders?: string[];
  /** File names to skip (e.g. "tsconfig.build.tsbuildinfo"). */
  excludeFiles?: string[];
}
```

## Usage

### DI container wiring

```ts
import { Container } from "@webiny/di";
import { HashFolderTool, HashFolderToolFeature } from "@webiny/stdlib/node";

const container = new Container();
HashFolderToolFeature.register(container);

const tool = container.resolve(HashFolderTool);

// Sync
const { hash } = tool.hash("./packages/my-package", {
  excludeFolders: ["dist", "lib", "node_modules"],
  excludeFiles: ["tsconfig.build.tsbuildinfo"]
});

// Async (parallel I/O)
const { hash } = await tool.hashAsync("./packages/my-package", {
  excludeFolders: ["dist", "lib", "node_modules"],
  excludeFiles: ["tsconfig.build.tsbuildinfo"]
});
```

### Factory function

```ts
import { createHashFolderTool } from "@webiny/stdlib/node";

const tool = createHashFolderTool();
const { hash } = tool.hash("./packages/my-package", {
  excludeFolders: ["dist", "node_modules"]
});
```

### Standalone functions

```ts
import { hashFolder, hashFolderAsync } from "@webiny/stdlib/node";

// Sync
const { hash } = hashFolder("./packages/my-package", {
  excludeFolders: ["dist", "lib", "node_modules"],
  excludeFiles: ["tsconfig.build.tsbuildinfo"]
});

// Async (parallel I/O)
const { hash } = await hashFolderAsync("./packages/my-package", {
  excludeFolders: ["dist", "lib", "node_modules"],
  excludeFiles: ["tsconfig.build.tsbuildinfo"]
});
```
