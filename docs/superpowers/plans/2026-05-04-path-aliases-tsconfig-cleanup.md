# Path Alias Support + tsconfig Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable `~/common/index.js` as a stable import alias for the common slice in `src/node/` and `src/browser/` source files, eliminating fragile depth-relative imports, and reduce tsconfig file count from 9 to 8.

**Architecture:** Add `"paths": { "~/*": ["./src/*"] }` to all three build tsconfigs so TypeScript resolves the alias at compile time. Because TypeScript does not rewrite path aliases in emitted JS, a new `PathAliasRewriter` step in the build script walks `dist/` post-compilation and replaces every `~/` occurrence in `.js` and `.d.ts` files with a depth-relative prefix (e.g. `../../../` for a file three directories deep). Simultaneously, consolidate tsconfigs by merging `tsconfig.base.json` into `tsconfig.json`, extracting a shared `tsconfig.checkmode.json`, and folding the scripts-only check config into the node check config.

**Tech Stack:** TypeScript/tsgo (`@typescript/native-preview`), Node.js `node:fs` (readdirSync / readFileSync / writeFileSync), `@webiny/di` (DI for build script), Vitest

**Important — current working-directory state:** `src/index.ts` and `src/common/index.ts` already contain the user's in-progress changes (the alias import and the new barrel). Tasks 1–2 must land the `paths` config before any `yarn typecheck` or `yarn build` verification, otherwise those commands fail.

---

### Task 1: Consolidate tsconfigs and add `~/` path alias

All tsconfig changes land in one commit: consolidation (9 → 8) and `paths` entry. This keeps the repo in a buildable state throughout — `src/index.ts` already uses `~/common/index.js` so paths must be present before the first verification.

**Files:**
- Rewrite: `tsconfig.json` — gains base `compilerOptions`
- Delete: `tsconfig.base.json`
- Rewrite: `tsconfig.common.json` — `extends ./tsconfig.json`, gains `paths`
- Rewrite: `tsconfig.node.json` — `extends ./tsconfig.json`, gains `paths`
- Rewrite: `tsconfig.browser.json` — `extends ./tsconfig.json`, gains `paths`
- Create: `tsconfig.checkmode.json`
- Rewrite: `tsconfig.check.common.json`
- Rewrite: `tsconfig.check.node.json` — folds in scripts check
- Rewrite: `tsconfig.check.browser.json`
- Delete: `tsconfig.check.json`
- Modify: `package.json` — remove `tsconfig.check.json` from `typecheck` script

---

- [ ] **Step 1: Rewrite `tsconfig.json` — merge base options in**

Replace the entire file with:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["esnext"],
    "types": [],

    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,

    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "isolatedDeclarations": false,
    "erasableSyntaxOnly": false,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.common.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.browser.json" }
  ]
}
```

TypeScript `extends` only inherits `compilerOptions`, not `files`/`include`/`exclude`/`references`. The `files: []` and `references` are for the solution-file behavior only and do not affect child configs.

- [ ] **Step 2: Rewrite `tsconfig.common.json`**

Change `extends` to `./tsconfig.json` and add `paths`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext", "dom"],
    "paths": { "~/*": ["./src/*"] }
  },
  "include": ["src"],
  "exclude": ["src/node", "src/browser"]
}
```

- [ ] **Step 3: Rewrite `tsconfig.node.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src/node",
    "outDir": "./dist/node",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "paths": { "~/*": ["./src/*"] }
  },
  "include": ["src/node"],
  "references": [{ "path": "./tsconfig.common.json" }]
}
```

- [ ] **Step 4: Rewrite `tsconfig.browser.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "./src/browser",
    "outDir": "./dist/browser",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext", "dom", "dom.iterable"],
    "paths": { "~/*": ["./src/*"] }
  },
  "include": ["src/browser"],
  "references": [{ "path": "./tsconfig.common.json" }]
}
```

Note: `~/*` maps to `./src/*` in all three tsconfigs. Paths are resolved relative to the tsconfig file (repo root), not `rootDir`. So `~/common/index.js` always resolves to `./src/common/index.js` regardless of which slice is compiling.

- [ ] **Step 5: Create `tsconfig.checkmode.json`**

