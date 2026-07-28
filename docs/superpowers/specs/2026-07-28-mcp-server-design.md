# MCP Server for @webiny/stdlib

## Summary

Add an MCP server to `@webiny/stdlib` that helps AI agents discover and learn about available stdlib tools and features. Two MCP tools (`list_stdlib_skills` and `get_stdlib_skill`) provide a lazy-loading pattern where agents only load documentation they need for the current task.

## Decisions

- **Location:** New `src/mcp/` slice alongside `src/common/`, `src/node/`, `src/browser/`. This is dev infrastructure, not a user-facing library — it sits at the same level as other slices but serves a different purpose.
- **Architecture:** DI for core pieces (SkillDiscovery, McpServer, AgentConfigurator) using `features/<FeatureName>/` layout for consistency with repo conventions. Plain modules for agent adapters.
- **Skill source:** Front-matter added to existing feature READMEs + standalone SKILL.md files in `skills/` for cross-cutting topics.
- **Dependencies:** `@modelcontextprotocol/sdk` `^1.30.0`, `@11ty/gray-matter` `^2.1.0` as regular dependencies of `@webiny/stdlib`. Both are pure ESM, no peer dependency conflicts.
- **CLI:** `stdlib-mcp serve` and `stdlib-mcp configure` commands.
- **Agent support:** All 7 agents (Claude, Cursor, Cline, Copilot, Windsurf, Kiro, OpenCode).
- **Platform:** Node-specific slice. Uses `node:fs`, `node:path`, `node:readline`. tsconfig sets `types: ["node"]`.
- **Cross-slice imports:** The mcp slice uses Node built-ins directly (not stdlib's FileTool/DirectoryTool). It imports from `~/common/index.js` only for `createAbstraction` and `createFeature`.

## Source Layout

```
src/mcp/
├── index.ts                              # barrel exports
├── cli.ts                                # CLI entry with shebang
├── features/
│   ├── Server/
│   │   ├── abstractions/
│   │   │   ├── SkillDiscovery.ts         # ISkillDiscovery + token
│   │   │   ├── McpServer.ts              # IMcpServer + token
│   │   │   └── index.ts
│   │   ├── SkillDiscovery.ts             # impl: scan, parse @11ty/gray-matter, build catalog
│   │   ├── McpServer.ts                  # impl: register tools, stdio transport
│   │   ├── feature.ts                    # McpServerFeature
│   │   ├── README.md
│   │   └── index.ts
│   └── Configure/
│       ├── abstractions/
│       │   ├── AgentConfigurator.ts       # IAgentConfigurator + token
│       │   └── index.ts
│       ├── AgentConfigurator.ts           # impl: list agents, prompt, run init
│       ├── agents/                        # plain modules, no DI
│       │   ├── types.ts                   # AgentPreset, AgentModule interfaces
│       │   ├── shared.ts                  # writeMcpConfig, writeHintFile helpers
│       │   ├── claude.ts
│       │   ├── cursor.ts
│       │   ├── cline.ts
│       │   ├── copilot.ts
│       │   ├── windsurf.ts
│       │   ├── kiro.ts
│       │   └── opencode.ts
│       ├── feature.ts                    # AgentConfiguratorFeature
│       ├── README.md
│       └── index.ts
skills/                                   # cross-cutting skill files (repo root)
```

## MCP Tools

### `list_stdlib_skills`

- **Input:** none
- **Output:** Markdown catalog grouped by `context` field. Each context section has a heading and a table of `| Skill | Description |`. Skills sorted alphabetically within each group.
- **Annotations:** `{ readOnlyHint: true }`

Context group headings (rendered in this order):
- `common` — "Platform-agnostic utilities"
- `node` — "Node.js-specific tools"
- `browser` — "Browser-specific tools"
- `guides` — "Cross-cutting guides and patterns"

Any `context` value not in this list gets its own section at the end with the raw context value as heading.

### `get_stdlib_skill`

- **Input:** `{ topic: z.string().describe("Skill name from list_stdlib_skills") }` (zod is already a dependency of `@webiny/stdlib`)
- **Output:** Full markdown body (@11ty/gray-matter stripped via `matter(raw).content`, then `.trim()`).
- **Error response:** When skill name not found, return `{ isError: true, content: [{ type: "text", text: "Skill \"<name>\" not found. Available skills:\n- skill-a (common)\n- skill-b (node)\n..." }] }`. Lists all skills sorted alphabetically with context label.
- **Annotations:** `{ readOnlyHint: true }`

## Skill Discovery

### Sources and default scan paths

When `stdlib-mcp serve` runs, it resolves default skill paths relative to the **package root** (the directory containing `package.json`, resolved via `import.meta.url` walking up from `cli.js`):

1. **Standalone skills** — `${packageRoot}/skills/**/*.md` files with valid @11ty/gray-matter. Scanned first (higher priority).
2. **Feature READMEs** — `${packageRoot}/src/**/README.md` files with valid @11ty/gray-matter. Scanned second.

**Development vs installed resolution:** The server always tries `src/` first. If `src/` does not exist (npm-installed package), it falls back to `dist/`. This is unambiguous — there is no priority conflict because only one of the two directories exists in any given installation. During development `src/` exists and is used; in `node_modules/` only `dist/` exists.

The `skills/` directory must also be included in the published package. Add `"skills"` to the `files` array in `package.json` alongside `"dist"`.

**Missing directories:** If a scan root directory does not exist (`readdirSync` throws `ENOENT`), skip it silently and continue with remaining paths. This handles: empty projects, missing `skills/`, missing `src/` (before fallback to `dist/`).

### Scan precedence with flags

Full scan order (first match wins on name collision):

1. `--additional-skills=<path>` directories (if provided; multiple allowed, scanned in argument order)
2. `--skills=<path>` directories (if provided; replaces defaults below entirely)
3. Default: `${packageRoot}/skills/` then `${packageRoot}/src/` (or `dist/` if `src/` absent)

`--skills` and `--additional-skills` can both be used: additional-skills always come first regardless.

### Front-matter format

```yaml
---
name: file-tool
description: Read, write, copy, remove files. All paths must be absolute.
context: node
---
```

Required: `name` (non-empty string), `description` (non-empty string).
Optional: `context` (string, defaults to `"common"`).

Validation: empty strings for `name` or `description` are treated as missing — skip with `console.warn`.

### Error handling

- Files with no YAML @11ty/gray-matter: **skip silently**. Not every README needs @11ty/gray-matter — only those intended as skills.
- Files with @11ty/gray-matter but missing `name` or `description`: **skip with `console.warn`** noting the file path and missing field.
- Files with non-string `name`/`description`/`context`: **skip with `console.warn`**.
- Invalid YAML syntax in @11ty/gray-matter: **skip with `console.warn`** noting parse error.
- Unreadable files (permissions): **skip with `console.warn`**.

### Name collision

First match wins based on scan order. No logging for collisions — first match wins silently.

### Skill type

```ts
interface Skill {
    name: string;
    description: string;
    context: string;
    body: string; // markdown content after @11ty/gray-matter stripping, trimmed
}
```

## DI Structure

Token namespace: `"Mcp/"` — a new domain prefix for MCP infrastructure, distinct from `"Core/"` (platform-agnostic) and `"Node/"` (Node tools).

### SkillDiscoveryConfig

- **Abstraction:** `ISkillDiscoveryConfig` — `{ scanPaths: string[] }`
- **Token:** `"Mcp/SkillDiscoveryConfig"`
- **Registered as instance** in the CLI entry point after parsing flags. The CLI resolves default paths (package root + flag overrides) and registers the config before resolving McpServer.

### SkillDiscovery

- **Abstraction:** `ISkillDiscovery`
  - `discover(): Skill[]` — scans paths from injected config, returns all valid skills
- **Token:** `"Mcp/SkillDiscovery"`
- **Dependencies:** `[SkillDiscoveryConfig]`
- **Implementation:** Reads `config.scanPaths`, walks each directory recursively with `readdirSync` (skips missing directories silently), reads markdown files, parses @11ty/gray-matter with `@11ty/gray-matter` library (npm package `@11ty/gray-matter`).

### McpServer

- **Abstraction:** `IMcpServer`
  - `start(): Promise<void>` — registers tools, connects stdio transport, blocks until stdin closes. The MCP SDK handles the event loop — `start()` resolves only when the transport disconnects (stdin EOF or process signal). Callers should `await start()` and then exit.
- **Token:** `"Mcp/McpServer"`
- **Dependencies:** `[SkillDiscovery]`
- **Implementation:** Calls `skillDiscovery.discover()` in `start()` to build the skill cache (throws if discovery fails — propagates to CLI). Creates `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`, registers both tools, connects `StdioServerTransport`. The MCP SDK manages stdin/stdout lifecycle and handles unexpected disconnects. Any error from `discover()` or `connect()` rejects the `start()` promise.

### AgentConfigurator

- **Abstraction:** `IAgentConfigurator`
  - `configure(): Promise<void>` — presents agent list on stdout, reads selection from stdin via `node:readline`, runs the selected agent's `init` function. Returns after configuration completes. If `init()` throws, the error propagates to the CLI (which crashes with a stack trace — standard Node behavior).
- **Token:** `"Mcp/AgentConfigurator"`
- **Dependencies:** none
- **Implementation:** Imports all agent modules statically. Collects their `preset` objects, sorts by `displayName` alphabetically, and builds the selection menu. On selection, calls the agent's `init({ cwd: process.cwd() })` function.

## Agent Adapters

### AgentPreset type

```ts
interface AgentPreset {
    slug: string;          // lowercase alphanumeric + hyphens, e.g., "claude"
    displayName: string;   // human-readable, e.g., "Claude Code"
    configFile: string;    // relative path from cwd, may be nested, e.g., ".cursor/mcp.json"
    configKey: string;     // top-level key in config JSON, e.g., "mcpServers"
    hintFile?: string;     // relative path from cwd, e.g., "CLAUDE.md". Omitted when agent requires manual hint setup.
}

interface AgentModule {
    preset: AgentPreset;
    init: (params: { cwd: string }) => Promise<void>;
}
```

### Agent table

| Agent     | Slug       | Config file                        | Config key     | Hint file                        |
|-----------|------------|------------------------------------|----------------|----------------------------------|
| Claude    | `claude`   | `.mcp.json`                        | `mcpServers`   | `CLAUDE.md`                      |
| Cursor    | `cursor`   | `.cursor/mcp.json`                 | `mcpServers`   | `.cursor/rules/stdlib.mdc`       |
| Cline     | `cline`    | `.vscode/cline_mcp_settings.json`  | `mcpServers`   | _(none — manual)_                |
| Copilot   | `copilot`  | `.vscode/mcp.json`                 | `servers`      | `.github/copilot-instructions.md`|
| Windsurf  | `windsurf` | `.windsurf/mcp.json`               | `mcpServers`   | `.windsurf/rules/stdlib.md`      |
| Kiro      | `kiro`     | `.kiro/settings/mcp.json`          | `mcpServers`   | `AGENTS.md`                      |
| OpenCode  | `opencode` | `opencode.json`                    | `mcp`          | `AGENTS.md`                      |

Note: Cursor requires `.mdc` extension for rule files — this is a Cursor-specific convention, not standard markdown.

### Shared helpers

- **`writeMcpConfig({ cwd, configFile, configKey })`** — reads existing JSON (or `{}` if file missing), merges `stdlib` server entry under `configKey`, writes back with 2-space indent. Creates parent directories with `mkdirSync({ recursive: true })`. Skips if `stdlib` entry already exists under `configKey`. Throws on write failure (permissions, disk) — error propagates to CLI.
- **`writeHintFile({ cwd, hintFile, content })`** — appends hint block to markdown file. Creates file if missing. Uses marker string (`"list_stdlib_skills"`) to detect if already present — skips if found. Creates parent directories with `mkdirSync({ recursive: true })`. Ensures two trailing newlines before the appended block (reads existing content, appends `\n\n` + content if file doesn't end with blank line).
- **`stdlibHintBlock()`** — returns instruction text:

```markdown
## @webiny/stdlib MCP

This project uses `@webiny/stdlib`. An MCP server is available with tools for discovering stdlib features:

- `list_stdlib_skills` — returns a catalog of all available skills with names and descriptions. Call this first when working with @webiny/stdlib.
- `get_stdlib_skill` — loads full documentation for a specific skill by name.
```

### MCP config entry

Standard shape (most agents):
```json
{
  "mcpServers": {
    "stdlib": {
      "command": "npx",
      "args": ["stdlib-mcp", "serve"]
    }
  }
}
```

OpenCode uses a different shape:
```json
{
  "mcp": {
    "stdlib": {
      "type": "stdio",
      "command": ["npx", "stdlib-mcp", "serve"],
      "enabled": true
    }
  }
}
```

## Build Integration

### Existing tsconfig.common.json change

Add `"../src/mcp"` to the `exclude` array so the common slice does not compile mcp code:

```json
"exclude": ["../src/node", "../src/browser", "../src/mcp"]
```

### New tsconfig files

**`config/tsconfig.mcp.json`** (build):
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "../src/mcp",
    "outDir": "../dist/mcp",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "paths": { "~/*": ["../src/*"] }
  },
  "include": ["../src/mcp"],
  "references": [{ "path": "./tsconfig.common.json" }]
}
```

**`config/tsconfig.check.mcp.json`** (type-check):
```json
{
  "extends": ["./tsconfig.mcp.json", "./tsconfig.checkmode.json"],
  "include": ["../src/mcp", "../__tests__/mcp"]
}
```

### Root tsconfig.json

Add reference after browser: `{ "path": "./config/tsconfig.mcp.json" }`. Order: common, node, browser, mcp.

### package.json changes

- New subpath export: `"./mcp": { "import": "./dist/mcp/index.js", "types": "./dist/mcp/index.d.ts" }`
- New `bin` field (fresh addition — no existing `bin` in package.json): `"bin": { "stdlib-mcp": "./dist/mcp/cli.js" }`
- `typecheck` script: append `&& tsgo -p config/tsconfig.check.mcp.json`
- `files` array: `["dist", "skills"]` — skills directory must be published for npm consumers
- Dependencies: add `@modelcontextprotocol/sdk` `^1.30.0`, `@11ty/gray-matter` `^2.1.0`

### Build script

Update `scripts/features/BuildPackages/index.ts` slices array — append `"config/tsconfig.mcp.json"` after browser (last position). Build order: common, node, browser, mcp.

### CLI shebang

The `src/mcp/cli.ts` source file includes `#!/usr/bin/env node` as the first line. **Implementation step 1 (build integration) must verify** that tsgo preserves the shebang in `dist/mcp/cli.js` by running `head -1 dist/mcp/cli.js` after the first build. If tsgo strips it, add a `ensureShebang(distDir)` method to `BuildOrchestrator` that prepends `#!/usr/bin/env node\n` to `dist/mcp/cli.js` after `pathAliasRewriter.rewrite()` and before `artifactCopier.copy*()`.

