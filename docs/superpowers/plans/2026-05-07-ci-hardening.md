# CI Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 14 CI checks to a repo that currently has no GitHub Actions workflows.

**Architecture:** Four files change — `package.json` gets an `adio` script, `vitest.config.ts` gets coverage thresholds, and three new workflows cover quality gates (`ci.yml`), security (`audit.yml`), and PR title linting (`pr-title.yml`). The quality-gate workflow fans out as: static checks in parallel → build → test + pack in parallel. Pinning action SHAs is a dedicated clean-up task after the workflows are verified.

**Tech Stack:** GitHub Actions, oxfmt, oxlint, adio, tsgo, vitest v4, yarn 4 (`yarn npm audit`), `actions/dependency-review-action`, `amannn/action-semantic-pull-request`

---

## File Map

| File | Change |
|------|--------|
| `package.json` | Add `"check:imports": "adio"` to `scripts` |
| `vitest.config.ts` | Add `coverage.thresholds` block |
| `.github/workflows/ci.yml` | Create — checks 10, 7, 1, 2, 3, 4, 5+6, 13, 14 |
| `.github/workflows/audit.yml` | Create — checks 8, 9 |
| `.github/workflows/pr-title.yml` | Create — check 12 |

---

## Task 1: adio script + coverage threshold

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add `check:imports` to package.json scripts**

In `package.json`, add after the `"lint:fix"` line:

```json
"check:imports": "adio",
```

Final `scripts` block should contain:

```json
"scripts": {
  "clean": "rm -rf dist",
  "build": "node scripts/buildPackages.ts",
  "pack:packages": "node scripts/packPackages.ts",
  "publish:packages": "node scripts/publishPackages.ts",
  "test": "vitest run",
  "test:coverage": "vitest run --coverage",
  "format": "oxfmt",
  "format:fix": "oxfmt",
  "format:check": "oxfmt --check",
  "lint": "oxlint --deny-warnings",
  "lint:fix": "oxlint --fix",
  "check:imports": "adio",
  "typecheck": "tsgo -p tsconfig.check.common.json && tsgo -p tsconfig.check.node.json && tsgo -p tsconfig.check.browser.json && tsgo -p tsconfig.check.scripts.json"
}
```

- [ ] **Step 2: Add coverage thresholds to vitest.config.ts**

Replace the existing `coverage` block in `vitest.config.ts`:

```ts
coverage: {
    provider: "v8",
    include: ["src/**/*.ts"],
    exclude: ["**/__tests__/**", "**/index.ts", "**/abstractions/**"],
    thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90
    }
}
```

Note: current coverage is ~96% statements. The 90/80/90/90 floor gives ~6 points of headroom before CI breaks.

- [ ] **Step 3: Verify both changes work locally**

```sh
yarn check:imports
# Expected: ✅  All dependencies in order!

yarn test:coverage
# Expected: all tests pass + coverage report shows thresholds satisfied
```

- [ ] **Step 4: Commit**

```sh
git add package.json vitest.config.ts
git commit -m "$(cat <<'EOF'
chore(ci): add adio import check script and vitest coverage thresholds

adio already installed but had no npm script — adding check:imports so
CI and the pre-commit chain can call it uniformly.

Coverage thresholds set at 90/80/90/90; current coverage is ~96%,
giving ~6 points of headroom before CI breaks on regressions.
EOF
)"
```

---

## Task 2: Main CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

Job dependency graph:

```
lockfile ──────┐
dist-clean     │  (no dependents)
format ────────┤
lint ──────────┤→ build → test
imports ───────┤         → pack
typecheck ─────┘
```