```json
{
  "compilerOptions": {
    "composite": false,
    "noEmit": true,
    "rootDir": "."
  }
}
```

- [ ] **Step 6: Rewrite `tsconfig.check.common.json`**

Uses TypeScript 5 extends array — `tsconfig.checkmode.json` overrides `composite` and `rootDir` from `tsconfig.common.json`:

```json
{
  "extends": ["./tsconfig.common.json", "./tsconfig.checkmode.json"],
  "include": ["src", "__tests__", "vitest.config.ts"],
  "exclude": ["src/node", "src/browser", "__tests__/node", "__tests__/browser"]
}
```

- [ ] **Step 7: Rewrite `tsconfig.check.node.json`**

Folds in the scripts check. Scripts need `types: ["node"]` (already inherited from `tsconfig.node.json`) and `allowImportingTsExtensions: true` (scripts use `.ts` extensions in local relative imports under Node 24 strip-only mode). Adding `allowImportingTsExtensions: true` does not break `src/node` files — they continue using `.js` extensions, which remain valid.

```json
{
  "extends": ["./tsconfig.node.json", "./tsconfig.checkmode.json"],
  "compilerOptions": {
    "allowImportingTsExtensions": true
  },
  "include": ["src/node", "__tests__/node", "scripts"]
}
```

- [ ] **Step 8: Rewrite `tsconfig.check.browser.json`**

```json
{
  "extends": ["./tsconfig.browser.json", "./tsconfig.checkmode.json"],
  "include": ["src/browser", "__tests__/browser"]
}
```

- [ ] **Step 9: Delete `tsconfig.base.json` and `tsconfig.check.json`**

```bash
rm tsconfig.base.json tsconfig.check.json
```

- [ ] **Step 10: Update `typecheck` script in `package.json`**

Remove `tsgo -p tsconfig.check.json &&` from the script. New value for the `typecheck` key:

```
"typecheck": "tsgo -p tsconfig.check.common.json && tsgo -p tsconfig.check.node.json && tsgo -p tsconfig.check.browser.json"
```

- [ ] **Step 11: Run typecheck**

```bash
yarn typecheck
```

Expected: all three check configs pass with zero errors. TypeScript resolves `~/common/index.js` in `src/index.ts` via `paths` to `./src/common/index.ts`. All existing `../../../index.js` imports in node/browser files still resolve correctly — they have not been changed yet.

- [ ] **Step 12: Run build**

```bash
yarn build
```

Expected: clean build. `dist/index.js` will still contain `~/common/index.js` (PathAliasRewriter does not exist yet) — this is expected and will be fixed in Task 3.

- [ ] **Step 13: Commit**

```bash
git add tsconfig.json tsconfig.checkmode.json tsconfig.common.json tsconfig.node.json tsconfig.browser.json tsconfig.check.common.json tsconfig.check.node.json tsconfig.check.browser.json package.json
git rm tsconfig.base.json tsconfig.check.json
git commit -m "refactor(config): consolidate tsconfigs 9→8 and add ~/common path alias

Merge tsconfig.base.json into tsconfig.json (solution file now carries
shared strict flags). Extract tsconfig.checkmode.json for the
composite/noEmit/rootDir overrides shared by all three check configs.
Fold the scripts-only tsconfig.check.json into tsconfig.check.node.json
(allowImportingTsExtensions, scripts included). Check configs now use
TS5 extends arrays and are 4-5 lines each.

Add paths: { \"~/*\": [\"./src/*\"] } to all three build tsconfigs so
TypeScript resolves ~/common/index.js to ./src/common/index.ts.
Path rewriting in emitted JS is handled by PathAliasRewriter (Task 3)."
```

---

### Task 2: Verify `src/common/index.ts` and `src/index.ts`

These files already exist as uncommitted working-directory changes. This task stages them and confirms correctness.

**Files:**
- Verify/fix: `src/common/index.ts`
- Verify/fix: `src/index.ts`

---

- [ ] **Step 1: Verify `src/common/index.ts`**

The file must contain exactly (paths relative to `src/common/`, no `./common/` prefix):