npm automatically sets executable permissions on files referenced by the `bin` field during install/publish. No manual chmod needed.

### README.md files in dist

tsgo only emits `.js`, `.d.ts`, and `.map` files — it does NOT copy non-TS files like `README.md`. The build must copy all `README.md` files from `src/` into `dist/` so the server can discover them when installed as an npm package. Add a `copyReadmes(srcDir, distDir)` method to `BuildOrchestrator` that copies all `src/**/README.md` files to corresponding `dist/` paths (no @11ty/gray-matter filtering at build time — copy all, let the server filter at runtime). Run after compilation. This must be implemented in step 1 (build integration), not deferred.

## CLI Entry Point

`src/mcp/cli.ts`:

```ts
#!/usr/bin/env node
import { Container } from "@webiny/di";
// ... imports

const command = process.argv[2];

if (command === "serve") {
    const container = new Container();
    // register McpServerFeature, resolve McpServer, await start()
    // start() blocks until stdin closes
    // process exits naturally after start() resolves
} else if (command === "configure") {
    const container = new Container();
    // register AgentConfiguratorFeature, resolve AgentConfigurator, await configure()
} else {
    console.error("Usage: stdlib-mcp <serve|configure>");
    process.exit(1);
}
```

Top-level `await` in an ESM module. Unhandled rejections from `start()` or `configure()` crash the process with a stack trace (Node default behavior). No custom signal handlers needed — the MCP SDK handles SIGTERM/SIGINT for stdio transport cleanup.

