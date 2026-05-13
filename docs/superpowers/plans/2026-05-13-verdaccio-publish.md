# Verdaccio Publish Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `scripts/publishToVerdaccio.ts` script that builds the package and publishes it to a local Verdaccio registry at `http://localhost:4873` with a caller-specified version string.

**Architecture:** A standalone procedural script that reuses the existing `BuildPackages` feature for the build step, then injects the version into `dist/package.json` and calls `npm publish --registry http://localhost:4873`. No DI, no classes — pure script glue.

**Tech Stack:** Node 24 (strip-only TypeScript), `node:fs`, `node:path`, `node:child_process`, existing `BuildPackages` feature, `bin()` helper.

---

## File Map

| Action | Path |
|--------|------|
| Create | `scripts/publishToVerdaccio.ts` |
| Modify | `package.json` — add `publish:verdaccio` script entry |

---

### Task 1: Write `scripts/publishToVerdaccio.ts`

**Files:**
- Create: `scripts/publishToVerdaccio.ts`

- [ ] **Step 1: Create the file with the following content**

```typescript
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run as build } from "./features/BuildPackages/index.ts";
import { bin } from "./bin.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

const versionIndex = process.argv.indexOf("--version");
if (versionIndex === -1 || !process.argv[versionIndex + 1]) {
    console.error(
        "Error: --version <x> is required.\n" +
            "Example: yarn publish:verdaccio --version 1.0.0-beta.abcdefg"
    );
    process.exit(1);
}
const version = process.argv[versionIndex + 1]!;

build(root);

const distPkgPath = join(root, "dist", "package.json");
const pkg = JSON.parse(readFileSync(distPkgPath, "utf8")) as Record<string, unknown>;
pkg["version"] = version;
writeFileSync(distPkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`Publishing ${String(pkg["name"])}@${version} to http://localhost:4873 ...`);

execFileSync(bin("npm"), ["publish", "--registry", "http://localhost:4873"], {
    cwd: join(root, "dist"),
    stdio: "inherit"
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `yarn tsgo -p config/tsconfig.check.scripts.json`
Expected: no errors, no warnings.

---

### Task 2: Add `publish:verdaccio` to `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the script entry**

In the `"scripts"` block of `package.json`, add after `"publish:packages"`:

```json
"publish:verdaccio": "node scripts/publishToVerdaccio.ts",
```

The scripts block should look like:

```json
"pack:packages": "node scripts/packPackages.ts",
"publish:packages": "node scripts/publishPackages.ts",
"publish:verdaccio": "node scripts/publishToVerdaccio.ts",
```

---

### Task 3: Run pre-commit chain and commit

**Files:** all changed files

- [ ] **Step 1: Run the full pre-commit chain**

```sh
yarn && yarn adio && yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

All steps must exit with zero errors and zero warnings before continuing.

- [ ] **Step 2: Commit**

```sh
git add scripts/publishToVerdaccio.ts package.json
git commit -m "feat(verdaccio): add publishToVerdaccio script

Builds the package then publishes to a local Verdaccio registry at
http://localhost:4873 with a caller-specified version string. Intended
for manual release-candidate testing before publishing to npm.

Usage:
  yarn verdaccio:start          # in a separate terminal
  yarn publish:verdaccio --version 1.0.0-beta.abcdefg"
```

---

## Manual End-to-End Verification

After the commit, verify the full flow:

1. In one terminal: `yarn verdaccio:start` — wait for `http address: http://localhost:4873/`
2. In another terminal: `yarn publish:verdaccio --version 1.0.0-beta.test`
3. Confirm the output shows the build completing, then `npm publish` succeeding
4. Optionally verify in the Verdaccio web UI at `http://localhost:4873` that `@webiny/stdlib@1.0.0-beta.test` appears