```typescript
export {
    Result,
    ResultAsync,
    BaseError,
    createAbstraction,
    createFeature
} from "./core/index.js";
export { Logger, type ILogger } from "./features/Logger/abstractions/Logger.js";
export { ConsoleLoggerConfig } from "./features/Logger/abstractions/ConsoleLoggerConfig.js";
export { ConsoleLoggerFeature } from "./features/Logger/feature.js";
export { ConsoleLogger } from "./features/Logger/ConsoleLogger.js";
export {
    Cache,
    AsyncCache,
    CacheError,
    MemoryCacheFeature,
    AsyncMemoryCacheFeature
} from "./features/Cache/index.js";
export type { ICache, IAsyncCache } from "./features/Cache/index.js";
```

If the file has wrong paths (e.g. `./common/core/index.js`), fix each path by removing the `./common/` prefix.

- [ ] **Step 2: Verify `src/index.ts`**

The file must contain exactly one line:

```typescript
export * from "~/common/index.js";
```

If it contains the old explicit exports, replace the entire file with the one-liner above.

- [ ] **Step 3: Run typecheck**

```bash
yarn typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/common/index.ts src/index.ts
git commit -m "feat(stdlib): add src/common/index.ts barrel, redirect src/index.ts

src/common/index.ts is the canonical barrel for the common slice.
src/index.ts re-exports from ~/common/index.js, making it a thin
delegation layer rather than a direct-export file."
```

---

### Task 3: Update node/browser source imports to `~/common/index.js`

Every `../../../index.js` (feature-level, 3 dirs deep from `src/node/`) and `../../../../index.js` (abstraction-level, 4 dirs deep) becomes `~/common/index.js`.

**Files affected:**

Node slice (21 import statements):
- `src/node/features/DirectoryTool/DirectoryTool.ts`
- `src/node/features/DirectoryTool/feature.ts`
- `src/node/features/DirectoryTool/abstractions/DirectoryTool.ts`
- `src/node/features/FileTool/FileTool.ts`
- `src/node/features/FileTool/feature.ts`
- `src/node/features/FileTool/abstractions/FileTool.ts`
- `src/node/features/JsonFileTool/feature.ts`
- `src/node/features/JsonFileTool/abstractions/JsonFileTool.ts`
- `src/node/features/NdJsonReaderTool/NdJsonReaderTool.ts`
- `src/node/features/NdJsonReaderTool/LineAccumulator.ts`
- `src/node/features/NdJsonReaderTool/feature.ts`
- `src/node/features/NdJsonReaderTool/abstractions/NdJsonReaderTool.ts`
- `src/node/features/PackageJsonFileTool/feature.ts`
- `src/node/features/PackageJsonFileTool/abstractions/PackageJsonFileTool.ts`
- `src/node/features/PathTool/feature.ts`
- `src/node/features/PathTool/abstractions/PathTool.ts`
- `src/node/features/PinoLogger/PinoLogger.ts`
- `src/node/features/PinoLogger/feature.ts`
- `src/node/features/PinoLogger/abstractions/PinoLoggerConfig.ts`
- `src/node/features/ReadStreamFactory/feature.ts`
- `src/node/features/ReadStreamFactory/abstractions/ReadStreamFactory.ts`

Browser slice (4 import statements):
- `src/browser/features/LocalStorageCache/LocalStorageCache.ts`
- `src/browser/features/LocalStorageCache/errors.ts`
- `src/browser/features/LocalStorageCache/feature.ts`

---

- [ ] **Step 1: Replace depth-3 imports**

```bash
find src/node src/browser -name "*.ts" | xargs sed -i '' \
  's|"\.\./\.\./\.\./index\.js"|"~/common/index.js"|g'
```

- [ ] **Step 2: Replace depth-4 imports**

```bash
find src/node src/browser -name "*.ts" | xargs sed -i '' \
  's|"\.\./\.\./\.\./\.\./index\.js"|"~/common/index.js"|g'
```

- [ ] **Step 3: Verify no old-style imports remain**

```bash
grep -r "\.\./index\.js" src/node src/browser
```

Expected: no output. If any match appears, replace that import with `"~/common/index.js"` manually.

- [ ] **Step 4: Run typecheck**

```bash
yarn typecheck
```