## Testing

### SkillDiscovery tests (`__tests__/mcp/SkillDiscovery.test.ts`)

- Valid @11ty/gray-matter parsing (name, description, context extracted correctly)
- Default context value when omitted
- Missing @11ty/gray-matter: file skipped, no error
- Front-matter with missing `name`: skipped with warning
- Front-matter with missing `description`: skipped with warning
- Invalid YAML: skipped with warning
- Non-string field values: skipped with warning
- Directory scanning: finds README.md and SKILL.md recursively
- Name collision: first-scanned source wins
- Empty directory: returns empty array
- `body` field contains trimmed markdown content after @11ty/gray-matter stripping

### McpServer tests (`__tests__/mcp/McpServer.test.ts`)

- `list_stdlib_skills` returns markdown catalog grouped by context
- `list_stdlib_skills` with no skills returns `"No skills found."` text
- `list_stdlib_skills` skills sorted alphabetically within groups
- `get_stdlib_skill` returns trimmed body for valid skill name
- `get_stdlib_skill` returns error with available names for invalid name
- Tool registration (both tools registered with correct schemas and annotations)

Transport mocking: use `@modelcontextprotocol/sdk`'s in-memory transport or mock the `McpServer` class directly. Avoid stdio in tests.

### Agent adapter tests (`__tests__/mcp/Configure.test.ts`)

