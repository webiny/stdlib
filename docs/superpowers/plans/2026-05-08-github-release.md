# GitHub Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a GitHub release (with the new version's changelog entry as the body) as the final step of `node scripts/publishPackages.ts --publish`.

**Architecture:** `ChangelogWriter.write()` returns the formatted entry string it already builds internally. A new `GithubRelease` abstraction + Octokit implementation is added to the DI container. `PublishOrchestrator` captures the entry, calls `githubRelease.createRelease()` as its last step, and becomes `async`. Dry-run validates token + remote URL but skips the API call.

**Tech Stack:** `@octokit/rest`, Node 24 ESM, `@webiny/di`, existing scripts DI patterns

---

## Constraints (read before touching any file)

- **Scripts run under Node 24 strip-only mode.** No TypeScript parameter properties (`private readonly x` in constructor signature). Always declare fields explicitly above the constructor and assign in the constructor body.
- **Script imports use `.ts` extensions**, not `.js`. (`import { X } from "./Foo.ts"`)
- **`@octokit/rest` goes in `devDependencies`** — it's only used in scripts, never in the published package.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `package.json` | Modify | Add `@octokit/rest` devDep |
| `scripts/features/PublishPackages/abstractions/ChangelogWriter.ts` | Modify | `write()` return type `void` → `string` |
| `scripts/features/PublishPackages/ChangelogWriter.ts` | Modify | Return the formatted entry from `write()` |
| `scripts/features/PublishPackages/abstractions/GitRepository.ts` | Modify | Add `getRemoteUrl(name: string): string` |
| `scripts/features/PublishPackages/GitRepository.ts` | Modify | Implement `getRemoteUrl` via `git remote get-url` |
| `scripts/features/PublishPackages/abstractions/GithubRelease.ts` | Create | `IGithubRelease` with `createRelease()` |
| `scripts/features/PublishPackages/abstractions/index.ts` | Modify | Re-export `GithubRelease` |
| `scripts/features/PublishPackages/GithubRelease.ts` | Create | Octokit implementation |
| `scripts/features/PublishPackages/abstractions/PublishOrchestrator.ts` | Modify | `run(): void` → `run(): Promise<void>` |
| `scripts/features/PublishPackages/PublishOrchestrator.ts` | Modify | Add `GithubRelease` dep, capture entry, call `createRelease`, make async |
| `scripts/features/PublishPackages/index.ts` | Modify | Register `GithubReleaseImpl`, `await run()` |
| `scripts/publishPackages.ts` | Modify | Top-level `await publish(root)` |

---

## Task 1: Install @octokit/rest

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the devDependency**

```sh
yarn add --dev @octokit/rest
```

- [ ] **Step 2: Verify it installed**

```sh
node -e "import('@octokit/rest').then(m => console.log('ok:', typeof m.Octokit))"
```

Expected: `ok: function`

- [ ] **Step 3: Commit**

```sh
git add package.json yarn.lock
git commit -m "chore(scripts): add @octokit/rest devDependency"
```

---

## Task 2: ChangelogWriter returns the entry string

**Files:**
- Modify: `scripts/features/PublishPackages/abstractions/ChangelogWriter.ts`
- Modify: `scripts/features/PublishPackages/ChangelogWriter.ts`

- [ ] **Step 1: Update the abstraction**

Full contents of `scripts/features/PublishPackages/abstractions/ChangelogWriter.ts`:

```ts
import { Abstraction } from "@webiny/di";

export interface IChangelogWriter {
    /**
     * Prepends a new release entry to CHANGELOG.md at the repo root.
     * Returns the formatted entry string (same text that was prepended).
     */
    write(version: string, commits: string[]): string;
}

export const ChangelogWriter = new Abstraction<IChangelogWriter>("Scripts/ChangelogWriter");

export namespace ChangelogWriter {
    export type Interface = IChangelogWriter;
}
```

- [ ] **Step 2: Update the implementation**

In `scripts/features/PublishPackages/ChangelogWriter.ts`, change only the `write` method body:

```ts
public write(version: string, commits: string[]): string {
    const sections = this.groupBySection(commits);
    const entry = this.formatEntry(version, sections);
    this.prepend(entry);
    return entry;
}
```

- [ ] **Step 3: Typecheck**

```sh
yarn typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```sh
git add scripts/features/PublishPackages/abstractions/ChangelogWriter.ts \
        scripts/features/PublishPackages/ChangelogWriter.ts
