# Config Directory Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce root-level clutter by moving all tsconfig files into `config/` and `vitest.config.ts` into `testing/`.

**Architecture:** Keep `tsconfig.json` (the solution file with shared compilerOptions) at the repo root for IDE discovery; move the 8 other tsconfig files to `config/` with paths re-relativized one level up (`../`). Move `vitest.config.ts` to `testing/vitest.config.ts` and set an explicit `root` so all glob patterns stay relative to the repo root.

**Tech Stack:** TypeScript (tsgo), Vitest 4, Node 24 strip-only scripts

---

## File Map

| Action | From | To |
|--------|------|----|
| Update in place | `tsconfig.json` | references → `./config/tsconfig.*.json` |
| Move + rewrite | `tsconfig.common.json` | `config/tsconfig.common.json` |
| Move + rewrite | `tsconfig.node.json` | `config/tsconfig.node.json` |
| Move + rewrite | `tsconfig.browser.json` | `config/tsconfig.browser.json` |
| Move + rewrite | `tsconfig.checkmode.json` | `config/tsconfig.checkmode.json` |
| Move + rewrite | `tsconfig.check.common.json` | `config/tsconfig.check.common.json` |
| Move + rewrite | `tsconfig.check.node.json` | `config/tsconfig.check.node.json` |
| Move + rewrite | `tsconfig.check.browser.json` | `config/tsconfig.check.browser.json` |
| Move + rewrite | `tsconfig.check.scripts.json` | `config/tsconfig.check.scripts.json` |
| Move + rewrite | `vitest.config.ts` | `testing/vitest.config.ts` |
| Update in place | `package.json` | `typecheck` + `test*` script paths |
| Update in place | `scripts/features/BuildPackages/index.ts` | slices paths |
| Update in place | `AGENTS.md` | directory structure + tsconfig section |

---

### Task 1: Create `config/` with all build tsconfigs

**Files:**
- Create: `config/tsconfig.common.json`
- Create: `config/tsconfig.node.json`
- Create: `config/tsconfig.browser.json`

All paths inside these files go up one level with `../` because the files moved from repo root to `config/`.

- [ ] **Step 1: Create `config/tsconfig.common.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "../src",
    "outDir": "../dist",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext", "dom"],
    "paths": { "~/*": ["../src/*"] }
  },
  "include": ["../src"],
  "exclude": ["../src/node", "../src/browser"]
}
```

- [ ] **Step 2: Create `config/tsconfig.node.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "../src/node",
    "outDir": "../dist/node",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "paths": { "~/*": ["../src/*"] }
  },
  "include": ["../src/node"],
  "references": [{ "path": "./tsconfig.common.json" }]
}
```

- [ ] **Step 3: Create `config/tsconfig.browser.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "../src/browser",
    "outDir": "../dist/browser",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext", "dom", "dom.iterable"],
    "paths": { "~/*": ["../src/*"] }
  },
  "include": ["../src/browser"],
  "references": [{ "path": "./tsconfig.common.json" }]
}
```

---

### Task 2: Create `config/` check tsconfigs

**Files:**
- Create: `config/tsconfig.checkmode.json`
- Create: `config/tsconfig.check.common.json`
- Create: `config/tsconfig.check.node.json`
- Create: `config/tsconfig.check.browser.json`
- Create: `config/tsconfig.check.scripts.json`

`tsconfig.checkmode.json` has `rootDir: "."` which was the repo root when it lived there. Moving it to `config/` requires changing that to `".."`. All `include`/`exclude` globs in the check configs were bare paths like `"src"` — now they need `"../src"` etc. The `vitest.config.ts` entry in check.common also updates to the new `testing/` location.

- [ ] **Step 1: Create `config/tsconfig.checkmode.json`**

```json
{
  "compilerOptions": {
    "composite": false,
    "noEmit": true,
    "rootDir": ".."
  }
}
```

- [ ] **Step 2: Create `config/tsconfig.check.common.json`**