- `writeMcpConfig`: creates new file with correct structure, patches existing file preserving other entries, skips if stdlib entry exists, creates parent directories
- `writeHintFile`: creates new file, appends to existing, skips if marker present, creates parent directories
- Each agent's `init` writes correct config file path and hint file path
- OpenCode adapter writes different JSON shape (`type`, `command` array, `enabled`)
- Copilot adapter uses `servers` key instead of `mcpServers`

All tests use `tmpdir()` with cleanup in `afterEach`, following stdlib testing conventions.

## Skills Content

### Feature READMEs to update (all 22)

Add @11ty/gray-matter to each existing README.md:

| Feature | name | context |
|---------|------|---------|
| Cache | `cache` | `common` |
| Env | `env` | `common` |
| Logger | `logger` | `common` |
| boolean utils | `boolean` | `common` |
| dotProp utils | `dot-prop` | `common` |
| generateId utils | `generate-id` | `common` |
| mdbid utils | `mdbid` | `common` |
| uuid utils | `uuid` | `common` |
| utils (parent) | `utils` | `common` |
| DirectoryTool | `directory-tool` | `node` |
| FileTool | `file-tool` | `node` |
| HashFolderTool | `hash-folder-tool` | `node` |
| JsonFileTool | `json-file-tool` | `node` |
| NdJsonReaderTool | `ndjson-reader-tool` | `node` |
| PackageJsonFileTool | `package-json-file-tool` | `node` |
| PathTool | `path-tool` | `node` |
| PinoLogger | `pino-logger` | `node` |
| ProcessEnv | `process-env` | `node` |
| ReadStreamFactory | `read-stream-factory` | `node` |
| WorkspaceTool | `workspace-tool` | `node` |
| BrowserEnv | `browser-env` | `browser` |
| LocalStorageCache | `local-storage-cache` | `browser` |