git commit -m "refactor(scripts): ChangelogWriter.write() returns the formatted entry"
```

---

## Task 3: GitRepository.getRemoteUrl()

**Files:**
- Modify: `scripts/features/PublishPackages/abstractions/GitRepository.ts`
- Modify: `scripts/features/PublishPackages/GitRepository.ts`

- [ ] **Step 1: Update the abstraction**

Full contents of `scripts/features/PublishPackages/abstractions/GitRepository.ts`:

```ts
import { Abstraction } from "@webiny/di";

export interface IGitRepository {
    /** Returns true if the given tag exists in the repository. */
    tagExists(tag: string): boolean;
    /** Returns commit subjects since the given ref, or all commits if ref is null. */
    commitsSince(ref: string | null): string[];
    /** Creates a lightweight tag at HEAD. */
    createTag(tag: string): void;
    /** Returns the fetch URL of the named remote. Throws if the remote does not exist. */
    getRemoteUrl(name: string): string;
}

export const GitRepository = new Abstraction<IGitRepository>("Scripts/GitRepository");

export namespace GitRepository {
    export type Interface = IGitRepository;
}
```

- [ ] **Step 2: Add getRemoteUrl to GitRepositoryImpl**

Full contents of `scripts/features/PublishPackages/GitRepository.ts`:

```ts
import { execFileSync } from "node:child_process";
import { GitRepository as GitRepositoryAbstraction } from "./abstractions/GitRepository.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";

class GitRepositoryImpl implements GitRepositoryAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;

    public constructor(config: ProjectConfig.Interface) {
        this.config = config;
    }

    public tagExists(tag: string): boolean {
        try {
            execFileSync("git", ["rev-parse", "--verify", tag], {
                cwd: this.config.rootDir,
                stdio: "pipe"
            });
            return true;
        } catch {
            return false;
        }
    }

    public commitsSince(ref: string | null): string[] {
        const args = ref ? ["log", `${ref}..HEAD`, "--format=%s"] : ["log", "--format=%s"];
        return execFileSync("git", args, { cwd: this.config.rootDir, encoding: "utf8" })
            .trim()
            .split("\n")
            .filter(Boolean);
    }

    public createTag(tag: string): void {
        execFileSync("git", ["tag", tag], { cwd: this.config.rootDir });
    }

    public getRemoteUrl(name: string): string {
        return execFileSync("git", ["remote", "get-url", name], {
            cwd: this.config.rootDir,
            encoding: "utf8"
        }).trim();
    }
}

export const GitRepository = GitRepositoryAbstraction.createImplementation({
    implementation: GitRepositoryImpl,
    dependencies: [ProjectConfig]
});
```

- [ ] **Step 3: Typecheck**

```sh
yarn typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```sh
git add scripts/features/PublishPackages/abstractions/GitRepository.ts \
        scripts/features/PublishPackages/GitRepository.ts
git commit -m "feat(scripts): add GitRepository.getRemoteUrl()"
```

---

## Task 4: GithubRelease abstraction

**Files:**
- Create: `scripts/features/PublishPackages/abstractions/GithubRelease.ts`
- Modify: `scripts/features/PublishPackages/abstractions/index.ts`

- [ ] **Step 1: Create the abstraction**

`scripts/features/PublishPackages/abstractions/GithubRelease.ts`:

```ts
import { Abstraction } from "@webiny/di";

export interface IGithubRelease {
    /**
     * Creates a GitHub release for the given tag.
     * In dry-run mode, validates config (token + remote URL) but skips the API call.
     */
    createRelease(tag: string, title: string, body: string): Promise<void>;
}

export const GithubRelease = new Abstraction<IGithubRelease>("Scripts/GithubRelease");

export namespace GithubRelease {
    export type Interface = IGithubRelease;
}
```

- [ ] **Step 2: Re-export from abstractions/index.ts**

Full contents of `scripts/features/PublishPackages/abstractions/index.ts`:

```ts
export { ProjectConfig } from "./ProjectConfig.ts";
export { NpmRegistry } from "./NpmRegistry.ts";
export { GitRepository } from "./GitRepository.ts";
export { VersionStrategy } from "./VersionStrategy.ts";
export type { VersionResult } from "./VersionStrategy.ts";
export { ChangelogWriter } from "./ChangelogWriter.ts";
export { PublishOrchestrator } from "./PublishOrchestrator.ts";
export { GithubRelease } from "./GithubRelease.ts";
```

- [ ] **Step 3: Typecheck**

```sh
yarn typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```sh
git add scripts/features/PublishPackages/abstractions/GithubRelease.ts \
        scripts/features/PublishPackages/abstractions/index.ts
