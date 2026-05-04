# @webiny/stdlib Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate `@webiny/utils-common`, `@webiny/utils-node`, and `@webiny/utils-browser` into a single published package `@webiny/stdlib` with subpath exports `@webiny/stdlib`, `@webiny/stdlib/node`, and `@webiny/stdlib/browser`.

**Architecture:** A single `packages/stdlib/` workspace replaces three separate packages. Three tsgo project references within the package enforce compile-time platform boundaries (common / node / browser). The old packages are deleted once the new package passes all checks.

**Tech Stack:** Yarn 4, TypeScript (tsgo / `@typescript/native-preview`), Vitest 4, `@webiny/di`

**Spec:** `docs/superpowers/specs/2026-05-04-stdlib-design.md`

---

## File Map

### Created
| File | Purpose |
|---|---|
| `packages/stdlib/package.json` | Package manifest with subpath exports |
| `packages/stdlib/tsconfig.json` | Solution file referencing three slice build configs |
| `packages/stdlib/tsconfig.common.json` | Compiles `src/` → `dist/` |
| `packages/stdlib/tsconfig.node.json` | Compiles `src/node/` → `dist/node/` |
| `packages/stdlib/tsconfig.browser.json` | Compiles `src/browser/` → `dist/browser/` |
| `packages/stdlib/tsconfig.check.json` | Type-checks common src + common tests |
| `packages/stdlib/tsconfig.check.node.json` | Type-checks node src + node tests |
| `packages/stdlib/tsconfig.check.browser.json` | Type-checks browser src + browser tests |
| `packages/stdlib/vitest.config.ts` | Test runner config with `environmentMatchGlobs` |
| `packages/stdlib/src/index.ts` | Common barrel (moved from `packages/common/src/index.ts`) |
| `packages/stdlib/src/core/` | Moved from `packages/common/src/core/` |
| `packages/stdlib/src/features/` | Moved from `packages/common/src/features/` |
| `packages/stdlib/src/node/index.ts` | Node barrel (moved from `packages/node/src/index.ts`) |
| `packages/stdlib/src/node/features/` | Moved from `packages/node/src/features/` |
| `packages/stdlib/src/browser/index.ts` | Browser barrel (moved from `packages/browser/src/index.ts`) |
| `packages/stdlib/src/browser/features/` | Moved from `packages/browser/src/features/` |
| `packages/stdlib/__tests__/` | Common tests (moved from `packages/common/__tests__/`) |
| `packages/stdlib/__tests__/node/` | Node tests (moved from `packages/node/__tests__/`) |
| `packages/stdlib/__tests__/browser/` | Browser tests (moved from `packages/browser/__tests__/`) |

### Modified
| File | Change |
|---|---|
| `tsconfig.json` (root) | Remove 3 package refs, add `packages/stdlib` |
| `vitest.workspace.ts` | Replace 3 projects with 1 |
| `package.json` (root) | Update `typecheck` script |
| `scripts/features/BuildPackages/abstractions/ProjectConfig.ts` | Add optional `slices` field |
| `scripts/features/BuildPackages/BuildOrchestrator.ts` | Handle `slices` in compile loop |
| `scripts/features/BuildPackages/index.ts` | Annotate stdlib with slices |
| `AGENTS.md` | Update all package names, paths, and import conventions |

### Deleted
- `packages/common/` (entire directory)
- `packages/node/` (entire directory)
- `packages/browser/` (entire directory)

---

## Task 1: Create stdlib package scaffold