### Cross-cutting skills to create in `skills/`

- `skills/di-patterns/SKILL.md` — DI system overview: abstractions, implementations, features, container wiring, optional dependencies
- `skills/adding-a-feature/SKILL.md` — step-by-step guide for adding a new tool (mirrors AGENTS.md section)
- `skills/testing-patterns/SKILL.md` — container setup, tmpdir patterns, browser env directives

## Rollout

1. Build integration: tsconfigs, package.json exports/bin/deps/files, build script slice, tsconfig.common.json exclude, README copy step, shebang verification. Run `yarn build` and confirm: `dist/mcp/cli.js` starts with shebang, `dist/**/README.md` files exist.
2. Implement SkillDiscoveryConfig + SkillDiscovery feature (abstraction + implementation + feature + README + tests)
3. Implement McpServer feature (abstraction + implementation + feature + README + tests)
4. Implement Configure feature with all 7 agent adapters (+ README + tests)
5. Add CLI entry point (wires DI, parses flags, registers SkillDiscoveryConfig)
6. Add @11ty/gray-matter to all 22 existing feature READMEs
7. Create 3 cross-cutting skill files in `skills/`
8. Run full pre-commit chain: `yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage`
9. Manual E2E: run `npx stdlib-mcp serve`, connect with MCP inspector, call `list_stdlib_skills` (expect grouped catalog), call `get_stdlib_skill` with valid name (expect body), call with invalid name (expect error with list)
10. Manual E2E: run `npx stdlib-mcp configure`, select Claude, verify `.mcp.json` has stdlib entry, verify `CLAUDE.md` has hint block
