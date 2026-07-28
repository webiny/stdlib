# MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an MCP server to `@webiny/stdlib` that exposes `list_stdlib_skills` and `get_stdlib_skill` tools for AI agent skill discovery.

**Architecture:** New `src/mcp/` slice with DI-based features (SkillDiscovery, McpServer, AgentConfigurator). Plain modules for 7 agent adapters. CLI entry point dispatches `serve` and `configure` commands. Skills sourced from feature READMEs (with front-matter) and standalone SKILL.md files.

**Tech Stack:** `@modelcontextprotocol/sdk` ^1.30.0, `@11ty/gray-matter` ^2.1.0, `zod` (existing dep), `@webiny/di` (existing dep)

## Global Constraints

- All source imports use `.js` extensions (tsgo resolves to `.ts`)
- Cross-slice imports via `~/common/index.js` path alias
- DI tokens use `"Mcp/"` domain prefix
- All DI registrations use `.inSingletonScope()`
- Namespace pattern: `namespace ToolName { export type Interface = IToolName }`
- Named exports only (no default exports)
- Tests use `PinoLoggerConfig` with `logLevel: "error"` to silence logs
- Feature folders require `README.md`
- Pre-commit chain: `yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage`

**Spec:** `docs/superpowers/specs/2026-07-28-mcp-server-design.md`

---

### Task 1: Build Integration

**Files:**
- Modify: `config/tsconfig.common.json` (add `../src/mcp` to exclude)
- Create: `config/tsconfig.mcp.json`
- Create: `config/tsconfig.check.mcp.json`
- Modify: `tsconfig.json` (add mcp reference)
- Modify: `package.json` (exports, bin, deps, files, typecheck script)
- Modify: `scripts/features/BuildPackages/index.ts` (add mcp slice)
- Modify: `scripts/features/BuildPackages/BuildOrchestrator.ts` (add copyReadmes + ensureShebang)
- Modify: `scripts/features/BuildPackages/abstractions/BuildOrchestrator.ts` (if interface needs update)
- Create: `src/mcp/index.ts` (empty barrel — placeholder so tsgo has something to compile)

**Interfaces:**
- Consumes: existing build infrastructure
- Produces: compilable mcp slice, `dist/mcp/` output directory, `dist/**/README.md` copies

- [ ] **Step 1: Install dependencies**

```bash
yarn add @modelcontextprotocol/sdk@^1.30.0 @11ty/gray-matter@^2.1.0
```

- [ ] **Step 2: Add mcp exclude to tsconfig.common.json**

In `config/tsconfig.common.json`, add `"../src/mcp"` to the exclude array:

```json
"exclude": ["../src/node", "../src/browser", "../src/mcp"]
```

- [ ] **Step 3: Create config/tsconfig.mcp.json**

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

- [ ] **Step 4: Create config/tsconfig.check.mcp.json**

```json
{
  "extends": ["./tsconfig.mcp.json", "./tsconfig.checkmode.json"],
  "include": ["../src/mcp", "../__tests__/mcp"]
}
```

- [ ] **Step 5: Add mcp reference to root tsconfig.json**

Add after the browser reference:

```json
{ "path": "./config/tsconfig.mcp.json" }
```

- [ ] **Step 6: Update package.json**

Add to `exports`:
```json
"./mcp": {
  "import": "./dist/mcp/index.js",
  "types": "./dist/mcp/index.d.ts"
}
```

Add `bin` field:
```json
"bin": {
  "stdlib-mcp": "./dist/mcp/cli.js"
}
```

Add `"skills"` to `files` array: `["dist", "skills"]`

Append to `typecheck` script: `&& tsgo -p config/tsconfig.check.mcp.json`

- [ ] **Step 7: Create placeholder src/mcp/index.ts**

```ts
// MCP server barrel — populated as features are implemented.
```

- [ ] **Step 8: Add mcp slice to build script**

In `scripts/features/BuildPackages/index.ts`, append to slices array:

```ts
slices: [
    "config/tsconfig.common.json",
    "config/tsconfig.node.json",
    "config/tsconfig.browser.json",
    "config/tsconfig.mcp.json"
]
```

- [ ] **Step 9: Add copyReadmes and ensureShebang to BuildOrchestrator**

Read `scripts/features/BuildPackages/BuildOrchestrator.ts` and `scripts/features/BuildPackages/abstractions/BuildOrchestrator.ts`.

In the orchestrator's `run()` method, after `this.pathAliasRewriter.rewrite(distDir)` and before artifact copies, add two new private methods and call them:

```ts
private copyReadmes(rootDir: string): void {
    const srcDir = join(rootDir, "src");
    const distDir = join(rootDir, "dist");
    this.walkForReadmes(srcDir, srcDir, distDir);
}

private walkForReadmes(baseDir: string, dir: string, distDir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            this.walkForReadmes(baseDir, fullPath, distDir);
        } else if (entry.name === "README.md") {
            const relPath = relative(baseDir, fullPath);
            const destPath = join(distDir, relPath);
            mkdirSync(dirname(destPath), { recursive: true });
            copyFileSync(fullPath, destPath);
        }
    }
}

private ensureShebang(rootDir: string): void {
    const cliPath = join(rootDir, "dist", "mcp", "cli.js");
    if (!existsSync(cliPath)) {
        return;
    }
    const content = readFileSync(cliPath, "utf-8");
    if (!content.startsWith("#!")) {
        writeFileSync(cliPath, "#!/usr/bin/env node\n" + content);
    }
}
```

Add needed imports at top: `readdirSync`, `relative`, `dirname`, `copyFileSync`, `existsSync`, `readFileSync`, `writeFileSync` from `node:fs` and `node:path`.

Call in `run()`:

```ts
this.copyReadmes(rootDir);
this.ensureShebang(rootDir);
```

- [ ] **Step 10: Build and verify**

```bash
yarn build
```

Verify:
```bash
ls dist/mcp/index.js
head -1 dist/mcp/cli.js 2>/dev/null || echo "no cli yet (expected)"
find dist -name "README.md" | head -5
```

- [ ] **Step 11: Run typecheck**

```bash
yarn typecheck
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(mcp): add build integration for mcp slice

Add tsconfig.mcp.json, package.json exports/bin/deps, build script
slice, and BuildOrchestrator steps for copying READMEs and ensuring
CLI shebang."
```

---

### Task 2: SkillDiscovery Feature

**Files:**
- Create: `src/mcp/features/Server/abstractions/SkillDiscovery.ts`
- Create: `src/mcp/features/Server/abstractions/SkillDiscoveryConfig.ts`
- Create: `src/mcp/features/Server/abstractions/index.ts`
- Create: `src/mcp/features/Server/SkillDiscovery.ts`
- Create: `__tests__/mcp/SkillDiscovery.test.ts`

