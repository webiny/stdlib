# WorkspaceTool

Discovers workspaces defined in the nearest root `package.json`. Walks up from a given directory to find a `package.json` with a `workspaces` field, then resolves the glob patterns to return workspace metadata. Supports both flat array (`workspaces: ["packages/*"]`) and Yarn's object format (`workspaces: { packages: ["packages/*"] }`). Drop-in replacement for the `get-yarn-workspaces` package.

## Interface

- `list(params?: ListWorkspacesParams): WorkspaceInfo[]` — List all workspace directories. Returns `{ name, path }` for each workspace. Throws `WorkspaceRootNotFoundError` if no root `package.json` with `workspaces` is found.

### Types

- `ListWorkspacesParams` — `{ cwd?: string }`. Directory to start searching from. Defaults to `process.cwd()`.
- `WorkspaceInfo` — `{ name: string, path: string }`. Package name from the workspace's `package.json` (falls back to folder name), and absolute path.
- `WorkspaceRootNotFoundError` — Thrown when no `package.json` with a `workspaces` field is found walking up from `cwd`.

## Usage

### DI container wiring

```ts
import { Container } from "@webiny/di";
import { WorkspaceTool, WorkspaceToolFeature } from "@webiny/stdlib/node";

const container = new Container();
WorkspaceToolFeature.register(container);
const tool = container.resolve(WorkspaceTool);

const workspaces = tool.list({ cwd: "/path/to/monorepo" });
// [{ name: "@scope/pkg-a", path: "/path/to/monorepo/packages/pkg-a" }, ...]
```

### Factory function

```ts
import { createWorkspaceTool } from "@webiny/stdlib/node";

const tool = createWorkspaceTool();
const workspaces = tool.list();
```

### Standalone function

```ts
import { listWorkspaces } from "@webiny/stdlib/node";

const workspaces = listWorkspaces({ cwd: "/path/to/monorepo" });
// [{ name: "@scope/pkg-a", path: "/path/to/monorepo/packages/pkg-a" }, ...]
```