```json
{
  "extends": ["./tsconfig.common.json", "./tsconfig.checkmode.json"],
  "include": ["../src", "../__tests__", "../testing/vitest.config.ts"],
  "exclude": ["../src/node", "../src/browser", "../__tests__/node", "../__tests__/browser", "../__tests__/scripts"]
}
```

- [ ] **Step 3: Create `config/tsconfig.check.node.json`**

```json
{
  "extends": ["./tsconfig.node.json", "./tsconfig.checkmode.json"],
  "include": ["../src/node", "../__tests__/node"]
}
```

- [ ] **Step 4: Create `config/tsconfig.check.browser.json`**

```json
{
  "extends": ["./tsconfig.browser.json", "./tsconfig.checkmode.json"],
  "include": ["../src/browser", "../__tests__/browser"]
}
```

- [ ] **Step 5: Create `config/tsconfig.check.scripts.json`**

```json
{
  "extends": ["./tsconfig.node.json", "./tsconfig.checkmode.json"],
  "compilerOptions": {
    "allowImportingTsExtensions": true
  },
  "include": ["../scripts", "../__tests__/scripts"]
}
```

---

### Task 3: Update root `tsconfig.json` references

**Files:**
- Modify: `tsconfig.json`

The solution file stays at the root so IDEs and tools discover it automatically. Its only change is pointing `references` to the `config/` subdirectory.

- [ ] **Step 1: Update `tsconfig.json`**

Replace the `references` array:

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
    { "path": "./config/tsconfig.common.json" },
    { "path": "./config/tsconfig.node.json" },
    { "path": "./config/tsconfig.browser.json" }
  ]
}
```

---

### Task 4: Create `testing/vitest.config.ts`

**Files:**
- Create: `testing/vitest.config.ts`

Vitest resolves `include`/`coverage.include` globs relative to `root` (defaults to the config file's directory). By setting `root` explicitly to the repo root, all existing glob patterns (`__tests__/**`, `src/**`) remain unchanged. The `~` alias must also be re-anchored to `root/src`.

- [ ] **Step 1: Create `testing/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

export default defineConfig({
    root,
    resolve: {
        alias: {
            "~": resolve(root, "src")
        }
    },
    test: {
        globals: true,
        include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["**/__tests__/**", "**/index.ts", "**/abstractions/**", "**/feature.ts"],
            thresholds: {
                statements: 96,
                branches: 93,
                functions: 96,
                lines: 96
            }
        }
    }
});
```

---

### Task 5: Update `package.json` scripts

**Files:**
- Modify: `package.json`

Two changes: `typecheck` paths get the `config/` prefix; `test` and `test:coverage` get `--config testing/vitest.config.ts` so Vitest finds the config.

- [ ] **Step 1: Update scripts in `package.json`**

```json
"test": "vitest run --config testing/vitest.config.ts",
"test:coverage": "vitest run --coverage --config testing/vitest.config.ts",
"typecheck": "tsgo -p config/tsconfig.check.common.json && tsgo -p config/tsconfig.check.node.json && tsgo -p config/tsconfig.check.browser.json && tsgo -p config/tsconfig.check.scripts.json"
```

---

### Task 6: Update build script slice paths

**Files:**
- Modify: `scripts/features/BuildPackages/index.ts:12-14`

The `slices` array holds the paths the `Compiler` passes to `tsgo -b`. These are relative to `rootDir` (the repo root), so they need the `config/` prefix now.

- [ ] **Step 1: Update `slices` in `scripts/features/BuildPackages/index.ts`**

Change:
```ts
slices: ["tsconfig.common.json", "tsconfig.node.json", "tsconfig.browser.json"]
```

To:
```ts
slices: ["config/tsconfig.common.json", "config/tsconfig.node.json", "config/tsconfig.browser.json"]
```

---

### Task 7: Delete the old root-level files

**Files:**
- Delete: `tsconfig.common.json`
- Delete: `tsconfig.node.json`
- Delete: `tsconfig.browser.json`
- Delete: `tsconfig.checkmode.json`
- Delete: `tsconfig.check.common.json`
- Delete: `tsconfig.check.node.json`
- Delete: `tsconfig.check.browser.json`
- Delete: `tsconfig.check.scripts.json`
- Delete: `vitest.config.ts`

- [ ] **Step 1: Remove old files**

```bash
rm tsconfig.common.json tsconfig.node.json tsconfig.browser.json \
   tsconfig.checkmode.json \
   tsconfig.check.common.json tsconfig.check.node.json \
   tsconfig.check.browser.json tsconfig.check.scripts.json \
   vitest.config.ts