**Files:** Creates all config files and empty barrels. No source code yet.

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p packages/stdlib/src/node/features
mkdir -p packages/stdlib/src/browser/features
mkdir -p packages/stdlib/__tests__/node
mkdir -p packages/stdlib/__tests__/browser
```

- [ ] **Step 2: Create `packages/stdlib/package.json`**

```json
{
    "name": "@webiny/stdlib",
    "version": "0.0.0",
    "type": "module",
    "description": "Standard library for Webiny — platform-agnostic, Node.js, and browser utilities",
    "license": "MIT",
    "exports": {
        ".": {
            "import": "./dist/index.js",
            "types": "./dist/index.d.ts"
        },
        "./node": {
            "import": "./dist/node/index.js",
            "types": "./dist/node/index.d.ts"
        },
        "./browser": {
            "import": "./dist/browser/index.js",
            "types": "./dist/browser/index.d.ts"
        }
    },
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "files": ["dist"],
    "dependencies": {
        "@webiny/di": "^0.2.3",
        "fast-glob": "^3.3.3",
        "pino": "^10.3.1",
        "pino-pretty": "^13.1.3",
        "type-fest": "^5.6.0",
        "zod": "^4.4.2"
    },
    "devDependencies": {
        "@typescript/native-preview": "beta",
        "happy-dom": "^20.9.0",
        "vitest": "^4.1.5"
    },
    "scripts": {
        "build": "tsgo -b --force",
        "test": "vitest run",
        "test:coverage": "vitest run --coverage"
    }
}
```

- [ ] **Step 3: Create `packages/stdlib/tsconfig.json` (solution file)**

```json
{
    "files": [],
    "references": [
        { "path": "./tsconfig.common.json" },
        { "path": "./tsconfig.node.json" },
        { "path": "./tsconfig.browser.json" }
    ]
}
```

- [ ] **Step 4: Create `packages/stdlib/tsconfig.common.json`**

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "composite": true,
        "rootDir": "./src",
        "outDir": "./dist",
        "module": "nodenext",
        "moduleResolution": "nodenext",
        "lib": ["esnext", "dom"],
        "paths": {
            "~/common": ["./src/index.js"],
            "~/*": ["./src/*"]
        }
    },
    "include": ["src"],
    "exclude": ["src/node", "src/browser"]
}
```

- [ ] **Step 5: Create `packages/stdlib/tsconfig.node.json`**

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "composite": true,
        "rootDir": "./src/node",
        "outDir": "./dist/node",
        "module": "nodenext",
        "moduleResolution": "nodenext",
        "types": ["node"],
        "paths": {
            "~/common": ["./src/index.js"],
            "~/node": ["./src/node/index.js"],
            "~/*": ["./src/*"]
        }
    },
    "include": ["src/node"],
    "references": [{ "path": "./tsconfig.common.json" }]
}
```

- [ ] **Step 6: Create `packages/stdlib/tsconfig.browser.json`**

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "composite": true,
        "rootDir": "./src/browser",
        "outDir": "./dist/browser",
        "module": "nodenext",
        "moduleResolution": "nodenext",
        "lib": ["esnext", "dom", "dom.iterable"],
        "paths": {
            "~/common": ["./src/index.js"],
            "~/browser": ["./src/browser/index.js"],
            "~/*": ["./src/*"]
        }
    },
    "include": ["src/browser"],
    "references": [{ "path": "./tsconfig.common.json" }]
}
```

- [ ] **Step 7: Create `packages/stdlib/tsconfig.check.json`**

```json
{
    "extends": "./tsconfig.common.json",
    "compilerOptions": {
        "composite": false,
        "noEmit": true,
        "rootDir": "."
    },
    "include": ["src", "__tests__", "vitest.config.ts"],
    "exclude": ["src/node", "src/browser", "__tests__/node", "__tests__/browser"]
}
```

- [ ] **Step 8: Create `packages/stdlib/tsconfig.check.node.json`**

```json
{
    "extends": "./tsconfig.node.json",
    "compilerOptions": {
        "composite": false,
        "noEmit": true,
        "rootDir": "."
    },
    "include": ["src/node", "__tests__/node"]
}
```

- [ ] **Step 9: Create `packages/stdlib/tsconfig.check.browser.json`**

```json
{
    "extends": "./tsconfig.browser.json",
    "compilerOptions": {
        "composite": false,
        "noEmit": true,
        "rootDir": "."
    },
    "include": ["src/browser", "__tests__/browser"]
}
```