**Interfaces:**
- Consumes: `createAbstraction` from `~/common/index.js`
- Produces: `SkillDiscovery` token, `SkillDiscoveryConfig` token, `Skill` type, `SkillDiscoveryImpl` implementation

- [ ] **Step 1: Write the failing test**

Create `__tests__/mcp/SkillDiscovery.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import {
    SkillDiscovery,
    SkillDiscoveryConfig
} from "../../src/mcp/features/Server/index.js";
import type { Skill } from "../../src/mcp/features/Server/abstractions/SkillDiscovery.js";

function makeContainer(scanPaths: string[]): Container {
    const container = new Container();
    container.registerInstance(SkillDiscoveryConfig, { scanPaths });
    container.register(SkillDiscovery).inSingletonScope();
    return container;
}

describe("SkillDiscovery", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should parse valid front-matter from README.md", () => {
        const dir = join(tmpDir, "features", "Foo");
        mkdirSync(dir, { recursive: true });
        writeFileSync(
            join(dir, "README.md"),
            "---\nname: foo-tool\ndescription: Does foo things.\ncontext: node\n---\n\n# FooTool\n\nContent here."
        );

        const discovery = makeContainer([tmpDir]).resolve(SkillDiscovery);
        const skills = discovery.discover();

        expect(skills).toHaveLength(1);
        expect(skills[0]).toEqual({
            name: "foo-tool",
            description: "Does foo things.",
            context: "node",
            body: "# FooTool\n\nContent here."
        });
    });

    it("should default context to common when omitted", () => {
        mkdirSync(join(tmpDir, "a"), { recursive: true });
        writeFileSync(
            join(tmpDir, "a", "README.md"),
            "---\nname: bar\ndescription: Bar desc.\n---\n\nBody."
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills[0]!.context).toBe("common");
    });

    it("should skip files without front-matter", () => {
        mkdirSync(join(tmpDir, "b"), { recursive: true });
        writeFileSync(join(tmpDir, "b", "README.md"), "# No front-matter\n\nJust content.");

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
    });

    it("should skip files with missing name", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mkdirSync(join(tmpDir, "c"), { recursive: true });
        writeFileSync(
            join(tmpDir, "c", "README.md"),
            "---\ndescription: Missing name.\n---\n\nBody."
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("should skip files with missing description", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mkdirSync(join(tmpDir, "d"), { recursive: true });
        writeFileSync(
            join(tmpDir, "d", "README.md"),
            "---\nname: no-desc\n---\n\nBody."
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("should skip files with empty name", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mkdirSync(join(tmpDir, "e"), { recursive: true });
        writeFileSync(
            join(tmpDir, "e", "README.md"),
            '---\nname: ""\ndescription: Empty name.\n---\n\nBody.'
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
        spy.mockRestore();
    });

    it("should skip files with non-string name", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mkdirSync(join(tmpDir, "f"), { recursive: true });
        writeFileSync(
            join(tmpDir, "f", "README.md"),
            "---\nname: 42\ndescription: Numeric name.\n---\n\nBody."
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
        spy.mockRestore();
    });

    it("should discover SKILL.md files", () => {
        mkdirSync(join(tmpDir, "guides"), { recursive: true });
        writeFileSync(
            join(tmpDir, "guides", "SKILL.md"),
            "---\nname: di-patterns\ndescription: DI guide.\ncontext: guides\n---\n\n# DI"
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(1);
        expect(skills[0]!.name).toBe("di-patterns");
    });

    it("should handle name collision with first-match-wins", () => {
        const dir1 = join(tmpDir, "first");
        const dir2 = join(tmpDir, "second");
        mkdirSync(dir1, { recursive: true });
        mkdirSync(dir2, { recursive: true });
        writeFileSync(
            join(dir1, "SKILL.md"),
            "---\nname: dupe\ndescription: First.\n---\n\nFirst body."
        );
        writeFileSync(
            join(dir2, "SKILL.md"),
            "---\nname: dupe\ndescription: Second.\n---\n\nSecond body."
        );

        const skills = makeContainer([dir1, dir2]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(1);
        expect(skills[0]!.description).toBe("First.");
    });

    it("should return empty array for empty directory", () => {
        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
    });

    it("should skip missing directories silently", () => {
        const missing = join(tmpDir, "nonexistent");
        const skills = makeContainer([missing]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
    });

    it("should trim body whitespace", () => {
        mkdirSync(join(tmpDir, "g"), { recursive: true });
        writeFileSync(
            join(tmpDir, "g", "README.md"),
            "---\nname: trimmed\ndescription: Trim test.\n---\n\n  Body with spaces.  \n\n"
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills[0]!.body).toBe("Body with spaces.");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
yarn test -- __tests__/mcp/SkillDiscovery.test.ts
```

Expected: FAIL — modules don't exist.

- [ ] **Step 3: Create abstractions**

Create `src/mcp/features/Server/abstractions/SkillDiscoveryConfig.ts`:

```ts
import { createAbstraction } from "~/common/index.js";

export interface ISkillDiscoveryConfig {
    scanPaths: string[];
}

export const SkillDiscoveryConfig = createAbstraction<ISkillDiscoveryConfig>(
    "Mcp/SkillDiscoveryConfig"
);

export namespace SkillDiscoveryConfig {
    export type Interface = ISkillDiscoveryConfig;
}
```

Create `src/mcp/features/Server/abstractions/SkillDiscovery.ts`:

```ts
import { createAbstraction } from "~/common/index.js";

export interface Skill {
    name: string;
    description: string;
    context: string;
    body: string;
}

export interface ISkillDiscovery {
    discover(): Skill[];
}

export const SkillDiscovery = createAbstraction<ISkillDiscovery>(
    "Mcp/SkillDiscovery"
);

export namespace SkillDiscovery {
    export type Interface = ISkillDiscovery;
}
```

Create `src/mcp/features/Server/abstractions/index.ts`:

```ts
export { SkillDiscovery, type Skill } from "./SkillDiscovery.js";
export { SkillDiscoveryConfig } from "./SkillDiscoveryConfig.js";
```

- [ ] **Step 4: Create implementation**

Create `src/mcp/features/Server/SkillDiscovery.ts`:

```ts
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "@11ty/gray-matter";
import {
    SkillDiscovery as SkillDiscoveryAbstraction,
    type Skill
} from "./abstractions/SkillDiscovery.js";
import { SkillDiscoveryConfig } from "./abstractions/SkillDiscoveryConfig.js";

class SkillDiscoveryImpl implements SkillDiscoveryAbstraction.Interface {
    public constructor(
        private readonly config: SkillDiscoveryConfig.Interface
    ) {}

    public discover(): Skill[] {
        const seen = new Set<string>();
        const skills: Skill[] = [];

        for (const scanPath of this.config.scanPaths) {
            if (!existsSync(scanPath)) {
                continue;
            }
            this.walk(scanPath, seen, skills);
        }

        return skills;
    }

    private walk(dir: string, seen: Set<string>, skills: Skill[]): void {
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                this.walk(fullPath, seen, skills);
            } else if (entry.name === "README.md" || entry.name === "SKILL.md") {
                this.tryParseSkill(fullPath, seen, skills);
            }
        }
    }

    private tryParseSkill(
        filePath: string,
        seen: Set<string>,
        skills: Skill[]
    ): void {
        let raw: string;
        try {
            raw = readFileSync(filePath, "utf-8");
        } catch {
            console.warn(`Skipping unreadable file: ${filePath}`);
            return;
        }

        if (!matter.test(raw)) {
            return;
        }

        let parsed;
        try {
            parsed = matter(raw);
        } catch {
            console.warn(`Skipping ${filePath}: invalid YAML front-matter`);
            return;
        }

        const { name, description, context } = parsed.data as Record<string, unknown>;

        if (typeof name !== "string" || name === "") {
            console.warn(`Skipping ${filePath}: missing or empty "name" field`);
            return;
        }

        if (typeof description !== "string" || description === "") {
            console.warn(`Skipping ${filePath}: missing or empty "description" field`);
            return;
        }

        if (context !== undefined && typeof context !== "string") {
            console.warn(`Skipping ${filePath}: "context" must be a string`);
            return;
        }

        if (seen.has(name)) {
            return;
        }

        seen.add(name);
        skills.push({
            name,
            description,
            context: typeof context === "string" ? context : "common",
            body: parsed.content.trim()
        });
    }
}

export const SkillDiscovery = SkillDiscoveryAbstraction.createImplementation({
    implementation: SkillDiscoveryImpl,
    dependencies: [SkillDiscoveryConfig]
});
```

- [ ] **Step 5: Create feature index (no feature.ts yet — McpServer feature will wire both)**

Create `src/mcp/features/Server/index.ts`:

```ts
export { SkillDiscovery, SkillDiscoveryConfig, type Skill } from "./abstractions/index.js";
export { SkillDiscovery as SkillDiscoveryImpl } from "./SkillDiscovery.js";
```

- [ ] **Step 6: Update barrel**

Update `src/mcp/index.ts`:

```ts
export {
    SkillDiscovery,
    SkillDiscoveryConfig,
    type Skill
} from "./features/Server/index.js";
```

- [ ] **Step 7: Run test to verify it passes**

```bash
yarn test -- __tests__/mcp/SkillDiscovery.test.ts
```

Expected: all 11 tests PASS.

- [ ] **Step 8: Run typecheck**

```bash
yarn typecheck
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(mcp): add SkillDiscovery feature

Scans directories for README.md and SKILL.md files with YAML
YAML front-matter via @11ty/gray-matter. Extracts name, description,
context, and body. First-match-wins on name collision. Skips missing
directories and invalid front-matter with warnings."
```

---

### Task 3: McpServer Feature

**Files:**
- Create: `src/mcp/features/Server/abstractions/McpServer.ts` (add to abstractions/index.ts)
- Create: `src/mcp/features/Server/McpServer.ts`
- Create: `src/mcp/features/Server/feature.ts`
- Create: `src/mcp/features/Server/README.md`
- Modify: `src/mcp/features/Server/index.ts` (add McpServer exports)
- Modify: `src/mcp/index.ts` (add McpServer exports)
- Create: `__tests__/mcp/McpServer.test.ts`

**Interfaces:**
- Consumes: `SkillDiscovery` token, `Skill` type from Task 2
- Produces: `McpServer` token, `McpServerFeature`, `list_stdlib_skills` tool, `get_stdlib_skill` tool

- [ ] **Step 1: Write the failing test**

Create `__tests__/mcp/McpServer.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { Container } from "@webiny/di";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
    SkillDiscoveryConfig,
    McpServer,
    McpServerFeature
} from "../../src/mcp/index.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach } from "vitest";

describe("McpServer", () => {
    let tmpDir: string;
    let client: Client;
    let cleanup: () => Promise<void>;

    async function startServer(scanPaths: string[]): Promise<Client> {
        const container = new Container();
        container.registerInstance(SkillDiscoveryConfig, { scanPaths });
        McpServerFeature.register(container);
        const server = container.resolve(McpServer);

        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

        const c = new Client({ name: "test-client", version: "1.0.0" });
        await server.startWithTransport(serverTransport);
        await c.connect(clientTransport);

        cleanup = async () => {
            await c.close();
        };

        return c;
    }

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-server-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(async () => {
        rmSync(tmpDir, { recursive: true, force: true });
        if (cleanup) {
            await cleanup();
        }
    });

    it("should list tools", async () => {
        client = await startServer([tmpDir]);
        const result = await client.listTools();

        const names = result.tools.map(t => t.name);
        expect(names).toContain("list_stdlib_skills");
        expect(names).toContain("get_stdlib_skill");
    });

    it("should return grouped catalog from list_stdlib_skills", async () => {
        mkdirSync(join(tmpDir, "a"), { recursive: true });
        mkdirSync(join(tmpDir, "b"), { recursive: true });
        writeFileSync(
            join(tmpDir, "a", "README.md"),
            "---\nname: alpha\ndescription: Alpha tool.\ncontext: node\n---\n\nAlpha body."
        );
        writeFileSync(
            join(tmpDir, "b", "README.md"),
            "---\nname: beta\ndescription: Beta tool.\ncontext: common\n---\n\nBeta body."
        );

        client = await startServer([tmpDir]);
        const result = await client.callTool({ name: "list_stdlib_skills", arguments: {} });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toContain("alpha");
        expect(text).toContain("beta");
        expect(text).toContain("Node.js-specific tools");
        expect(text).toContain("Platform-agnostic utilities");
    });

    it("should return 'No skills found.' for empty catalog", async () => {
        client = await startServer([tmpDir]);
        const result = await client.callTool({ name: "list_stdlib_skills", arguments: {} });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toBe("No skills found.");
    });

    it("should return skill body from get_stdlib_skill", async () => {
        mkdirSync(join(tmpDir, "c"), { recursive: true });
        writeFileSync(
            join(tmpDir, "c", "README.md"),
            "---\nname: gamma\ndescription: Gamma.\ncontext: node\n---\n\nGamma content here."
        );

        client = await startServer([tmpDir]);
        const result = await client.callTool({
            name: "get_stdlib_skill",
            arguments: { topic: "gamma" }
        });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toBe("Gamma content here.");
    });

    it("should return error for unknown skill name", async () => {
        mkdirSync(join(tmpDir, "d"), { recursive: true });
        writeFileSync(
            join(tmpDir, "d", "README.md"),
            "---\nname: delta\ndescription: Delta.\n---\n\nDelta body."
        );

        client = await startServer([tmpDir]);
        const result = await client.callTool({
            name: "get_stdlib_skill",
            arguments: { topic: "nonexistent" }
        });

        expect(result.isError).toBe(true);
        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        expect(text).toContain("not found");
        expect(text).toContain("delta");
    });

    it("should sort skills alphabetically within groups", async () => {
        mkdirSync(join(tmpDir, "z"), { recursive: true });
        mkdirSync(join(tmpDir, "a"), { recursive: true });
        writeFileSync(
            join(tmpDir, "z", "README.md"),
            "---\nname: zebra\ndescription: Zebra.\ncontext: node\n---\n\nZ."
        );
        writeFileSync(
            join(tmpDir, "a", "README.md"),
            "---\nname: ant\ndescription: Ant.\ncontext: node\n---\n\nA."
        );

        client = await startServer([tmpDir]);
        const result = await client.callTool({ name: "list_stdlib_skills", arguments: {} });

        const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
        const antIdx = text.indexOf("ant");
        const zebraIdx = text.indexOf("zebra");
        expect(antIdx).toBeLessThan(zebraIdx);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
yarn test -- __tests__/mcp/McpServer.test.ts
```