```

Also clean any stale `.tsbuildinfo` files at the root (they'll regenerate in `config/` on next build):

```bash
rm -f *.tsbuildinfo
```

---

### Task 8: Run pre-commit chain and commit

- [ ] **Step 1: Run full pre-commit chain from repo root**

```bash
yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

All seven steps must pass with zero errors. If `yarn typecheck` fails, recheck that every path in the `config/` tsconfigs starts with `../` and that `tsconfig.checkmode.json` has `rootDir: ".."`. If `yarn test:coverage` fails with a "cannot find" error, verify the `root` in `testing/vitest.config.ts` resolves to the repo root.

- [ ] **Step 2: Stage and commit**

```bash
git add config/ testing/ tsconfig.json package.json \
        scripts/features/BuildPackages/index.ts AGENTS.md \
        && git rm tsconfig.common.json tsconfig.node.json tsconfig.browser.json \
                  tsconfig.checkmode.json tsconfig.check.common.json \
                  tsconfig.check.node.json tsconfig.check.browser.json \
                  tsconfig.check.scripts.json vitest.config.ts
git commit -m "$(cat <<'EOF'
chore: move tsconfigs to config/ and vitest to testing/

Reduces root clutter from 10 loose config files to 2 directories.
tsconfig.json stays at root for IDE discovery; all other tsconfigs
move to config/ with paths re-relativized one level up.
vitest.config.ts moves to testing/ and uses an explicit root so
glob patterns remain unchanged.
EOF
)"
```

---

### Task 9: Update `AGENTS.md`

**Files:**
- Modify: `AGENTS.md`

Update the repository structure diagram and the TypeScript Config section to reflect the new file locations.

- [ ] **Step 1: Update the repository structure diagram in `AGENTS.md`**

Replace the old flat tsconfig listing in the `## Repository Structure` block with:

```
├── config/               # tooling configs
│   ├── tsconfig.common.json
│   ├── tsconfig.node.json
│   ├── tsconfig.browser.json
│   ├── tsconfig.checkmode.json
│   ├── tsconfig.check.common.json
│   ├── tsconfig.check.node.json
│   ├── tsconfig.check.browser.json
│   └── tsconfig.check.scripts.json
├── testing/              # test tooling
│   └── vitest.config.ts
```

And remove the nine individual tsconfig lines and `vitest.config.ts` line from the flat listing.

- [ ] **Step 2: Update all `tsconfig.json` code snippets in `AGENTS.md`**

Wherever the doc shows file contents of build or check tsconfigs, update paths to reflect the `../` prefix on `extends`, `rootDir`, `outDir`, `paths`, `include`, and `exclude`. Update the `tsconfig.json` references snippet to show `./config/tsconfig.*.json`.

- [ ] **Step 3: Update script examples in `AGENTS.md`**

In the `yarn typecheck` example, update to:
```sh
tsgo -p config/tsconfig.check.common.json && tsgo -p config/tsconfig.check.node.json && tsgo -p config/tsconfig.check.browser.json && tsgo -p config/tsconfig.check.scripts.json
```

In the `## Package package.json Shape` section, update the `typecheck` script string to match.

- [ ] **Step 4: Amend previous commit with AGENTS.md changes**

> **Note:** This is the one case where amending is correct — AGENTS.md belongs in the same logical commit as the restructure it documents.

```bash
git add AGENTS.md
git commit --amend --no-edit
```