Expected: zero errors. TypeScript resolves every `~/common/index.js` via `paths` to `./src/common/index.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/node src/browser
git commit -m "refactor(imports): replace depth-relative common barrel imports with ~/common

All ../../../index.js and ../../../../index.js imports in src/node/ and
src/browser/ now use the stable ~/common/index.js alias, resolved by
TypeScript via paths at compile time. Runtime path rewriting in dist/
is handled by PathAliasRewriter (next task)."
```

---

### Task 4: Add `PathAliasRewriter` to the build script

After `tsgo -b` emits JS and `.d.ts` files, every `~/` occurrence survives unchanged. This task adds a post-compilation step that rewrites `~/` to the correct depth-relative prefix.

Depth rule: a file at `dist/<a>/<b>/<c>/file.js` is depth 3 → prefix is `../../../`. A file directly in `dist/` (depth 0) gets prefix `./`.

Examples after rewriting:
- `dist/index.js`: `~/common/index.js` → `./common/index.js`
- `dist/node/features/FileTool/FileTool.js` (depth 3): `~/common/index.js` → `../../../common/index.js`
- `dist/node/features/FileTool/abstractions/FileTool.js` (depth 4): `~/common/index.js` → `../../../../common/index.js`

**Files:**
- Create: `scripts/features/BuildPackages/abstractions/PathAliasRewriter.ts`
- Modify: `scripts/features/BuildPackages/abstractions/index.ts`
- Create: `scripts/features/BuildPackages/PathAliasRewriter.ts`
- Modify: `scripts/features/BuildPackages/BuildOrchestrator.ts`
- Modify: `scripts/features/BuildPackages/index.ts`

---

- [ ] **Step 1: Create the abstraction**

Create `scripts/features/BuildPackages/abstractions/PathAliasRewriter.ts`:

```typescript
import { Abstraction } from "@webiny/di";

export interface IPathAliasRewriter {
    /**
     * Walks distDir recursively and rewrites every ~/ import alias in
     * .js and .d.ts files to a depth-relative path so Node can resolve them.
     */
    rewrite(distDir: string): void;
}

export const PathAliasRewriter = new Abstraction<IPathAliasRewriter>(
    "Scripts/Build/PathAliasRewriter"
);

export namespace PathAliasRewriter {
    export type Interface = IPathAliasRewriter;
}
```

- [ ] **Step 2: Add to the abstractions barrel**

Replace `scripts/features/BuildPackages/abstractions/index.ts`:

```typescript
export { ProjectConfig } from "./ProjectConfig.ts";
export { Cleaner } from "./Cleaner.ts";
export { Compiler } from "./Compiler.ts";
export { ArtifactCopier } from "./ArtifactCopier.ts";
export { BuildOrchestrator } from "./BuildOrchestrator.ts";
export { PathAliasRewriter } from "./PathAliasRewriter.ts";
```

- [ ] **Step 3: Create the implementation**

Create `scripts/features/BuildPackages/PathAliasRewriter.ts`:

```typescript
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { PathAliasRewriter as PathAliasRewriterAbstraction } from "./abstractions/PathAliasRewriter.ts";

class PathAliasRewriterImpl implements PathAliasRewriterAbstraction.Interface {
    public rewrite(distDir: string): void {
        this.walk(distDir, distDir);
    }

    private walk(distDir: string, dir: string): void {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                this.walk(distDir, fullPath);
            } else if (entry.name.endsWith(".js") || entry.name.endsWith(".d.ts")) {
                this.rewriteFile(distDir, fullPath);
            }
        }
    }

    private rewriteFile(distDir: string, filePath: string): void {
        const content = readFileSync(filePath, "utf-8");
        if (!content.includes("~/")) return;

        const depth = relative(distDir, dirname(filePath))
            .split("/")
            .filter(Boolean).length;
        const prefix = depth === 0 ? "./" : "../".repeat(depth);
        const rewritten = content.replace(/(["'])~\//g, `$1${prefix}`);
        writeFileSync(filePath, rewritten, "utf-8");
    }
}

export const PathAliasRewriter = PathAliasRewriterAbstraction.createImplementation({
    implementation: PathAliasRewriterImpl,
    dependencies: []
});
```

`dependencies: []` — the rewriter takes `distDir` as a method parameter; `BuildOrchestrator` already has `distDir` computed and passes it in.