Expected: FAIL — modules don't exist.

- [ ] **Step 3: Create McpServer abstraction**

Create `src/mcp/features/Server/abstractions/McpServer.ts`:

```ts
import { createAbstraction } from "~/common/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export interface IMcpServer {
    start(): Promise<void>;
    startWithTransport(transport: Transport): Promise<void>;
}

export const McpServer = createAbstraction<IMcpServer>("Mcp/McpServer");

export namespace McpServer {
    export type Interface = IMcpServer;
}
```

Update `src/mcp/features/Server/abstractions/index.ts`:

```ts
export { SkillDiscovery, type Skill } from "./SkillDiscovery.js";
export { SkillDiscoveryConfig } from "./SkillDiscoveryConfig.js";
export { McpServer } from "./McpServer.js";
```

- [ ] **Step 4: Create McpServer implementation**

Create `src/mcp/features/Server/McpServer.ts`:

```ts
import { McpServer as SdkMcpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { McpServer as McpServerAbstraction } from "./abstractions/McpServer.js";
import {
    SkillDiscovery,
    type Skill
} from "./abstractions/SkillDiscovery.js";

const CONTEXT_HEADINGS: Record<string, string> = {
    common: "Platform-agnostic utilities",
    node: "Node.js-specific tools",
    browser: "Browser-specific tools",
    guides: "Cross-cutting guides and patterns"
};

const CONTEXT_ORDER = ["common", "node", "browser", "guides"];

function buildCatalog(skills: Skill[]): string {
    if (skills.length === 0) {
        return "No skills found.";
    }

    const groups = new Map<string, Skill[]>();
    for (const skill of skills) {
        const existing = groups.get(skill.context);
        if (existing) {
            existing.push(skill);
        } else {
            groups.set(skill.context, [skill]);
        }
    }

    for (const [, group] of groups) {
        group.sort((a, b) => a.name.localeCompare(b.name));
    }

    const sections: string[] = [];
    const orderedContexts = [
        ...CONTEXT_ORDER.filter(c => groups.has(c)),
        ...[...groups.keys()].filter(c => !CONTEXT_ORDER.includes(c)).sort()
    ];

    for (const ctx of orderedContexts) {
        const heading = CONTEXT_HEADINGS[ctx] ?? ctx;
        const group = groups.get(ctx)!;
        const rows = group.map(s => `| ${s.name} | ${s.description} |`).join("\n");
        sections.push(`## ${heading}\n\n| Skill | Description |\n|-------|-------------|\n${rows}`);
    }

    return sections.join("\n\n");
}

class McpServerImpl implements McpServerAbstraction.Interface {
    public constructor(
        private readonly skillDiscovery: SkillDiscovery.Interface
    ) {}

    public async start(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.startWithTransport(transport);
    }

    public async startWithTransport(transport: Transport): Promise<void> {
        const skills = this.skillDiscovery.discover();
        const skillMap = new Map<string, Skill>();
        for (const skill of skills) {
            skillMap.set(skill.name, skill);
        }

        const server = new SdkMcpServer(
            { name: "stdlib", version: "1.0.0" }
        );

        server.registerTool("list_stdlib_skills", {
            title: "List stdlib skills",
            description:
                "Returns a catalog of all available @webiny/stdlib skills. Call this first when working with @webiny/stdlib, then call get_stdlib_skill to load a specific skill.",
            annotations: { readOnlyHint: true }
        }, () => ({
            content: [{ type: "text" as const, text: buildCatalog(skills) }]
        }));

        server.registerTool("get_stdlib_skill", {
            title: "Get stdlib skill",
            description:
                "Loads full documentation for a specific @webiny/stdlib skill. Call list_stdlib_skills first to see available names.",
            inputSchema: { topic: z.string().describe("Skill name from list_stdlib_skills") },
            annotations: { readOnlyHint: true }
        }, ({ topic }) => {
            const skill = skillMap.get(topic);
            if (!skill) {
                const available = [...skillMap.keys()]
                    .sort()
                    .map(n => {
                        const s = skillMap.get(n)!;
                        return `- ${n} (${s.context})`;
                    })
                    .join("\n");
                return {
                    isError: true,
                    content: [{
                        type: "text" as const,
                        text: `Skill "${topic}" not found. Available skills:\n${available}`
                    }]
                };
            }
            return {
                content: [{ type: "text" as const, text: skill.body }]
            };
        });

        await server.connect(transport);
    }
}

export const McpServer = McpServerAbstraction.createImplementation({
    implementation: McpServerImpl,
    dependencies: [SkillDiscovery]
});
```

- [ ] **Step 5: Create feature.ts**

Create `src/mcp/features/Server/feature.ts`:

```ts
import { createFeature } from "~/common/index.js";
import { SkillDiscovery } from "./SkillDiscovery.js";
import { McpServer } from "./McpServer.js";

export const McpServerFeature = createFeature({
    name: "Mcp/McpServerFeature",
    register(container) {
        container.register(SkillDiscovery).inSingletonScope();
        container.register(McpServer).inSingletonScope();
    }
});
```

- [ ] **Step 6: Update Server index.ts**

```ts
export {
    SkillDiscovery,
    SkillDiscoveryConfig,
    McpServer,
    type Skill
} from "./abstractions/index.js";
export { SkillDiscovery as SkillDiscoveryImpl } from "./SkillDiscovery.js";
export { McpServer as McpServerImpl } from "./McpServer.js";
export { McpServerFeature } from "./feature.js";
```

- [ ] **Step 7: Update mcp barrel**

```ts
export {
    SkillDiscovery,
    SkillDiscoveryConfig,
    McpServer,
    McpServerFeature,
    type Skill
} from "./features/Server/index.js";
```

- [ ] **Step 8: Create README.md**

Create `src/mcp/features/Server/README.md`:

```markdown
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
```

- [ ] **Step 9: Run tests**

```bash
yarn test -- __tests__/mcp/McpServer.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 10: Run typecheck and full test suite**