git commit -m "feat(scripts): add GithubRelease abstraction"
```

---

## Task 5: GithubRelease Octokit implementation

**Files:**
- Create: `scripts/features/PublishPackages/GithubRelease.ts`

- [ ] **Step 1: Create the implementation**

`scripts/features/PublishPackages/GithubRelease.ts`:

```ts
import { Octokit } from "@octokit/rest";
import { GithubRelease as GithubReleaseAbstraction } from "./abstractions/GithubRelease.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { GitRepository } from "./abstractions/GitRepository.ts";

const HTTPS_RE = /https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/;
const SSH_RE = /git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/;

function parseGithubRepo(url: string): { owner: string; repo: string } {
    const https = HTTPS_RE.exec(url);
    if (https) {
        return { owner: https[1]!, repo: https[2]! };
    }
    const ssh = SSH_RE.exec(url);
    if (ssh) {
        return { owner: ssh[1]!, repo: ssh[2]! };
    }
    throw new Error(`Cannot parse GitHub owner/repo from remote URL: ${url}`);
}

class GithubReleaseImpl implements GithubReleaseAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;
    private readonly git: GitRepository.Interface;

    public constructor(config: ProjectConfig.Interface, git: GitRepository.Interface) {
        this.config = config;
        this.git = git;
    }

    public async createRelease(tag: string, title: string, body: string): Promise<void> {
        const url = this.git.getRemoteUrl("origin");
        const { owner, repo } = parseGithubRepo(url);

        const token = process.env["GITHUB_TOKEN"];
        if (!token) {
            throw new Error("GITHUB_TOKEN env var is required to create a GitHub release");
        }

        if (this.config.dryRun) {
            console.log(`[dry run] would create GitHub release ${tag} for ${owner}/${repo}`);
            return;
        }

        const octokit = new Octokit({ auth: token });
        await octokit.rest.repos.createRelease({
            owner,
            repo,
            tag_name: tag,
            name: title,
            body
        });
        console.log(`Created GitHub release ${tag}`);
    }
}

export const GithubRelease = GithubReleaseAbstraction.createImplementation({
    implementation: GithubReleaseImpl,
    dependencies: [ProjectConfig, GitRepository]
});
```

- [ ] **Step 2: Typecheck**

```sh
yarn typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```sh
git add scripts/features/PublishPackages/GithubRelease.ts
git commit -m "feat(scripts): add GithubRelease Octokit implementation"
```

---

## Task 6: Wire into PublishOrchestrator and entry points

**Files:**
- Modify: `scripts/features/PublishPackages/abstractions/PublishOrchestrator.ts`
- Modify: `scripts/features/PublishPackages/PublishOrchestrator.ts`
- Modify: `scripts/features/PublishPackages/index.ts`
- Modify: `scripts/publishPackages.ts`

- [ ] **Step 1: Make run() async in the abstraction**

Full contents of `scripts/features/PublishPackages/abstractions/PublishOrchestrator.ts`:

```ts
import { Abstraction } from "@webiny/di";

export interface IPublishOrchestrator {
    run(): Promise<void>;
}

export const PublishOrchestrator = new Abstraction<IPublishOrchestrator>(
    "Scripts/PublishOrchestrator"
);

export namespace PublishOrchestrator {
    export type Interface = IPublishOrchestrator;
}
```

- [ ] **Step 2: Update PublishOrchestrator.ts**

Full contents of `scripts/features/PublishPackages/PublishOrchestrator.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface DistPackageJson {
    version: string;
    dependencies?: Record<string, string>;
    [key: string]: unknown;
}

import { PublishOrchestrator as PublishOrchestratorAbstraction } from "./abstractions/PublishOrchestrator.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { NpmRegistry } from "./abstractions/NpmRegistry.ts";
import { GitRepository } from "./abstractions/GitRepository.ts";
import { VersionStrategy } from "./abstractions/VersionStrategy.ts";
import { ChangelogWriter } from "./abstractions/ChangelogWriter.ts";
import { GithubRelease } from "./abstractions/GithubRelease.ts";

class PublishOrchestratorImpl implements PublishOrchestratorAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;
    private readonly npm: NpmRegistry.Interface;
    private readonly git: GitRepository.Interface;
    private readonly versionStrategy: VersionStrategy.Interface;
    private readonly changelogWriter: ChangelogWriter.Interface;
    private readonly githubRelease: GithubRelease.Interface;

    public constructor(
        config: ProjectConfig.Interface,
        npm: NpmRegistry.Interface,
        git: GitRepository.Interface,
        versionStrategy: VersionStrategy.Interface,
        changelogWriter: ChangelogWriter.Interface,
        githubRelease: GithubRelease.Interface
    ) {
        this.config = config;
        this.npm = npm;
        this.git = git;
        this.versionStrategy = versionStrategy;
        this.changelogWriter = changelogWriter;
        this.githubRelease = githubRelease;
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
    dependencies: [ProjectConfig, NpmRegistry, GitRepository, VersionStrategy, ChangelogWriter, GithubRelease]
});
```

