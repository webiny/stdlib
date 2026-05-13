# PublishToVerdaccio Feature Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `scripts/publishToVerdaccio.ts` from a flat procedural script into a DI-based feature under `scripts/features/PublishToVerdaccio/`, matching the structure of the existing `scripts/features/PublishPackages/` feature.

**Architecture:** Four new files under `scripts/features/PublishToVerdaccio/` — two abstraction tokens (`ProjectConfig`, `PublishOrchestrator`), one implementation (`PublishOrchestrator.ts`), and one wiring entry point (`index.ts`). The entry script `scripts/publishToVerdaccio.ts` is replaced by thin arg-parsing glue that delegates to `build()` and `publish()`.

**Tech Stack:** Node 24 (strip-only TypeScript), `@webiny/di` (`Abstraction`, `Container`), `node:fs`, `node:path`, `node:child_process`, existing `BuildPackages` feature, `bin()` helper.

---

## File Map

| Action | Path |
|--------|------|
| Create | `scripts/features/PublishToVerdaccio/abstractions/ProjectConfig.ts` |
| Create | `scripts/features/PublishToVerdaccio/abstractions/PublishOrchestrator.ts` |
| Create | `scripts/features/PublishToVerdaccio/abstractions/index.ts` |
| Create | `scripts/features/PublishToVerdaccio/PublishOrchestrator.ts` |
| Create | `scripts/features/PublishToVerdaccio/index.ts` |
| Replace | `scripts/publishToVerdaccio.ts` |

---

### Task 1: Create abstractions

**Files:**
- Create: `scripts/features/PublishToVerdaccio/abstractions/ProjectConfig.ts`
- Create: `scripts/features/PublishToVerdaccio/abstractions/PublishOrchestrator.ts`
- Create: `scripts/features/PublishToVerdaccio/abstractions/index.ts`

Node 24 strip-only note: these files have no classes, so no constructor constraints apply.

- [ ] **Step 1: Create `abstractions/ProjectConfig.ts`**

```typescript
import { Abstraction } from "@webiny/di";

export interface IProjectConfig {
    rootDir: string;
    packageName: string;
    version: string;
}

export const ProjectConfig = new Abstraction<IProjectConfig>(
    "Scripts/VerdaccioPublish/ProjectConfig"
);

export namespace ProjectConfig {
    export type Interface = IProjectConfig;
}
```

- [ ] **Step 2: Create `abstractions/PublishOrchestrator.ts`**

```typescript
import { Abstraction } from "@webiny/di";

export interface IPublishOrchestrator {
    run(): void;
}

export const PublishOrchestrator = new Abstraction<IPublishOrchestrator>(
    "Scripts/VerdaccioPublish/PublishOrchestrator"
);

export namespace PublishOrchestrator {
    export type Interface = IPublishOrchestrator;
}
```

- [ ] **Step 3: Create `abstractions/index.ts`**

```typescript
export { ProjectConfig } from "./ProjectConfig.ts";
export { PublishOrchestrator } from "./PublishOrchestrator.ts";
```

---

### Task 2: Create PublishOrchestrator implementation

**Files:**
- Create: `scripts/features/PublishToVerdaccio/PublishOrchestrator.ts`

Node 24 strip-only: no parameter properties. Expand constructor args to explicit private field declarations.

- [ ] **Step 1: Create the file**

```typescript
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PublishOrchestrator as PublishOrchestratorAbstraction } from "./abstractions/PublishOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { bin } from "../../bin.ts";

interface DistPackageJson {
    version: string;
    [key: string]: unknown;
}

class PublishOrchestratorImpl implements PublishOrchestratorAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;

    public constructor(config: ProjectConfig.Interface) {
        this.config = config;
    }

    public run(): void {
        const { rootDir, packageName, version } = this.config;
        const distDir = join(rootDir, "dist");
        const pkgJsonPath = join(distDir, "package.json");

        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as DistPackageJson;
        pkgJson.version = version;
        writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");

        console.log(`Publishing ${packageName}@${version} to http://localhost:4873 ...`);

        execFileSync(bin("npm"), ["publish", "--registry", "http://localhost:4873"], {
            cwd: distDir,
            stdio: "inherit"
        });
    }
}

export const PublishOrchestrator = PublishOrchestratorAbstraction.createImplementation({
    implementation: PublishOrchestratorImpl,
    dependencies: [ProjectConfig]
});
```

---

### Task 3: Create feature index.ts

**Files:**
- Create: `scripts/features/PublishToVerdaccio/index.ts`

- [ ] **Step 1: Create the file**

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Container } from "@webiny/di";
import { ProjectConfig, PublishOrchestrator } from "./abstractions/index.ts";
import { PublishOrchestrator as PublishOrchestratorImpl } from "./PublishOrchestrator.ts";

export function run(rootDir: string, version: string): void {
    const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")) as {
        name: string;
    };
    const container = new Container();
    container.registerInstance(ProjectConfig, {
        rootDir,
        packageName: pkg.name,
        version
    });
    container.register(PublishOrchestratorImpl).inSingletonScope();
    container.resolve(PublishOrchestrator).run();
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `yarn tsgo -p config/tsconfig.check.scripts.json`
Expected: no output (zero errors).

---

### Task 4: Replace `scripts/publishToVerdaccio.ts`

**Files:**
- Replace: `scripts/publishToVerdaccio.ts`

- [ ] **Step 1: Replace the entire file content**

```typescript
import { fileURLToPath } from "node:url";
import { run as build } from "./features/BuildPackages/index.ts";
import { run as publish } from "./features/PublishToVerdaccio/index.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

const versionIndex = process.argv.indexOf("--version");
const versionValue = process.argv[versionIndex + 1];
if (versionIndex === -1 || !versionValue || versionValue.startsWith("-")) {
    console.error(
        "Error: --version <x> is required.\n" +
            "Example: yarn publish:verdaccio --version 1.0.0-beta.abcdefg"
    );
    process.exit(1);
}

build(root);
publish(root, versionValue);
```

- [ ] **Step 2: Verify typecheck passes**

Run: `yarn tsgo -p config/tsconfig.check.scripts.json`
Expected: no output (zero errors).

---

### Task 5: Run pre-commit chain and commit

**Files:** all changed files

- [ ] **Step 1: Run the full pre-commit chain**

```sh
yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

All steps must exit with zero errors and zero warnings before continuing.

- [ ] **Step 2: Commit**

```sh
git add scripts/features/PublishToVerdaccio scripts/publishToVerdaccio.ts
git commit -m "$(cat <<'EOF'
refactor(verdaccio): extract PublishToVerdaccio feature

Replaces the flat publishToVerdaccio.ts script with a DI-based feature
under scripts/features/PublishToVerdaccio/, following the same pattern
as PublishPackages. The entry script is now thin arg-parsing glue.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Manual End-to-End Verification

After the commit:

1. In one terminal: `yarn verdaccio:start` — wait for `http address: http://localhost:4873/`
2. In another terminal: `yarn publish:verdaccio --version 1.0.0-beta.refactor`
3. Confirm build output, then `npm publish` succeeds
4. Verify `@webiny/stdlib@1.0.0-beta.refactor` appears at `http://localhost:4873`