```bash
yarn typecheck && yarn test
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(mcp): add McpServer feature with list and get tools

Registers list_stdlib_skills and get_stdlib_skill MCP tools.
Skills discovered via SkillDiscovery and cached at startup.
Catalog grouped by context, sorted alphabetically."
```

---

### Task 4: Configure Feature with Agent Adapters

**Files:**
- Create: `src/mcp/features/Configure/abstractions/AgentConfigurator.ts`
- Create: `src/mcp/features/Configure/abstractions/index.ts`
- Create: `src/mcp/features/Configure/AgentConfigurator.ts`
- Create: `src/mcp/features/Configure/feature.ts`
- Create: `src/mcp/features/Configure/index.ts`
- Create: `src/mcp/features/Configure/README.md`
- Create: `src/mcp/features/Configure/agents/types.ts`
- Create: `src/mcp/features/Configure/agents/shared.ts`
- Create: `src/mcp/features/Configure/agents/claude.ts`
- Create: `src/mcp/features/Configure/agents/cursor.ts`
- Create: `src/mcp/features/Configure/agents/cline.ts`
- Create: `src/mcp/features/Configure/agents/copilot.ts`
- Create: `src/mcp/features/Configure/agents/windsurf.ts`
- Create: `src/mcp/features/Configure/agents/kiro.ts`
- Create: `src/mcp/features/Configure/agents/opencode.ts`
- Create: `__tests__/mcp/Configure.test.ts`
- Modify: `src/mcp/index.ts`

**Interfaces:**
- Consumes: nothing from previous tasks (self-contained)
- Produces: `AgentConfigurator` token, `AgentConfiguratorFeature`, `writeMcpConfig`, `writeHintFile`, `stdlibHintBlock`, all 7 agent modules

- [ ] **Step 1: Write the failing test**

Create `__tests__/mcp/Configure.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
    writeMcpConfig,
    writeHintFile,
    stdlibHintBlock
} from "../../src/mcp/features/Configure/agents/shared.js";

describe("writeMcpConfig", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-config-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should create new config file with stdlib entry", () => {
        writeMcpConfig({ cwd: tmpDir, configFile: ".mcp.json", configKey: "mcpServers" });

        const content = JSON.parse(readFileSync(join(tmpDir, ".mcp.json"), "utf-8"));
        expect(content.mcpServers.stdlib).toBeDefined();
        expect(content.mcpServers.stdlib.command).toBe("npx");
        expect(content.mcpServers.stdlib.args).toContain("stdlib-mcp");
    });

    it("should preserve existing entries when patching", () => {
        const configPath = join(tmpDir, ".mcp.json");
        writeFileSync(configPath, JSON.stringify({
            mcpServers: { other: { command: "other-cmd" } }
        }));

        writeMcpConfig({ cwd: tmpDir, configFile: ".mcp.json", configKey: "mcpServers" });

        const content = JSON.parse(readFileSync(configPath, "utf-8"));
        expect(content.mcpServers.other).toBeDefined();
        expect(content.mcpServers.stdlib).toBeDefined();
    });

    it("should skip if stdlib entry already exists", () => {
        const configPath = join(tmpDir, ".mcp.json");
        const original = { mcpServers: { stdlib: { command: "custom" } } };
        writeFileSync(configPath, JSON.stringify(original));

        writeMcpConfig({ cwd: tmpDir, configFile: ".mcp.json", configKey: "mcpServers" });

        const content = JSON.parse(readFileSync(configPath, "utf-8"));
        expect(content.mcpServers.stdlib.command).toBe("custom");
    });

    it("should create nested directories", () => {
        writeMcpConfig({
            cwd: tmpDir,
            configFile: ".cursor/mcp.json",
            configKey: "mcpServers"
        });

        expect(existsSync(join(tmpDir, ".cursor", "mcp.json"))).toBe(true);
    });

    it("should use servers key for copilot", () => {
        writeMcpConfig({ cwd: tmpDir, configFile: ".vscode/mcp.json", configKey: "servers" });

        const content = JSON.parse(
            readFileSync(join(tmpDir, ".vscode", "mcp.json"), "utf-8")
        );
        expect(content.servers.stdlib).toBeDefined();
    });
});

describe("writeHintFile", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-hint-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should create new hint file", () => {
        writeHintFile({
            cwd: tmpDir,
            hintFile: "CLAUDE.md",
            content: stdlibHintBlock()
        });

        const text = readFileSync(join(tmpDir, "CLAUDE.md"), "utf-8");
        expect(text).toContain("list_stdlib_skills");
    });

    it("should append to existing file with blank line separator", () => {
        const hintPath = join(tmpDir, "CLAUDE.md");
        writeFileSync(hintPath, "# Existing content");

        writeHintFile({
            cwd: tmpDir,
            hintFile: "CLAUDE.md",
            content: stdlibHintBlock()
        });

        const text = readFileSync(hintPath, "utf-8");
        expect(text).toContain("# Existing content");
        expect(text).toContain("list_stdlib_skills");
        expect(text).toContain("\n\n## @webiny/stdlib MCP");
    });

    it("should skip if marker already present", () => {
        const hintPath = join(tmpDir, "CLAUDE.md");
        writeFileSync(hintPath, "Already has list_stdlib_skills marker.");

        writeHintFile({
            cwd: tmpDir,
            hintFile: "CLAUDE.md",
            content: stdlibHintBlock()
        });

        const text = readFileSync(hintPath, "utf-8");
        expect(text).toBe("Already has list_stdlib_skills marker.");
    });

    it("should create nested directories", () => {
        writeHintFile({
            cwd: tmpDir,
            hintFile: ".cursor/rules/stdlib.mdc",
            content: stdlibHintBlock()
        });

        expect(existsSync(join(tmpDir, ".cursor", "rules", "stdlib.mdc"))).toBe(true);
    });
});

describe("agent adapters", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-agent-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    const agents = [
        { module: "claude", configFile: ".mcp.json", hintFile: "CLAUDE.md" },
        { module: "cursor", configFile: ".cursor/mcp.json", hintFile: ".cursor/rules/stdlib.mdc" },
        { module: "copilot", configFile: ".vscode/mcp.json", hintFile: ".github/copilot-instructions.md" },
        { module: "windsurf", configFile: ".windsurf/mcp.json", hintFile: ".windsurf/rules/stdlib.md" },
        { module: "kiro", configFile: ".kiro/settings/mcp.json", hintFile: "AGENTS.md" },
        { module: "opencode", configFile: "opencode.json", hintFile: "AGENTS.md" }
    ];

    for (const { module: mod, configFile, hintFile } of agents) {
        it(`should configure ${mod} agent`, async () => {
            const agent = await import(
                `../../src/mcp/features/Configure/agents/${mod}.js`
            );
            await agent.default.init({ cwd: tmpDir });

            expect(existsSync(join(tmpDir, configFile))).toBe(true);
            expect(existsSync(join(tmpDir, hintFile))).toBe(true);

            const config = JSON.parse(readFileSync(join(tmpDir, configFile), "utf-8"));
            const hint = readFileSync(join(tmpDir, hintFile), "utf-8");

            expect(JSON.stringify(config)).toContain("stdlib");
            expect(hint).toContain("list_stdlib_skills");
        });
    }

    it("should configure cline agent (no hint file)", async () => {
        const agent = await import(
            "../../src/mcp/features/Configure/agents/cline.js"
        );
        await agent.default.init({ cwd: tmpDir });

        expect(
            existsSync(join(tmpDir, ".vscode/cline_mcp_settings.json"))
        ).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
yarn test -- __tests__/mcp/Configure.test.ts
```

