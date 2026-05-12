# DependencyLocker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `DependencyLocker` abstraction/implementation that strips all version range operators from `dependencies` and `devDependencies` in `dist/package.json` before publishing, activated via `--exact-dependency-versions`.

**Architecture:** A new `DependencyLocker` DI abstraction reads `ProjectConfig.exactDependencyVersions`; when `true`, it strips all leading range operators (`^`, `~`, `>=`, `>`, `<=`, `<`) from `dependencies` and `devDependencies`, leaving `peerDependencies` untouched. `PublishOrchestrator` injects it unconditionally and calls `lock()` after the `0.0.0 → newVersion` replacement — the locker decides whether to act. `ProjectConfig` gains `exactDependencyVersions: boolean`.

**Tech Stack:** Node 24 (strip-only TypeScript), `@webiny/di`, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `scripts/features/PublishPackages/abstractions/ProjectConfig.ts` | Add `exactDependencyVersions: boolean` |
| Create | `scripts/features/PublishPackages/abstractions/DependencyLocker.ts` | Abstraction token + interface |
| Modify | `scripts/features/PublishPackages/abstractions/index.ts` | Export `DependencyLocker` |
| Create | `scripts/features/PublishPackages/DependencyLocker.ts` | Implementation |
| Modify | `scripts/features/PublishPackages/PublishOrchestrator.ts` | Inject + call locker; add `devDependencies` to `DistPackageJson` |
| Modify | `scripts/features/PublishPackages/index.ts` | Parse flag, register impl, pass to config |
| Create | `__tests__/scripts/PublishPackages/DependencyLocker.test.ts` | Tests |

---

### Task 1: Add `exactDependencyVersions` to `ProjectConfig` and create the `DependencyLocker` abstraction

**Files:**
- Modify: `scripts/features/PublishPackages/abstractions/ProjectConfig.ts`
- Create: `scripts/features/PublishPackages/abstractions/DependencyLocker.ts`
- Modify: `scripts/features/PublishPackages/abstractions/index.ts`

- [ ] **Step 1: Update `ProjectConfig` interface**

Replace `scripts/features/PublishPackages/abstractions/ProjectConfig.ts` with:

```ts
import { Abstraction } from "@webiny/di";

export interface IProjectConfig {
    rootDir: string;
    packageName: string;
    /** When true, compute and log the release plan but skip all side effects (npm publish, git tag, CHANGELOG.md). */
    dryRun: boolean;
    /** When true, strip all version range operators from dependencies and devDependencies before publishing. */
    exactDependencyVersions: boolean;
}

export const ProjectConfig = new Abstraction<IProjectConfig>("Scripts/ProjectConfig");

export namespace ProjectConfig {
    export type Interface = IProjectConfig;
}
```

- [ ] **Step 2: Create `DependencyLocker` abstraction**

Create `scripts/features/PublishPackages/abstractions/DependencyLocker.ts`:

```ts
import { Abstraction } from "@webiny/di";

export interface IDependencyLocker {
    /**
     * Strips all version range operators (^, ~, >=, >, <=, <) from
     * dependencies and devDependencies. peerDependencies are left untouched.
     * Mutates the object in place. No-op when exactDependencyVersions is false.
     */
    lock(pkgJson: {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    }): void;
}

export const DependencyLocker = new Abstraction<IDependencyLocker>("Scripts/DependencyLocker");

export namespace DependencyLocker {
    export type Interface = IDependencyLocker;
}
```

- [ ] **Step 3: Export `DependencyLocker` from the abstractions barrel**

Add to `scripts/features/PublishPackages/abstractions/index.ts`:

```ts
export { DependencyLocker } from "./DependencyLocker.ts";
```

---

### Task 2: Write failing tests for `DependencyLocker`

**Files:**
- Create: `__tests__/scripts/PublishPackages/DependencyLocker.test.ts`

- [ ] **Step 1: Write the test file**

Create `__tests__/scripts/PublishPackages/DependencyLocker.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { Container } from "@webiny/di";
import { ProjectConfig } from "../../../scripts/features/PublishPackages/abstractions/ProjectConfig.ts";
import { DependencyLocker } from "../../../scripts/features/PublishPackages/abstractions/DependencyLocker.ts";
import { DependencyLocker as DependencyLockerImpl } from "../../../scripts/features/PublishPackages/DependencyLocker.ts";

function makeLocker(exactDependencyVersions: boolean): DependencyLocker.Interface {
    const container = new Container();
    container.registerInstance(ProjectConfig, {
        rootDir: "/tmp",
        packageName: "@test/pkg",
        dryRun: false,
        exactDependencyVersions
    });
    container.register(DependencyLockerImpl).inSingletonScope();
    return container.resolve(DependencyLocker);
}

describe("DependencyLocker", () => {
    describe("when exactDependencyVersions is false", () => {
        it("does not modify dependencies", () => {
            const locker = makeLocker(false);
            const pkgJson = { dependencies: { foo: "^1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "^1.2.3" });
        });
    });

    describe("when exactDependencyVersions is true", () => {
        it("strips ^ from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "^1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips ~ from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "~1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips >= from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: ">=1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips > from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: ">1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips <= from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "<=1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips < from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "<1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips range operators from devDependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { devDependencies: { bar: "^2.0.0" } };
            locker.lock(pkgJson);
            expect(pkgJson.devDependencies).toEqual({ bar: "2.0.0" });
        });

        it("does not modify peerDependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = {
                dependencies: { foo: "^1.0.0" },
                peerDependencies: { baz: "^3.0.0" }
            };
            locker.lock(pkgJson);
            expect(pkgJson.peerDependencies).toEqual({ baz: "^3.0.0" });
        });

        it("leaves exact versions unchanged", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("handles missing dependency fields gracefully", () => {
            const locker = makeLocker(true);
            expect(() => locker.lock({})).not.toThrow();
        });
    });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```sh
