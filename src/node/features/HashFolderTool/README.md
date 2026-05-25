# HashFolderTool

Computes a deterministic SHA-256 hash of a folder's contents. Walks the directory tree recursively, hashes each file individually, sorts entries by relative path for deterministic ordering, then produces a single combined hex digest. Use it to detect whether a folder's contents have changed — for example, to skip redundant builds when source files haven't been modified.

## Interface

```ts
interface IHashFolderTool {
  /** Returns a hex-encoded SHA-256 hash representing the folder's contents. */
  hash(folderPath: string, options?: HashFolderOptions): Promise<string>;
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
const hash = await tool.hash("./packages/my-package", {
  excludeFolders: ["dist", "lib", "node_modules"],
  excludeFiles: ["tsconfig.build.tsbuildinfo"]
});
```

### Factory function

```ts
import { createHashFolderTool } from "@webiny/stdlib/node";

const tool = createHashFolderTool();
const hash = await tool.hash("./packages/my-package", {
  excludeFolders: ["dist", "node_modules"]
});
```

### Standalone function

```ts
import { hashFolder } from "@webiny/stdlib/node";

const hash = await hashFolder("./packages/my-package", {
  excludeFolders: ["dist", "lib", "node_modules"],
  excludeFiles: ["tsconfig.build.tsbuildinfo"]
});
```