- [ ] **Step 3: Create agents/types.ts**

Create `src/mcp/features/Configure/agents/types.ts`:

```ts
export interface AgentPreset {
    slug: string;
    displayName: string;
    configFile: string;
    configKey: string;
    hintFile?: string;
}

export interface AgentModule {
    preset: AgentPreset;
    init: (params: { cwd: string }) => Promise<void>;
}
```

- [ ] **Step 4: Create agents/shared.ts**

Create `src/mcp/features/Configure/agents/shared.ts`:

```ts
import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";

interface WriteMcpConfigParams {
    cwd: string;
    configFile: string;
    configKey: string;
}

interface WriteHintFileParams {
    cwd: string;
    hintFile: string;
    content: string;
}

export function writeMcpConfig({ cwd, configFile, configKey }: WriteMcpConfigParams): void {
    const configPath = join(cwd, configFile);
    mkdirSync(dirname(configPath), { recursive: true });

    let existing: Record<string, unknown> = {};
    if (existsSync(configPath)) {
        existing = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
    }

    const section = (existing[configKey] ?? {}) as Record<string, unknown>;
    if (section["stdlib"]) {
        return;
    }

    section["stdlib"] = {
        command: "npx",
        args: ["stdlib-mcp", "serve"]
    };
    existing[configKey] = section;

    writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");
}

export function writeHintFile({ cwd, hintFile, content }: WriteHintFileParams): void {
    const hintPath = join(cwd, hintFile);
    mkdirSync(dirname(hintPath), { recursive: true });

    if (existsSync(hintPath)) {
        const existing = readFileSync(hintPath, "utf-8");
        if (existing.includes("list_stdlib_skills")) {
            return;
        }
        const separator = existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
        writeFileSync(hintPath, existing + separator + content + "\n");
    } else {
        writeFileSync(hintPath, content + "\n");
    }
}

export function stdlibHintBlock(): string {
    return `## @webiny/stdlib MCP

This project uses \`@webiny/stdlib\`. An MCP server is available with tools for discovering stdlib features:

- \`list_stdlib_skills\` — returns a catalog of all available skills with names and descriptions. Call this first when working with @webiny/stdlib.
- \`get_stdlib_skill\` — loads full documentation for a specific skill by name.`;
}
```

- [ ] **Step 5: Create all 7 agent adapters**

Create each agent file following this pattern. Showing `claude.ts` in full, others follow the same structure:

`src/mcp/features/Configure/agents/claude.ts`:
```ts
import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "claude",
        displayName: "Claude Code",
        configFile: ".mcp.json",
        configKey: "mcpServers",
        hintFile: "CLAUDE.md"
    },
    async init({ cwd }) {
        writeMcpConfig({ cwd, configFile: ".mcp.json", configKey: "mcpServers" });
        writeHintFile({ cwd, hintFile: "CLAUDE.md", content: stdlibHintBlock() });
    }
};

export default module;
```

`src/mcp/features/Configure/agents/cursor.ts`:
```ts
import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "cursor",
        displayName: "Cursor",
        configFile: ".cursor/mcp.json",
        configKey: "mcpServers",
        hintFile: ".cursor/rules/stdlib.mdc"
    },
    async init({ cwd }) {
        writeMcpConfig({ cwd, configFile: ".cursor/mcp.json", configKey: "mcpServers" });
        writeHintFile({ cwd, hintFile: ".cursor/rules/stdlib.mdc", content: stdlibHintBlock() });
    }
};

export default module;
```

`src/mcp/features/Configure/agents/cline.ts`:
```ts
import type { AgentModule } from "./types.js";
import { writeMcpConfig } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "cline",
        displayName: "Cline",
        configFile: ".vscode/cline_mcp_settings.json",
        configKey: "mcpServers"
    },
    async init({ cwd }) {
        writeMcpConfig({
            cwd,
            configFile: ".vscode/cline_mcp_settings.json",
            configKey: "mcpServers"
        });
    }
};

export default module;
```

`src/mcp/features/Configure/agents/copilot.ts`:
```ts
import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "copilot",
        displayName: "GitHub Copilot",
        configFile: ".vscode/mcp.json",
        configKey: "servers",
        hintFile: ".github/copilot-instructions.md"
    },
    async init({ cwd }) {
        writeMcpConfig({ cwd, configFile: ".vscode/mcp.json", configKey: "servers" });
        writeHintFile({
            cwd,
            hintFile: ".github/copilot-instructions.md",
            content: stdlibHintBlock()
        });
    }
};

export default module;
```

`src/mcp/features/Configure/agents/windsurf.ts`:
```ts
import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "windsurf",
        displayName: "Windsurf",
        configFile: ".windsurf/mcp.json",
        configKey: "mcpServers",
        hintFile: ".windsurf/rules/stdlib.md"
    },
    async init({ cwd }) {
        writeMcpConfig({ cwd, configFile: ".windsurf/mcp.json", configKey: "mcpServers" });
        writeHintFile({
            cwd,
            hintFile: ".windsurf/rules/stdlib.md",
            content: stdlibHintBlock()
        });
    }
};

export default module;
```

`src/mcp/features/Configure/agents/kiro.ts`:
```ts
import type { AgentModule } from "./types.js";
import { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "kiro",
        displayName: "Kiro",
        configFile: ".kiro/settings/mcp.json",
        configKey: "mcpServers",
        hintFile: "AGENTS.md"
    },
    async init({ cwd }) {
        writeMcpConfig({
            cwd,
            configFile: ".kiro/settings/mcp.json",
            configKey: "mcpServers"
        });
        writeHintFile({ cwd, hintFile: "AGENTS.md", content: stdlibHintBlock() });
    }
};