- [ ] **Step 4: Wire into `BuildOrchestrator`**

Replace `scripts/features/BuildPackages/BuildOrchestrator.ts` entirely:

```typescript
import { BuildOrchestrator as BuildOrchestratorAbstraction } from "./abstractions/BuildOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { Cleaner } from "./abstractions/Cleaner.ts";
import { Compiler } from "./abstractions/Compiler.ts";
import { ArtifactCopier } from "./abstractions/ArtifactCopier.ts";
import { PathAliasRewriter } from "./abstractions/PathAliasRewriter.ts";
import { join } from "node:path";

class BuildOrchestratorImpl implements BuildOrchestratorAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;
    private readonly cleaner: Cleaner.Interface;
    private readonly compiler: Compiler.Interface;
    private readonly artifactCopier: ArtifactCopier.Interface;
    private readonly pathAliasRewriter: PathAliasRewriter.Interface;

    public constructor(
        config: ProjectConfig.Interface,
        cleaner: Cleaner.Interface,
        compiler: Compiler.Interface,
        artifactCopier: ArtifactCopier.Interface,
        pathAliasRewriter: PathAliasRewriter.Interface
    ) {
        this.config = config;
        this.cleaner = cleaner;
        this.compiler = compiler;
        this.artifactCopier = artifactCopier;
        this.pathAliasRewriter = pathAliasRewriter;
    }

    public run(): void {
        const { rootDir, slices } = this.config;
        const distDir = join(rootDir, "dist");

        this.cleaner.clean(distDir);

        for (const slice of slices) {
            this.compiler.compile(slice);
        }

        this.pathAliasRewriter.rewrite(distDir);

        this.artifactCopier.copyPackageJson(rootDir, distDir);
        this.artifactCopier.copyReadme(rootDir, distDir);
        this.artifactCopier.copyLicense(rootDir, distDir);
    }
}

export const BuildOrchestrator = BuildOrchestratorAbstraction.createImplementation({
    implementation: BuildOrchestratorImpl,
    dependencies: [ProjectConfig, Cleaner, Compiler, ArtifactCopier, PathAliasRewriter]
});
```

The `dependencies` array order must exactly match the constructor parameter order.

- [ ] **Step 5: Register in the DI container**

Replace `scripts/features/BuildPackages/index.ts` entirely:

```typescript
import { Container } from "@webiny/di";
import { ProjectConfig, BuildOrchestrator } from "./abstractions/index.ts";
import { Cleaner as CleanerImpl } from "./Cleaner.ts";
import { Compiler as CompilerImpl } from "./Compiler.ts";
import { ArtifactCopier as ArtifactCopierImpl } from "./ArtifactCopier.ts";
import { BuildOrchestrator as BuildOrchestratorImpl } from "./BuildOrchestrator.ts";
import { PathAliasRewriter as PathAliasRewriterImpl } from "./PathAliasRewriter.ts";

export function run(rootDir: string): void {
    const container = new Container();
    container.registerInstance(ProjectConfig, {
        rootDir,
        slices: ["tsconfig.common.json", "tsconfig.node.json", "tsconfig.browser.json"]
    });
    container.register(CleanerImpl).inSingletonScope();
    container.register(CompilerImpl).inSingletonScope();
    container.register(ArtifactCopierImpl).inSingletonScope();
    container.register(PathAliasRewriterImpl).inSingletonScope();
    container.register(BuildOrchestratorImpl).inSingletonScope();
    container.resolve(BuildOrchestrator).run();
}
```

- [ ] **Step 6: Run typecheck**

```bash
yarn typecheck
```

Expected: zero errors (scripts are now covered by `tsconfig.check.node.json`).

- [ ] **Step 7: Run the build**

```bash
yarn build
```

Expected: clean build with zero errors or warnings.

- [ ] **Step 8: Verify aliases were rewritten**

```bash
grep -r "~/" dist/
```

Expected: no output. If any `~/` appears, the rewriter did not run — check that `PathAliasRewriter` is registered and called.

```bash
grep "common/index" dist/index.js
```

Expected output:
```
export * from "./common/index.js";
```

```bash
grep "common/index" dist/node/features/FileTool/FileTool.js
```