`dist-clean` runs standalone (it's a pure git check — no install needed). All other early jobs run in parallel; `build` gates on all of them; `test` and `pack` gate on `build`.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  lockfile:
    name: Lockfile immutability
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: yarn
      - run: yarn install --immutable

  dist-clean:
    name: No committed dist
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify dist is not tracked in git
        run: |
          tracked=$(git ls-files dist/)
          if [ -n "$tracked" ]; then
            echo "ERROR: dist/ files are committed to git:"
            echo "$tracked"
            echo "Fix: git rm -r --cached dist/"
            exit 1
          fi
          echo "OK: dist/ is not tracked"

  format:
    name: Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: yarn
      - run: yarn install --immutable
      - run: yarn format:check

  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: yarn
      - run: yarn install --immutable
      - run: yarn lint

  imports:
    name: Import check (adio)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: yarn
      - run: yarn install --immutable
      - run: yarn check:imports

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: yarn
      - run: yarn install --immutable
      - run: yarn typecheck

  build:
    name: Build
    needs: [lockfile, format, lint, imports, typecheck]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: yarn
      - run: yarn install --immutable
      - run: yarn build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 1

  test:
    name: Test & Coverage
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: yarn
      - run: yarn install --immutable
      - run: yarn test:coverage

  pack:
    name: Pack dry-run
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: yarn
      - run: yarn install --immutable
      - run: yarn build
      - run: yarn pack:packages
```

- [ ] **Step 2: Validate the YAML is well-formed**

```sh
node -e "
const fs = require('fs');
const yaml = require('js-yaml');
try {
  yaml.load(fs.readFileSync('.github/workflows/ci.yml', 'utf8'));
  console.log('YAML valid');
} catch(e) { console.error(e.message); process.exit(1); }
" 2>/dev/null || python3 -c "
import yaml, sys
with open('.github/workflows/ci.yml') as f:
    yaml.safe_load(f)
print('YAML valid')
"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```sh
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
ci: add main quality-gate workflow

Runs lockfile immutability, adio import check, format, lint, typecheck
in parallel, then gates build on all passing, then runs test+coverage
and pack dry-run in parallel. Also checks that dist/ is not committed.
EOF
)"
```

---

## Task 3: Security / dependency audit workflow

**Files:**
- Create: `.github/workflows/audit.yml`

The dependency-review job uses `github.event_name == 'pull_request'` because the action requires a base ref to diff against — it cannot run on push.

- [ ] **Step 1: Create `.github/workflows/audit.yml`**

```yaml
name: Audit

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  audit:
    name: Dependency audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: yarn
      - run: yarn install --immutable
      - run: yarn npm audit

  dependency-review:
    name: Dependency review
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
```

- [ ] **Step 2: Verify YAML**

```sh
python3 -c "
import yaml
with open('.github/workflows/audit.yml') as f:
    yaml.safe_load(f)
print('YAML valid')
"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```sh
git add .github/workflows/audit.yml
git commit -m "$(cat <<'EOF'
ci: add dependency audit and dependency-review workflows

yarn npm audit flags CVEs in installed deps on every push/PR.
dependency-review-action blocks PRs that introduce newly vulnerable
packages (PR-only because it requires a base ref to diff against).
EOF
)"
```

---

## Task 4: PR title lint workflow

**Files:**
- Create: `.github/workflows/pr-title.yml`

Allowed types mirror the exact set that the publish script (`scripts/features/PublishPackages/`) recognises. Any type not in this list causes `process.exit(1)` at release time, so the same set must be enforced here: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`, `perf`, `build`, `ci`, `revert`.

- [ ] **Step 1: Create `.github/workflows/pr-title.yml`**

```yaml
name: PR Title

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

permissions:
  pull-requests: read

jobs:
  title-lint:
    name: Conventional commit title
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: |
            feat
            fix
            refactor
            test
            chore
            docs
            style
            perf
            build
            ci
            revert
          requireScope: false
```

- [ ] **Step 2: Verify YAML**

```sh
python3 -c "
import yaml
with open('.github/workflows/pr-title.yml') as f:
    yaml.safe_load(f)
print('YAML valid')
"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```sh
git add .github/workflows/pr-title.yml
git commit -m "$(cat <<'EOF'
ci: add PR title lint (conventional commits)