- [ ] **Step 10: Create `packages/stdlib/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environmentMatchGlobs: [["__tests__/browser/**", "happy-dom"]],
        include: ["__tests__/**/*.{test,spec}.{ts,tsx}"]
    }
});
```

- [ ] **Step 11: Create empty barrel stubs**

`packages/stdlib/src/index.ts`:
```ts
// populated in Task 2
export {};
```

`packages/stdlib/src/node/index.ts`:
```ts
// populated in Task 3
export {};
```

`packages/stdlib/src/browser/index.ts`:
```ts
// populated in Task 4
export {};
```

- [ ] **Step 12: Create `packages/stdlib/README.md`**

The build script copies `README.md` from the package directory into `dist/` and throws if it is missing. Create a minimal placeholder — it can be filled in later:

```markdown
# @webiny/stdlib

Standard library for Webiny applications.

- `@webiny/stdlib` — platform-agnostic utilities (Result, Logger, Cache, …)
- `@webiny/stdlib/node` — Node.js utilities (FileTool, DirectoryTool, PinoLogger, …)
- `@webiny/stdlib/browser` — browser utilities (LocalStorageCacheFeature, …)
```

- [ ] **Step 13: Wire into Yarn workspace**

```bash
yarn install
```

Expected: Yarn picks up `@webiny/stdlib` as a workspace. No errors.

- [ ] **Step 14: Commit**

```bash
git add packages/stdlib/
git commit -m "feat: add stdlib package scaffold with tsconfigs and empty barrels"
```

---

## Task 2: Migrate common source

**Files:** Moves `packages/common/src/` (core + features + barrel) into `packages/stdlib/src/`. No import changes needed — common code has no cross-package deps.

- [ ] **Step 1: Copy core and features**

```bash
cp -r packages/common/src/core packages/stdlib/src/core
cp -r packages/common/src/features packages/stdlib/src/features
```

- [ ] **Step 2: Replace the stub barrel with the real one**

```bash
cp packages/common/src/index.ts packages/stdlib/src/index.ts
```

- [ ] **Step 3: Build the common slice**

```bash
node_modules/.bin/tsgo -b --force packages/stdlib/tsconfig.common.json
```

Expected: exits 0, `packages/stdlib/dist/` contains `index.js`, `index.d.ts`, `core/`, `features/`.

- [ ] **Step 4: Type-check common slice with tests path**

```bash
node_modules/.bin/tsgo -p packages/stdlib/tsconfig.check.json
```