Expected: a line containing `../../../common/index.js`.

```bash
grep "common/index" dist/node/features/FileTool/abstractions/FileTool.js
```

Expected: a line containing `../../../../common/index.js`.

- [ ] **Step 9: Run tests**

```bash
yarn test
```

Expected: all tests pass.

- [ ] **Step 10: Run full pre-commit chain**

```bash
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Expected: all five steps pass with zero errors and zero warnings. If any step fails, fix the issue and re-run the full chain from the start before proceeding.

- [ ] **Step 11: Commit**

```bash
git add scripts/features/BuildPackages/
git commit -m "feat(build): add PathAliasRewriter to rewrite ~/common aliases in dist/

TypeScript does not rewrite path aliases in emitted JS. PathAliasRewriter
walks dist/ post-compilation and replaces every ~/ occurrence in .js and
.d.ts files with a depth-relative prefix (e.g. ../../../ at depth 3).

Wired as a new DI feature in BuildOrchestrator, runs after all tsgo -b
calls complete and before artifact copying."
```

---

### Task 5: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

---

- [ ] **Step 1: Update the Repository Structure section**

In the file tree, replace `tsconfig.base.json` with `tsconfig.checkmode.json` and remove `tsconfig.check.json`. The relevant lines should read:

```
├── tsconfig.json         # solution file + shared compiler options (no separate base)
├── tsconfig.base.json    # ← DELETE this line
├── tsconfig.checkmode.json # shared check overrides (composite:false, noEmit:true, rootDir:.)
├── tsconfig.check.json   # ← DELETE this line
├── tsconfig.check.common.json  # type-check config for src/ + __tests__/ (common)
├── tsconfig.check.node.json    # type-check config for src/node/ + __tests__/node/ + scripts/
├── tsconfig.check.browser.json # type-check config for src/browser/ + __tests__/browser/
```

- [ ] **Step 2: Update the TypeScript Config section — Build tsconfigs**

In the **Build tsconfigs** subsection, update all three example configs to show `"extends": "./tsconfig.json"` and include the `"paths": { "~/*": ["./src/*"] }` entry. Remove the note about `tsconfig.base.json` providing strict flags; replace it with a note that `tsconfig.json` now carries both the solution references and the shared strict flags.

- [ ] **Step 3: Update the TypeScript Config section — Check tsconfigs**

Replace the four check config examples with the new thin format:

```json
// tsconfig.check.common.json
{
  "extends": ["./tsconfig.common.json", "./tsconfig.checkmode.json"],
  "include": ["src", "__tests__", "vitest.config.ts"],
  "exclude": ["src/node", "src/browser", "__tests__/node", "__tests__/browser"]
}

// tsconfig.check.node.json
{
  "extends": ["./tsconfig.node.json", "./tsconfig.checkmode.json"],
  "compilerOptions": { "allowImportingTsExtensions": true },
  "include": ["src/node", "__tests__/node", "scripts"]
}

// tsconfig.check.browser.json
{
  "extends": ["./tsconfig.browser.json", "./tsconfig.checkmode.json"],
  "include": ["src/browser", "__tests__/browser"]
}
```

Remove the `tsconfig.check.json` (scripts) example entirely.

Update the `yarn typecheck` command example:
```sh
tsgo -p tsconfig.check.common.json && tsgo -p tsconfig.check.node.json && tsgo -p tsconfig.check.browser.json
```

- [ ] **Step 4: Update the cross-slice imports section**

Find:

> From `src/node/features/<Name>/*.ts` or `src/browser/features/<Name>/*.ts` → `../../../index.js`
> From `src/node/features/<Name>/abstractions/*.ts` → `../../../../index.js`

Replace with:

> From anywhere in `src/node/` or `src/browser/` → `~/common/index.js`

Replace the cross-slice import example:

```ts
// before
import { Logger } from "../../../index.js";

// after
import { Logger } from "~/common/index.js";
```

Remove the depth-counting guidance (the stable alias makes depth irrelevant).

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md for path alias and tsconfig consolidation

Reflect ~/common/index.js import pattern, 9→8 tsconfig restructure
(base merged into solution, checkmode.json extracted, scripts check
folded into node check), and updated typecheck command."
```