- [ ] **Step 3: Update index.ts**

Full contents of `scripts/features/PublishPackages/index.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Container } from "@webiny/di";
import { ProjectConfig, PublishOrchestrator } from "./abstractions/index.ts";
import { NpmRegistry as NpmRegistryImpl } from "./NpmRegistry.ts";
import { GitRepository as GitRepositoryImpl } from "./GitRepository.ts";
import { VersionStrategy as VersionStrategyImpl } from "./VersionStrategy.ts";
import { ChangelogWriter as ChangelogWriterImpl } from "./ChangelogWriter.ts";
import { PublishOrchestrator as PublishOrchestratorImpl } from "./PublishOrchestrator.ts";
import { GithubRelease as GithubReleaseImpl } from "./GithubRelease.ts";

export async function run(rootDir: string): Promise<void> {
    const dryRun = !process.argv.includes("--publish");
    if (dryRun) {
        console.log("Dry run — pass --publish to actually publish.");
    }

    const pkgJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")) as {
        name: string;
    };
    const container = new Container();
    container.registerInstance(ProjectConfig, { rootDir, packageName: pkgJson.name, dryRun });
    container.register(NpmRegistryImpl).inSingletonScope();
    container.register(GitRepositoryImpl).inSingletonScope();
    container.register(VersionStrategyImpl).inSingletonScope();
    container.register(ChangelogWriterImpl).inSingletonScope();
    container.register(GithubReleaseImpl).inSingletonScope();
    container.register(PublishOrchestratorImpl).inSingletonScope();
    await container.resolve(PublishOrchestrator).run();
}
```

- [ ] **Step 4: Update scripts/publishPackages.ts**

Full contents of `scripts/publishPackages.ts`:

```ts
import { fileURLToPath } from "node:url";
import { run as build } from "./features/BuildPackages/index.ts";
import { run as publish } from "./features/PublishPackages/index.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
build(root);
await publish(root);
```

- [ ] **Step 5: Typecheck**

```sh
yarn typecheck
```

Expected: no errors.

- [ ] **Step 6: Dry-run end-to-end test**

```sh
GITHUB_TOKEN=test-token node scripts/publishPackages.ts
```

Expected output ends with:

```
[dry run] would create GitHub release v<version> for webiny/webiny-node-tools
```

(If there are no new commits since the last tag, you'll see `No new commits since last release` instead — that's correct behavior. The token/URL checks only run when there are commits to release.)

- [ ] **Step 7: Run full pre-commit chain**

```sh
yarn format:fix && yarn lint:fix && yarn typecheck && yarn build && yarn test:coverage
```

Expected: all pass.

- [ ] **Step 8: Commit**

```sh
git add scripts/features/PublishPackages/abstractions/PublishOrchestrator.ts \
        scripts/features/PublishPackages/PublishOrchestrator.ts \
        scripts/features/PublishPackages/index.ts \
        scripts/publishPackages.ts
git commit -m "feat(scripts): create GitHub release as final publish step

PublishOrchestrator.run() is now async. createRelease() is the last
action after npm publish + git tag. Dry-run validates token and remote
URL but skips the API call."
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|-------------|------|
| `@octokit/rest` as devDep | Task 1 |
| `ChangelogWriter.write()` returns string | Task 2 |
| `GitRepository.getRemoteUrl()` | Task 3 |
| `GithubRelease` abstraction | Task 4 |
| `GithubRelease` Octokit implementation | Task 5 |
| Parse HTTPS + SSH remote URL | Task 5 |
| Throw on unparseable URL | Task 5 |
| Read `GITHUB_TOKEN`, throw if absent | Task 5 |
| Dry-run validates config, skips API call | Task 5 + Task 6 |
| `PublishOrchestrator` captures entry, calls `createRelease` | Task 6 |
| `run()` becomes async throughout | Task 6 |
| `@octokit/rest` registered in container | Task 6 |

All spec requirements covered. ✓