export default module;
```

`src/mcp/features/Configure/agents/opencode.ts`:
```ts
import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import type { AgentModule } from "./types.js";
import { writeHintFile, stdlibHintBlock } from "./shared.js";

const module: AgentModule = {
    preset: {
        slug: "opencode",
        displayName: "OpenCode",
        configFile: "opencode.json",
        configKey: "mcp",
        hintFile: "AGENTS.md"
    },
    async init({ cwd }) {
        const configPath = join(cwd, "opencode.json");
        mkdirSync(dirname(configPath), { recursive: true });

        let existing: Record<string, unknown> = {};
        if (existsSync(configPath)) {
            existing = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
        }

        const section = (existing["mcp"] ?? {}) as Record<string, unknown>;
        if (section["stdlib"]) {
            return;
        }

        section["stdlib"] = {
            type: "stdio",
            command: ["npx", "stdlib-mcp", "serve"],
            enabled: true
        };
        existing["mcp"] = section;
        writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");

        writeHintFile({ cwd, hintFile: "AGENTS.md", content: stdlibHintBlock() });
    }
};

export default module;
```

- [ ] **Step 6: Create AgentConfigurator abstraction**

Create `src/mcp/features/Configure/abstractions/AgentConfigurator.ts`:

```ts
import { createAbstraction } from "~/common/index.js";

export interface IAgentConfigurator {
    configure(): Promise<void>;
}

export const AgentConfigurator = createAbstraction<IAgentConfigurator>(
    "Mcp/AgentConfigurator"
);

export namespace AgentConfigurator {
    export type Interface = IAgentConfigurator;
}
```

Create `src/mcp/features/Configure/abstractions/index.ts`:

```ts
export { AgentConfigurator } from "./AgentConfigurator.js";
```

- [ ] **Step 7: Create AgentConfigurator implementation**

Create `src/mcp/features/Configure/AgentConfigurator.ts`:

```ts
import { createInterface } from "node:readline";
import { AgentConfigurator as AgentConfiguratorAbstraction } from "./abstractions/AgentConfigurator.js";
import type { AgentModule } from "./agents/types.js";
import claudeAgent from "./agents/claude.js";
import cursorAgent from "./agents/cursor.js";
import clineAgent from "./agents/cline.js";
import copilotAgent from "./agents/copilot.js";
import windsurfAgent from "./agents/windsurf.js";
import kiroAgent from "./agents/kiro.js";
import opencodeAgent from "./agents/opencode.js";

const AGENTS: AgentModule[] = [
    claudeAgent,
    clineAgent,
    copilotAgent,
    cursorAgent,
    kiroAgent,
    opencodeAgent,
    windsurfAgent
].sort((a, b) => a.preset.displayName.localeCompare(b.preset.displayName));

class AgentConfiguratorImpl implements AgentConfiguratorAbstraction.Interface {
    public async configure(): Promise<void> {
        console.log("\nSelect your AI agent:\n");
        for (let i = 0; i < AGENTS.length; i++) {
            console.log(`  ${i + 1}. ${AGENTS[i]!.preset.displayName}`);
        }
        console.log();

        const rl = createInterface({ input: process.stdin, output: process.stdout });

        const answer = await new Promise<string>(resolve => {
            rl.question("Enter number: ", resolve);
        });
        rl.close();

        const index = parseInt(answer, 10) - 1;
        if (isNaN(index) || index < 0 || index >= AGENTS.length) {
            console.error("Invalid selection.");
            return;
        }

        const agent = AGENTS[index]!;
        console.log(`\nConfiguring ${agent.preset.displayName}...`);
        await agent.init({ cwd: process.cwd() });
        console.log("Done.");
    }
}

export const AgentConfigurator = AgentConfiguratorAbstraction.createImplementation({
    implementation: AgentConfiguratorImpl,
    dependencies: []
});
```

- [ ] **Step 8: Create feature.ts and index.ts**

Create `src/mcp/features/Configure/feature.ts`:

```ts
import { createFeature } from "~/common/index.js";
import { AgentConfigurator } from "./AgentConfigurator.js";

export const AgentConfiguratorFeature = createFeature({
    name: "Mcp/AgentConfiguratorFeature",
    register(container) {
        container.register(AgentConfigurator).inSingletonScope();
    }
});
```

Create `src/mcp/features/Configure/index.ts`:

```ts
export { AgentConfigurator } from "./abstractions/index.js";
export { AgentConfiguratorFeature } from "./feature.js";
export type { AgentPreset, AgentModule } from "./agents/types.js";
export { writeMcpConfig, writeHintFile, stdlibHintBlock } from "./agents/shared.js";
```

- [ ] **Step 9: Create README.md**

Create `src/mcp/features/Configure/README.md`:

```markdown
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
```

- [ ] **Step 10: Update mcp barrel**

Update `src/mcp/index.ts`:

```ts
export {
    SkillDiscovery,
    SkillDiscoveryConfig,
    McpServer,
    McpServerFeature,
    type Skill
} from "./features/Server/index.js";

export {
    AgentConfigurator,
    AgentConfiguratorFeature,
    type AgentPreset,
    type AgentModule,
    writeMcpConfig,
    writeHintFile,
    stdlibHintBlock
} from "./features/Configure/index.js";
```

- [ ] **Step 11: Run tests**

```bash
yarn test -- __tests__/mcp/Configure.test.ts
```

Expected: all tests PASS.

- [ ] **Step 12: Run typecheck**

```bash
yarn typecheck
```

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(mcp): add Configure feature with 7 agent adapters

Interactive CLI for configuring Claude, Cursor, Cline, Copilot,
Windsurf, Kiro, and OpenCode. Writes MCP config and hint files."
```

---

### Task 5: CLI Entry Point

**Files:**
- Create: `src/mcp/cli.ts`

**Interfaces:**
- Consumes: `SkillDiscoveryConfig`, `McpServerFeature`, `McpServer`, `AgentConfiguratorFeature`, `AgentConfigurator` from Tasks 2-4
- Produces: `stdlib-mcp` binary entry point

- [ ] **Step 1: Create CLI entry point**

Create `src/mcp/cli.ts`:

```ts
#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Container } from "@webiny/di";
import { SkillDiscoveryConfig, McpServerFeature, McpServer } from "./features/Server/index.js";
import { AgentConfiguratorFeature, AgentConfigurator } from "./features/Configure/index.js";

function parseFlags(argv: string[]): { skills: string[]; additionalSkills: string[] } {
    const skills: string[] = [];
    const additionalSkills: string[] = [];

    for (const arg of argv) {
        if (arg.startsWith("--skills=")) {
            skills.push(arg.slice("--skills=".length));
        } else if (arg.startsWith("--additional-skills=")) {
            additionalSkills.push(arg.slice("--additional-skills=".length));
        }
    }

    return { skills, additionalSkills };
}

function resolvePackageRoot(): string {
    const thisFile = fileURLToPath(import.meta.url);
    let dir = dirname(thisFile);
    while (dir !== dirname(dir)) {
        if (existsSync(join(dir, "package.json"))) {
            return dir;
        }
        dir = dirname(dir);
    }
    return dirname(thisFile);
}

function resolveDefaultScanPaths(packageRoot: string): string[] {
    const paths: string[] = [];

    const skillsDir = join(packageRoot, "skills");
    if (existsSync(skillsDir)) {
        paths.push(skillsDir);
    }

    const srcDir = join(packageRoot, "src");
    const distDir = join(packageRoot, "dist");
    if (existsSync(srcDir)) {
        paths.push(srcDir);
    } else if (existsSync(distDir)) {
        paths.push(distDir);
    }

    return paths;
}

const command = process.argv[2];

if (command === "serve") {
    const flags = parseFlags(process.argv.slice(3));
    const packageRoot = resolvePackageRoot();

    let scanPaths: string[];
    if (flags.skills.length > 0) {
        scanPaths = [...flags.additionalSkills, ...flags.skills];
    } else {
        scanPaths = [...flags.additionalSkills, ...resolveDefaultScanPaths(packageRoot)];
    }

    const container = new Container();
    container.registerInstance(SkillDiscoveryConfig, { scanPaths });
    McpServerFeature.register(container);
    await container.resolve(McpServer).start();
} else if (command === "configure") {
    const container = new Container();
    AgentConfiguratorFeature.register(container);
    await container.resolve(AgentConfigurator).configure();
} else {
    console.error("Usage: stdlib-mcp <serve|configure>");
    process.exit(1);
}
```

- [ ] **Step 2: Build and verify shebang**

```bash
rm -rf dist && yarn build
head -1 dist/mcp/cli.js
```

Expected: `#!/usr/bin/env node`

- [ ] **Step 3: Run typecheck and full tests**

```bash
yarn typecheck && yarn test
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(mcp): add CLI entry point for serve and configure

Dispatches stdlib-mcp serve (starts MCP server) and stdlib-mcp
configure (interactive agent setup). Resolves default scan paths
from package root with src/dist fallback."
```

---

### Task 6: Add Front-matter to Feature READMEs + Create Skills

**Files:**
- Modify: all 22 `src/**/README.md` files (add YAML front-matter)
- Create: `skills/di-patterns/SKILL.md`
- Create: `skills/adding-a-feature/SKILL.md`
- Create: `skills/testing-patterns/SKILL.md`

**Interfaces:**
- Consumes: nothing
- Produces: discoverable skills for the MCP server

- [ ] **Step 1: Add front-matter to all 22 feature READMEs**

For each README, prepend YAML front-matter. Read each file first, then prepend the block. The name, description, and context for each are defined in the spec's "Skills Content" table.

Example for `src/node/features/FileTool/README.md` — prepend:
```yaml
---
name: file-tool
description: Read, write, copy, remove files. All paths must be absolute.
context: node
---

```

Do this for all 22 READMEs listed in the spec. Read each README to derive an accurate one-line description from its content.

- [ ] **Step 2: Create skills/ directory and cross-cutting skills**

Create `skills/di-patterns/SKILL.md`:
```yaml
---
name: di-patterns
description: How dependency injection works in @webiny/stdlib — abstractions, implementations, features, and container wiring.
context: guides
---
```
Then write content covering: `createAbstraction`, `createImplementation`, `createFeature`, `Container.register/resolve`, optional dependencies, singleton scope.

Create `skills/adding-a-feature/SKILL.md`:
```yaml
---
name: adding-a-feature
description: Step-by-step guide for adding a new tool or service to @webiny/stdlib.
context: guides
---
```
Content mirrors AGENTS.md "Step-by-step: Adding a New Tool" section.

Create `skills/testing-patterns/SKILL.md`:
```yaml
---
name: testing-patterns
description: Testing conventions for @webiny/stdlib — container setup, tmpdir patterns, browser environment directives.
context: guides
---
```
Content covers `makeContainer()`, tmpdir cleanup, `@vitest-environment happy-dom` directive, coverage.

- [ ] **Step 3: Verify skills are discoverable**

```bash
rm -rf dist && yarn build
node -e "
import { Container } from '@webiny/di';
import { SkillDiscoveryConfig, McpServerFeature, SkillDiscovery } from './dist/mcp/index.js';
const c = new Container();
c.registerInstance(SkillDiscoveryConfig, { scanPaths: ['./skills', './src'] });
McpServerFeature.register(c);
const skills = c.resolve(SkillDiscovery).discover();
console.log(skills.length + ' skills found');
skills.forEach(s => console.log('  ' + s.name + ' (' + s.context + ')'));
"
```

Expected: 25 skills (22 READMEs + 3 cross-cutting).

- [ ] **Step 4: Run full pre-commit chain**

```bash
yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(mcp): add front-matter to feature READMEs and create cross-cutting skills

All 22 feature READMEs now have YAML front-matter for MCP discovery.
Three cross-cutting skill files added: di-patterns, adding-a-feature,
testing-patterns."
```

---

### Task 7: Final Integration and E2E Verification

**Files:**
- No new files — verification only

**Interfaces:**
- Consumes: everything from Tasks 1-6

- [ ] **Step 1: Run full pre-commit chain**

```bash
yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

All steps must pass with zero errors.

- [ ] **Step 2: Verify dist structure**

```bash
ls dist/mcp/cli.js
head -1 dist/mcp/cli.js
find dist -name "README.md" | wc -l
ls dist/mcp/features/Server/
ls dist/mcp/features/Configure/
```

- [ ] **Step 3: Verify npm pack includes skills/**

```bash
cd dist && npm pack --dry-run 2>&1 | grep -E "skills/|SKILL.md"
```

Wait — skills/ is at repo root, not in dist/. Verify it's included via the root package.json `files` field:

```bash
cd .. && npm pack --dry-run 2>&1 | head -20
```

- [ ] **Step 4: Manual E2E — serve command**

```bash
npx stdlib-mcp serve &
# In another terminal, use MCP inspector:
# npx @modelcontextprotocol/inspector
```

Or test directly:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | npx stdlib-mcp serve 2>/dev/null
```

- [ ] **Step 5: Manual E2E — configure command**

```bash
cd /tmp && mkdir test-configure && cd test-configure
npx stdlib-mcp configure
# Select "Claude Code"
# Verify .mcp.json and CLAUDE.md created
cat .mcp.json
cat CLAUDE.md
cd .. && rm -rf test-configure
```

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git status
# If changes exist:
git add -A
git commit -m "fix(mcp): integration fixes from E2E verification"
```