Expected: exits 0 (no tests yet in `__tests__/`, that's fine — the check covers the source).

- [ ] **Step 5: Commit**

```bash
git add packages/stdlib/src/
git commit -m "feat(stdlib): migrate common source"
```

---

## Task 3: Migrate node source

**Files:** Moves `packages/node/src/` into `packages/stdlib/src/node/`. Updates all `@webiny/utils-common` imports to `~/common`.

- [ ] **Step 1: Copy node features and barrel**

```bash
cp -r packages/node/src/features packages/stdlib/src/node/features
cp packages/node/src/index.ts packages/stdlib/src/node/index.ts
```

- [ ] **Step 2: Replace `@webiny/utils-common` with `~/common` in all node source files**

```bash
find packages/stdlib/src/node -name "*.ts" | xargs sed -i '' 's|"@webiny/utils-common"|"~/common"|g'
```

- [ ] **Step 3: Verify no stale package references remain**

```bash
grep -r 'utils-common\|utils-node\|utils-browser' packages/stdlib/src/node/
```

Expected: no output (zero matches).

- [ ] **Step 4: Build the node slice**

```bash
node_modules/.bin/tsgo -b --force packages/stdlib/tsconfig.common.json
node_modules/.bin/tsgo -b --force packages/stdlib/tsconfig.node.json
```

Expected: both exit 0. `packages/stdlib/dist/node/` contains `index.js`, `index.d.ts`, and all feature subdirectories.

- [ ] **Step 5: Type-check node slice**

```bash
node_modules/.bin/tsgo -p packages/stdlib/tsconfig.check.node.json
```

Expected: exits 0.

- [ ] **Step 6: Update consumer-facing import paths in node feature READMEs**

The feature `README.md` files contain usage examples that show old package names. Update them all at once:

```bash
find packages/stdlib/src/node -name "README.md" | xargs sed -i '' \
  -e 's|"@webiny/utils-node"|"@webiny/stdlib/node"|g' \
  -e 's|"@webiny/utils-common"|"@webiny/stdlib"|g'
```

- [ ] **Step 7: Verify README references**

```bash
grep -r 'utils-node\|utils-common\|utils-browser' packages/stdlib/src/node/
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add packages/stdlib/src/node/
git commit -m "feat(stdlib): migrate node source"
```

---

## Task 4: Migrate browser source

**Files:** Moves `packages/browser/src/` into `packages/stdlib/src/browser/`. Updates all `@webiny/utils-common` imports to `~/common`.

- [ ] **Step 1: Copy browser features and barrel**

```bash
cp -r packages/browser/src/features packages/stdlib/src/browser/features
cp packages/browser/src/index.ts packages/stdlib/src/browser/index.ts
```

- [ ] **Step 2: Replace `@webiny/utils-common` with `~/common` in all browser source files**

```bash
find packages/stdlib/src/browser -name "*.ts" | xargs sed -i '' 's|"@webiny/utils-common"|"~/common"|g'
```

- [ ] **Step 3: Verify no stale package references remain**

```bash
grep -r 'utils-common\|utils-node\|utils-browser' packages/stdlib/src/browser/
```

Expected: no output.

- [ ] **Step 4: Build the browser slice**

```bash
node_modules/.bin/tsgo -b --force packages/stdlib/tsconfig.browser.json
```

Expected: exits 0. `packages/stdlib/dist/browser/` contains `index.js`, `index.d.ts`, `features/`.

- [ ] **Step 5: Type-check browser slice**

```bash
node_modules/.bin/tsgo -p packages/stdlib/tsconfig.check.browser.json
```

Expected: exits 0.

- [ ] **Step 6: Update consumer-facing import paths in browser feature READMEs**

```bash
find packages/stdlib/src/browser -name "README.md" | xargs sed -i '' \
  -e 's|"@webiny/utils-browser"|"@webiny/stdlib/browser"|g' \
  -e 's|"@webiny/utils-common"|"@webiny/stdlib"|g'
```

- [ ] **Step 7: Fix cross-package relative path in `LocalStorageCache/README.md`**

The old README referenced the Cache README via a path that crossed package boundaries. After migration both files live under `packages/stdlib/src/`, so update the broken path:

```bash
sed -i '' \
  's|../../../../../../common/src/features/Cache/README.md|../../../features/Cache/README.md|g' \
  packages/stdlib/src/browser/features/LocalStorageCache/README.md
```

Also update the prose reference to `@webiny/utils-common`:

```bash
sed -i '' \
  's|`@webiny/utils-common`|`@webiny/stdlib`|g' \
  packages/stdlib/src/browser/features/LocalStorageCache/README.md
```

- [ ] **Step 8: Verify README references**

```bash
grep -r 'utils-common\|utils-node\|utils-browser' packages/stdlib/src/browser/
```

Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add packages/stdlib/src/browser/
git commit -m "feat(stdlib): migrate browser source"
```

---

## Task 5: Migrate tests

**Files:** Copies all three test suites into `packages/stdlib/__tests__/`. Updates relative import paths (node and browser tests are now one directory deeper) and replaces `@webiny/utils-common` package imports with relative paths.

- [ ] **Step 1: Copy common tests (no path changes needed)**

```bash
cp packages/common/__tests__/*.test.ts packages/stdlib/__tests__/
```

Common tests currently import `"../src/core/..."` or `"../src/features/..."`. After the copy, `__tests__/` is still one level above `src/`, so these relative paths are unchanged.

- [ ] **Step 2: Copy node tests**

```bash
cp packages/node/__tests__/*.test.ts packages/stdlib/__tests__/node/
```

- [ ] **Step 3: Fix node test import depth**

Node tests currently use `"../src/features/..."`. They're now in `__tests__/node/`, one level deeper, so the path must become `"../../src/node/features/..."`.

```bash
find packages/stdlib/__tests__/node -name "*.test.ts" | xargs sed -i '' 's|"../src/features/|"../../src/node/features/|g'
```

- [ ] **Step 4: Fix `@webiny/utils-common` import in `PinoLogger.test.ts`**

```bash
sed -i '' 's|from "@webiny/utils-common"|from "../../src/index.js"|g' packages/stdlib/__tests__/node/PinoLogger.test.ts
```

- [ ] **Step 5: Verify all node test imports resolve**

```bash
grep -n 'utils-common\|utils-node\|"../src/' packages/stdlib/__tests__/node/*.test.ts
```

Expected: no output.

- [ ] **Step 6: Copy browser tests**

```bash
cp packages/browser/__tests__/*.test.ts packages/stdlib/__tests__/browser/
```

- [ ] **Step 7: Fix browser test relative import depth**

```bash
find packages/stdlib/__tests__/browser -name "*.test.ts" | xargs sed -i '' 's|"../src/features/|"../../src/browser/features/|g'
sed -i '' 's|"../src/index.js"|"../../src/browser/index.js"|g' packages/stdlib/__tests__/browser/index.test.ts
```

- [ ] **Step 8: Fix `@webiny/utils-common` import in `LocalStorageCache.test.ts`**

```bash
sed -i '' 's|from "@webiny/utils-common"|from "../../src/index.js"|g' packages/stdlib/__tests__/browser/LocalStorageCache.test.ts
```

- [ ] **Step 9: Remove per-file happy-dom directive from `LocalStorageCache.test.ts`**

The `// @vitest-environment happy-dom` directive is replaced by `environmentMatchGlobs` in `vitest.config.ts`. Remove it:

```bash
sed -i '' '/\/\/ @vitest-environment happy-dom/d' packages/stdlib/__tests__/browser/LocalStorageCache.test.ts
```

- [ ] **Step 10: Verify all browser test imports resolve**

```bash
grep -n 'utils-common\|utils-browser\|"../src/' packages/stdlib/__tests__/browser/*.test.ts
```

Expected: no output.

- [ ] **Step 11: Type-check all three check configs**

```bash
node_modules/.bin/tsgo -p packages/stdlib/tsconfig.check.json && \
node_modules/.bin/tsgo -p packages/stdlib/tsconfig.check.node.json && \
node_modules/.bin/tsgo -p packages/stdlib/tsconfig.check.browser.json
```

Expected: all exit 0.

- [ ] **Step 12: Commit**

```bash
git add packages/stdlib/__tests__/
git commit -m "feat(stdlib): migrate tests"
```

---

## Task 6: Update root config files

**Files:** Switches root tsconfig, vitest workspace, and typecheck script from the three old packages to the single stdlib package.

- [ ] **Step 1: Update `tsconfig.json` (root solution file)**

Replace the file content:

```json
{
    "files": [],
    "references": [
        { "path": "./packages/stdlib" }
    ]
}
```

- [ ] **Step 2: Update `vitest.workspace.ts`**

Replace the file content:

```ts
import { defineProject } from "vitest/config";

export default [
    defineProject({ test: { name: "utils-stdlib", root: "./packages/stdlib" } })
];
```

- [ ] **Step 3: Update root `package.json` `typecheck` script**

In `package.json`, replace the `typecheck` value:

```json
"typecheck": "tsgo -p tsconfig.check.json && tsgo -p packages/stdlib/tsconfig.check.json && tsgo -p packages/stdlib/tsconfig.check.node.json && tsgo -p packages/stdlib/tsconfig.check.browser.json"
```

- [ ] **Step 4: Run typecheck**

```bash
yarn typecheck
```

Expected: exits 0.

- [ ] **Step 5: Run all tests**

```bash
yarn test
```

Expected: all tests pass (common + node + browser).

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json vitest.workspace.ts package.json
git commit -m "feat: wire root configs to @webiny/stdlib"
```

---

## Task 7: Update build scripts

**Files:** Adds `slices` support to the build orchestrator so the three stdlib tsgo configs are compiled in sequence (required because tsgo project-reference ordering is unreliable in the current beta).

- [ ] **Step 1: Update `scripts/features/BuildPackages/abstractions/ProjectConfig.ts`**

Add `slices` to the package shape:

```ts
import { Abstraction } from "@webiny/di";

export interface IProjectConfig {
    rootDir: string;
    packages: ReadonlyArray<{ dir: string; name: string; slices?: string[] }>;
}

export const ProjectConfig = new Abstraction<IProjectConfig>("Scripts/Build/ProjectConfig");

export namespace ProjectConfig {
    export type Interface = IProjectConfig;
}
```

- [ ] **Step 2: Update `scripts/features/BuildPackages/BuildOrchestrator.ts`**

Replace the compile loop to handle slices:

```ts
import { join } from "node:path";
import { BuildOrchestrator as BuildOrchestratorAbstraction } from "./abstractions/BuildOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { Cleaner } from "./abstractions/Cleaner.ts";
import { Compiler } from "./abstractions/Compiler.ts";
import { ArtifactCopier } from "./abstractions/ArtifactCopier.ts";

class BuildOrchestratorImpl implements BuildOrchestratorAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;
    private readonly cleaner: Cleaner.Interface;
    private readonly compiler: Compiler.Interface;
    private readonly artifactCopier: ArtifactCopier.Interface;

    public constructor(
        config: ProjectConfig.Interface,
        cleaner: Cleaner.Interface,
        compiler: Compiler.Interface,
        artifactCopier: ArtifactCopier.Interface
    ) {
        this.config = config;
        this.cleaner = cleaner;
        this.compiler = compiler;
        this.artifactCopier = artifactCopier;
    }

    public run(): void {
        const { rootDir, packages } = this.config;

        for (const pkg of packages) {
            this.cleaner.clean(join(rootDir, "packages", pkg.dir, "dist"));
        }

        for (const pkg of packages) {
            if (pkg.slices !== undefined) {
                for (const slice of pkg.slices) {
                    this.compiler.compile(join("packages", pkg.dir, slice));
                }
            } else {
                this.compiler.compile(join("packages", pkg.dir));
            }
        }

        for (const pkg of packages) {
            const packageAbsDir = join(rootDir, "packages", pkg.dir);
            const distAbsDir = join(packageAbsDir, "dist");
            this.artifactCopier.copyPackageJson(packageAbsDir, distAbsDir);
            this.artifactCopier.copyReadme(packageAbsDir, distAbsDir);
            this.artifactCopier.copyLicense(rootDir, distAbsDir);
        }
    }
}

export const BuildOrchestrator = BuildOrchestratorAbstraction.createImplementation({
    implementation: BuildOrchestratorImpl,
    dependencies: [ProjectConfig, Cleaner, Compiler, ArtifactCopier]
});
```

- [ ] **Step 3: Update `scripts/features/BuildPackages/index.ts`**

Annotate the stdlib workspace with its three slice configs:

```ts
import { Container } from "@webiny/di";
import { ProjectConfig, BuildOrchestrator } from "./abstractions/index.ts";
import { Cleaner as CleanerImpl } from "./Cleaner.ts";
import { Compiler as CompilerImpl } from "./Compiler.ts";
import { ArtifactCopier as ArtifactCopierImpl } from "./ArtifactCopier.ts";
import { BuildOrchestrator as BuildOrchestratorImpl } from "./BuildOrchestrator.ts";
import { getWorkspaces } from "../../getWorkspaces.ts";

export function run(rootDir: string): void {
    const packages = getWorkspaces(rootDir).map(ws =>
        ws.name === "@webiny/stdlib"
            ? {
                  ...ws,
                  slices: [
                      "tsconfig.common.json",
                      "tsconfig.node.json",
                      "tsconfig.browser.json"
                  ]
              }
            : ws
    );
    const container = new Container();
    container.registerInstance(ProjectConfig, { rootDir, packages });
    container.register(CleanerImpl).inSingletonScope();
    container.register(CompilerImpl).inSingletonScope();
    container.register(ArtifactCopierImpl).inSingletonScope();
    container.register(BuildOrchestratorImpl).inSingletonScope();
    container.resolve(BuildOrchestrator).run();
}
```

- [ ] **Step 4: Run the typecheck on scripts**

```bash
node_modules/.bin/tsgo -p tsconfig.check.json
```

Expected: exits 0.

- [ ] **Step 5: Run the build script end-to-end**

```bash
node scripts/buildPackages.ts
```

Expected: exits 0. `packages/stdlib/dist/` contains `index.js`, `node/index.js`, and `browser/index.js`. `packages/stdlib/dist/package.json` is present with `@webiny/stdlib` as name and paths stripped of `./dist/` prefix.

- [ ] **Step 6: Commit**

```bash
git add scripts/features/BuildPackages/abstractions/ProjectConfig.ts \
        scripts/features/BuildPackages/BuildOrchestrator.ts \
        scripts/features/BuildPackages/index.ts
git commit -m "feat: support per-package tsconfig slices in build orchestrator"
```

---

## Task 8: Full verification and delete old packages

- [ ] **Step 1: Run the full pre-commit chain**

```bash
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Expected: all five steps pass with zero errors and zero warnings. Fix any issues before proceeding.

- [ ] **Step 2: Delete the old packages**

```bash
rm -rf packages/common packages/node packages/browser
```

- [ ] **Step 3: Run the full pre-commit chain again**

```bash
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Expected: all five steps still pass. The old packages are gone and nothing references them.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete old utils-common, utils-node, utils-browser packages"
```

---

## Task 9: Update AGENTS.md

**Files:** Updates AGENTS.md throughout to reflect the new single-package structure.

- [ ] **Step 1: Update the Project Overview section**

Replace the current package list paragraph. New text:

```markdown
The packages provide platform-specific utility services (file system, directory management,
logging, HTTP fetching, etc.) built on a dependency injection system (`@webiny/di`). Every
service follows the same abstraction → implementation → feature pattern described in detail below.
All utilities are published as a single package `@webiny/stdlib` with three subpath exports:
`@webiny/stdlib` (common), `@webiny/stdlib/node` (Node.js), and `@webiny/stdlib/browser` (browser).
```

- [ ] **Step 2: Update the Monorepo Structure section**

Replace the directory tree:

```
/
├── packages/
│   └── stdlib/          # @webiny/stdlib — common, node, and browser utilities
│       ├── src/         # platform-agnostic (Result, Logger, Cache, …)
│       ├── src/node/    # Node.js-specific (FileTool, DirectoryTool, …)
│       └── src/browser/ # browser-specific (LocalStorageCacheFeature, …)
├── package.json
├── tsconfig.json
├── tsconfig.base.json
├── tsconfig.check.json
├── vitest.config.ts
├── vitest.workspace.ts
├── CLAUDE.md
└── AGENTS.md
```

Update the per-package file list to describe the stdlib structure:

Each package lives in `packages/stdlib/` and has its own:

- `package.json`
- `tsconfig.json` — solution file referencing `tsconfig.common.json`, `tsconfig.node.json`, `tsconfig.browser.json`
- `tsconfig.common.json` / `tsconfig.node.json` / `tsconfig.browser.json` — slice build configs
- `tsconfig.check.json` / `tsconfig.check.node.json` / `tsconfig.check.browser.json` — slice check configs
- `vitest.config.ts`
- `src/` — common source (platform-agnostic)
- `src/node/` — Node.js source
- `src/browser/` — browser source
- `__tests__/` — common tests
- `__tests__/node/` — Node.js tests
- `__tests__/browser/` — browser tests

- [ ] **Step 3: Update the Packages section**

Replace the three-package listing. Rename `### @webiny/utils-common` to `### @webiny/stdlib`, `### @webiny/utils-node` to `### @webiny/stdlib/node`, `### @webiny/utils-browser` to `### @webiny/stdlib/browser`.

- [ ] **Step 4: Update the Package Placement Decision Rules table**

Replace the table entries:

```markdown
| Uses only JS built-ins / standard lib      | → `stdlib` root (`src/`)         |
| Uses `node:*` APIs or Node-only npm packages | → `stdlib/node` (`src/node/`)  |
| Uses `window`, `document`, React, browser APIs | → `stdlib/browser` (`src/browser/`) |
```

- [ ] **Step 5: Update the TypeScript Config section**

Replace the three-package tsconfig examples with the stdlib slice configs (exact JSON shown in the spec at `docs/superpowers/specs/2026-05-04-stdlib-design.md`).

Update the `paths` explanation: `@webiny/utils-common` path aliases are replaced by `~/common`, `~/node`, `~/browser`. Explain the first-match ordering requirement (`~/common` before `~/*`).

- [ ] **Step 6: Update the Code Patterns section**

All example file paths now use `packages/stdlib/src/` prefix. Node features live under `packages/stdlib/src/node/features/`, browser under `packages/stdlib/src/browser/features/`, common under `packages/stdlib/src/features/`.

Update the cross-package import example:
```ts
// Before
import { Logger } from "@webiny/utils-common";

// After
import { Logger } from "~/common";
```

- [ ] **Step 7: Update the Testing section**

Container setup examples: `PinoLoggerConfig` and `PinoLoggerFeature` are now imported from `"~/node"` or by relative path. `ConsoleLoggerConfig` and `ConsoleLoggerFeature` from `"~/common"`.

Update the vitest config example to the new `environmentMatchGlobs` form (see Task 1 Step 10).

Update the "Root workspace and coverage" `vitest.workspace.ts` example to the single-project form.

- [ ] **Step 8: Update the Step-by-step guide**

In "Adding a New Tool to an Existing Package", replace all paths:
- `packages/utils-node/src/features/HttpTool/` → `packages/stdlib/src/node/features/HttpTool/`
- `packages/node/__tests__/HttpTool.test.ts` → `packages/stdlib/__tests__/node/HttpTool.test.ts`
- `import { Logger } from "@webiny/utils-common"` → `import { Logger } from "~/common"`

In "Adding a New Package", note that the repo now has one package. Add a note that new runtime environments (e.g. CLI, edge) would follow the same three-tsconfig slice pattern.

- [ ] **Step 9: Update the Build section**

Replace build command:
```sh
yarn build
# expands to: yarn clean && tsgo -b --force packages/stdlib/tsconfig.common.json && tsgo -b --force packages/stdlib/tsconfig.node.json && tsgo -b --force packages/stdlib/tsconfig.browser.json
```

Update test command:
```sh
yarn test --project utils-stdlib
```

- [ ] **Step 10: Update the Inter-Package Dependencies section**

Remove the section (no longer applicable — there is one package). Replace with a note:

```markdown
## Internal Slice Dependencies

Within `@webiny/stdlib`, the `src/node/` and `src/browser/` slices depend on `src/` (common).
Import common utilities using the `~/common` alias:

    import { Logger } from "~/common";

The slices must NOT import from each other.
```

- [ ] **Step 11: Update the Package `package.json` Shape section**

Replace the example with the stdlib `package.json` from Task 1 Step 2.

- [ ] **Step 12: Run typecheck to confirm AGENTS.md didn't break anything (sanity check)**

```bash
yarn typecheck
```

Expected: exits 0.

- [ ] **Step 13: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md for @webiny/stdlib consolidation"
```

---

## Done

Run the final verification:

```bash
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

All five steps must pass clean before declaring the migration complete.