Enforces the same commit types that the publish script uses for
version bumping. An unknown type in a merged PR would cause
process.exit(1) at release time — this gates it at PR review instead.
EOF
)"
```

---

## Task 5: Pin all action SHAs

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/audit.yml`
- Modify: `.github/workflows/pr-title.yml`

Tag refs like `actions/checkout@v4` are mutable — a compromised tag can redirect to malicious code. SHA pins are immutable.

- [ ] **Step 1: Resolve SHAs for each action**

Run these `gh` commands to get the commit SHA for each tag:

```sh
# actions/checkout — latest v4 tag
gh api repos/actions/checkout/git/ref/refs/tags/v4 --jq '.object.sha'
# or: gh release view --repo actions/checkout v4.2.2 --json tagName

# actions/setup-node — latest v4 tag
gh api repos/actions/setup-node/git/ref/refs/tags/v4 --jq '.object.sha'

# actions/upload-artifact — latest v4 tag
gh api repos/actions/upload-artifact/git/ref/refs/tags/v4 --jq '.object.sha'

# actions/dependency-review-action — latest v4 tag
gh api repos/actions/dependency-review-action/git/ref/refs/tags/v4 --jq '.object.sha'

# amannn/action-semantic-pull-request — latest v5 tag
gh api repos/amannn/action-semantic-pull-request/git/ref/refs/tags/v5 --jq '.object.sha'
```

Note: the SHA returned may be a tag object SHA, not a commit SHA. If so, dereference:

```sh
gh api repos/actions/checkout/git/tags/<tag-object-sha> --jq '.object.sha'
```

- [ ] **Step 2: Replace tag refs with SHA@tag-comment form across all three workflow files**

Replace every `uses: <action>@<tag>` with `uses: <action>@<sha> # <tag>`.

Example substitution (use actual SHAs from Step 1):

```yaml
# Before
- uses: actions/checkout@v4

# After (SHA is illustrative — use the value from Step 1)
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4
```

Apply this to every `uses:` line in all three workflow files:
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/upload-artifact@v4`
- `actions/dependency-review-action@v4`
- `amannn/action-semantic-pull-request@v5`

- [ ] **Step 3: Verify all three files are still valid YAML**

```sh
python3 -c "
import yaml, glob
for f in glob.glob('.github/workflows/*.yml'):
    with open(f) as fh:
        yaml.safe_load(fh)
    print(f'OK: {f}')
"
```

Expected: three `OK:` lines, one per workflow file.

- [ ] **Step 4: Commit**

```sh
git add .github/workflows/
git commit -m "$(cat <<'EOF'
ci: pin all GitHub Actions to immutable SHAs

Mutable tag refs can be redirected to arbitrary commits if an action
repo is compromised. SHA pins make the supply chain tamper-evident.
EOF
)"
```

---

## Self-Review

**Spec coverage:**

| Check | Task |
|-------|------|
| 10 — lockfile immutability | Task 2 (`lockfile` job) |
| 7 — adio imports | Task 1 (script) + Task 2 (`imports` job) |
| 1 — format check | Task 2 (`format` job) |
| 2 — lint | Task 2 (`lint` job) |
| 3 — typecheck | Task 2 (`typecheck` job) |
| 4 — build | Task 2 (`build` job) |
| 5 — tests + coverage | Task 2 (`test` job) |
| 6 — coverage threshold | Task 1 (vitest thresholds) |
| 8 — yarn audit | Task 3 (`audit` job) |
| 9 — dependency review | Task 3 (`dependency-review` job) |
| 11 — pinned action SHAs | Task 5 |
| 12 — PR title lint | Task 4 |
| 13 — pack dry-run | Task 2 (`pack` job) |
| 14 — no committed dist | Task 2 (`dist-clean` job) |

All 14 checks covered. ✓
