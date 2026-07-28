---
name: mcp-configure
description: Interactive CLI that configures AI agents to use the stdlib MCP server.
context: guides
---

# Configure

Interactive CLI that configures AI agents to use the stdlib MCP server. Supports Claude Code, Cursor, Cline, GitHub Copilot, Windsurf, Kiro, and OpenCode.

## Interface

- `configure(): Promise<void>` — presents agent selection menu, writes MCP config and hint files for the chosen agent.

## Usage

```ts
import { Container } from "@webiny/di";
import { AgentConfiguratorFeature, AgentConfigurator } from "@webiny/stdlib/mcp";

const container = new Container();
AgentConfiguratorFeature.register(container);

await container.resolve(AgentConfigurator).configure();
```