yarn test --reporter=verbose __tests__/scripts/PublishPackages/DependencyLocker.test.ts
```

Expected: fail — `DependencyLocker.ts` does not exist yet.

---

### Task 3: Implement `DependencyLocker`

**Files:**
- Create: `scripts/features/PublishPackages/DependencyLocker.ts`

- [ ] **Step 1: Create the implementation**

Create `scripts/features/PublishPackages/DependencyLocker.ts`:

```ts
import { DependencyLocker as DependencyLockerAbstraction } from "./abstractions/DependencyLocker.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";

class DependencyLockerImpl implements DependencyLockerAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;

    public constructor(config: ProjectConfig.Interface) {
        this.config = config;
    }

    public lock(pkgJson: {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    }): void {
        if (!this.config.exactDependencyVersions) {
            return;
        }
        if (pkgJson.dependencies !== undefined) {
            pkgJson.dependencies = this.stripRangeOperators(pkgJson.dependencies);
        }
        if (pkgJson.devDependencies !== undefined) {
            pkgJson.devDependencies = this.stripRangeOperators(pkgJson.devDependencies);
        }
    }

    private stripRangeOperators(deps: Record<string, string>): Record<string, string> {
        const result: Record<string, string> = {};
        for (const [name, version] of Object.entries(deps)) {
            result[name] = version.replace(/^[\^~><=]+/, "");
        }
        return result;
    }
}

export const DependencyLocker = DependencyLockerAbstraction.createImplementation({
    implementation: DependencyLockerImpl,
    dependencies: [ProjectConfig]
});
```

- [ ] **Step 2: Run the tests and confirm they pass**

```sh
yarn test --reporter=verbose __tests__/scripts/PublishPackages/DependencyLocker.test.ts
```

Expected: all 10 tests pass.

---

### Task 4: Wire `DependencyLocker` into `PublishOrchestrator`

**Files:**
- Modify: `scripts/features/PublishPackages/PublishOrchestrator.ts`

- [ ] **Step 1: Update `PublishOrchestrator.ts`**

Replace the entire file with:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PublishOrchestrator as PublishOrchestratorAbstraction } from "./abstractions/PublishOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { NpmRegistry } from "./abstractions/NpmRegistry.ts";
import { GitRepository } from "./abstractions/GitRepository.ts";
import { VersionStrategy } from "./abstractions/VersionStrategy.ts";
import { ChangelogWriter } from "./abstractions/ChangelogWriter.ts";
import { GithubRelease } from "./abstractions/GithubRelease.ts";
import { DependencyLocker } from "./abstractions/DependencyLocker.ts";

interface DistPackageJson {
    version: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [key: string]: unknown;
}

class PublishOrchestratorImpl implements PublishOrchestratorAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;
    private readonly npm: NpmRegistry.Interface;
    private readonly git: GitRepository.Interface;
    private readonly versionStrategy: VersionStrategy.Interface;
    private readonly changelogWriter: ChangelogWriter.Interface;
    private readonly githubRelease: GithubRelease.Interface;
    private readonly dependencyLocker: DependencyLocker.Interface;

    public constructor(
        config: ProjectConfig.Interface,
        npm: NpmRegistry.Interface,
        git: GitRepository.Interface,
        versionStrategy: VersionStrategy.Interface,
        changelogWriter: ChangelogWriter.Interface,
        githubRelease: GithubRelease.Interface,
        dependencyLocker: DependencyLocker.Interface
    ) {
        this.config = config;
        this.npm = npm;
        this.git = git;
        this.versionStrategy = versionStrategy;
        this.changelogWriter = changelogWriter;
        this.githubRelease = githubRelease;
        this.dependencyLocker = dependencyLocker;
    }

    public async run(): Promise<void> {
        const { rootDir, packageName } = this.config;

        const published = this.npm.getLatestVersion(packageName) ?? "0.0.0";
        console.log(`Latest published: ${published}`);

        const releaseTag = `v${published}`;
        const since = this.git.tagExists(releaseTag) ? releaseTag : null;
        const commits = this.git.commitsSince(since);

        if (commits.length === 0) {
            console.log("No new commits since last release. Nothing to publish.");
            return;
        }

        const result = this.versionStrategy.computeVersion(published, commits);
        if ("error" in result) {
            console.error(`Publish aborted: ${result.error}`);
            process.exit(1);
        }

        const { newVersion, bumpType } = result;
        console.log(`${bumpType} bump: ${published} → ${newVersion}`);
        console.log("Commits:");
        for (const commit of commits) {
            console.log(`  ${commit}`);
        }

        if (this.config.dryRun) {
            console.log("[dry run] would update CHANGELOG.md");
            console.log(`[dry run] would publish ${packageName}@${newVersion}`);
            console.log(`[dry run] would tag v${newVersion}`);
            await this.githubRelease.createRelease(`v${newVersion}`, `v${newVersion}`, "");
            return;
        }

        const entry = this.changelogWriter.write(newVersion, commits);
        console.log("Updated CHANGELOG.md");

        const distDir = join(rootDir, "dist");
        const pkgJsonPath = join(distDir, "package.json");
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as DistPackageJson;
        pkgJson.version = newVersion;
        if (pkgJson.dependencies !== undefined) {
            for (const dep of Object.keys(pkgJson.dependencies)) {
                if (pkgJson.dependencies[dep] === "0.0.0") {
                    pkgJson.dependencies[dep] = newVersion;
                }
            }
        }
        this.dependencyLocker.lock(pkgJson);
        writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");

        console.log(`Publishing ${packageName}@${newVersion}...`);
        this.npm.publish(distDir);

        this.git.createTag(`v${newVersion}`);
        console.log(`Tagged v${newVersion}`);

        await this.githubRelease.createRelease(`v${newVersion}`, `v${newVersion}`, entry);
    }
}

export const PublishOrchestrator = PublishOrchestratorAbstraction.createImplementation({
    implementation: PublishOrchestratorImpl,
    dependencies: [
        ProjectConfig,
        NpmRegistry,
        GitRepository,
        VersionStrategy,
        ChangelogWriter,
        GithubRelease,
        DependencyLocker
    ]
});
```

