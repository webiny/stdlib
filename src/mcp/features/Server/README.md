# MCP Server

Exposes `@webiny/stdlib` feature documentation as MCP tools for AI agent discovery. Two tools: `list_stdlib_skills` returns a grouped catalog; `get_stdlib_skill` loads full documentation for a specific skill.

## Interface

### SkillDiscovery

- `discover(): Skill[]` — scans configured directories for README.md and SKILL.md files with YAML front-matter (via `@11ty/gray-matter`). Returns parsed skills.

### McpServer

- `start(): Promise<void>` — starts the MCP server on stdio transport. Blocks until stdin closes.
- `startWithTransport(transport): Promise<void>` — starts with a custom transport (used for testing).

## Usage

```ts
import { Container } from "@webiny/di";
import { SkillDiscoveryConfig, McpServerFeature, McpServer } from "@webiny/stdlib/mcp";

const container = new Container();
container.registerInstance(SkillDiscoveryConfig, {
    scanPaths: ["./skills", "./src"]
});
McpServerFeature.register(container);

await container.resolve(McpServer).start();
```