---

### Task 5: Wire `DependencyLocker` into `index.ts`

**Files:**
- Modify: `scripts/features/PublishPackages/index.ts`

- [ ] **Step 1: Update `index.ts`**

Replace the entire file with:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Container } from "@webiny/di";
import { ProjectConfig, PublishOrchestrator } from "./abstractions/index.ts";
import { NpmRegistry as NpmRegistryImpl } from "./NpmRegistry.ts";
import { GitRepository as GitRepositoryImpl } from "./GitRepository.ts";
import { VersionStrategy as VersionStrategyImpl } from "./VersionStrategy.ts";
import { ChangelogWriter as ChangelogWriterImpl } from "./ChangelogWriter.ts";
import { GithubToken as GithubTokenImpl } from "./GithubToken.ts";
import { GithubRelease as GithubReleaseImpl } from "./GithubRelease.ts";
import { PublishOrchestrator as PublishOrchestratorImpl } from "./PublishOrchestrator.ts";
import { DependencyLocker as DependencyLockerImpl } from "./DependencyLocker.ts";

export async function run(rootDir: string): Promise<void> {
    const dryRun = !process.argv.includes("--publish");
    const exactDependencyVersions = process.argv.includes("--exact-dependency-versions");
    if (dryRun) {
        console.log("Dry run — pass --publish to actually publish.");
    }

    const pkgJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")) as {
        name: string;
    };
    const container = new Container();
    container.registerInstance(ProjectConfig, {
        rootDir,
        packageName: pkgJson.name,
        dryRun,
        exactDependencyVersions
    });
    container.register(NpmRegistryImpl).inSingletonScope();
    container.register(GitRepositoryImpl).inSingletonScope();
    container.register(VersionStrategyImpl).inSingletonScope();
    container.register(ChangelogWriterImpl).inSingletonScope();
    container.register(GithubTokenImpl).inSingletonScope();
    container.register(GithubReleaseImpl).inSingletonScope();
    container.register(DependencyLockerImpl).inSingletonScope();
    container.register(PublishOrchestratorImpl).inSingletonScope();
    await container.resolve(PublishOrchestrator).run();
}
```

---

### Task 6: Run pre-commit chain and commit

- [ ] **Step 1: Run the full pre-commit chain**

```sh
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Expected: all steps pass with zero errors and zero warnings.

- [ ] **Step 2: Commit**

```sh
git add \
  scripts/features/PublishPackages/abstractions/ProjectConfig.ts \
  scripts/features/PublishPackages/abstractions/DependencyLocker.ts \
  scripts/features/PublishPackages/abstractions/index.ts \
  scripts/features/PublishPackages/DependencyLocker.ts \
  scripts/features/PublishPackages/PublishOrchestrator.ts \
  scripts/features/PublishPackages/index.ts \
  __tests__/scripts/PublishPackages/DependencyLocker.test.ts \
  docs/superpowers/plans/2026-05-12-dependency-locker.md

git commit -m "feat(scripts): add DependencyLocker to strip range operators before publish

Activated via --exact-dependency-versions. Strips ^, ~, >=, >, <=, <
from dependencies and devDependencies in dist/package.json before npm
publish. peerDependencies are intentionally left untouched."
```
