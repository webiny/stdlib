# GitHub Release Design

## Goal

Create a GitHub release (with the new version's changelog entry as the body) as the final step of `node scripts/publishPackages.ts --publish`. Dry-run mode validates configuration (token, remote URL) but skips the API call.

## Architecture

### Modified files

| File | Change |
|------|--------|
| `scripts/features/PublishPackages/abstractions/ChangelogWriter.ts` | `write()` return type `void` → `string` |
| `scripts/features/PublishPackages/ChangelogWriter.ts` | Return the formatted entry from `write()` |
| `scripts/features/PublishPackages/abstractions/GitRepository.ts` | Add `getRemoteUrl(name: string): string` |
| `scripts/features/PublishPackages/GitRepository.ts` | Implement via `git remote get-url <name>` |
| `scripts/features/PublishPackages/abstractions/index.ts` | Re-export `GithubRelease` |
| `scripts/features/PublishPackages/PublishOrchestrator.ts` | Capture entry from `changelogWriter.write()`, pass to `githubRelease.createRelease()`; add `GithubRelease` as 6th constructor dependency; `run()` becomes `async` |
| `scripts/features/PublishPackages/index.ts` | Register `GithubReleaseImpl`; `await` the `run()` call |

### New files

| File | Responsibility |
|------|---------------|
| `scripts/features/PublishPackages/abstractions/GithubRelease.ts` | `IGithubRelease` with `createRelease(tag, title, body): Promise<void>` |
| `scripts/features/PublishPackages/GithubRelease.ts` | `@octokit/rest` implementation |

### New dependency

```sh
yarn add --dev @octokit/rest
```

`@octokit/rest` is a devDependency — it's only used in scripts, never in the published package.

---

## Data Flow

Publish sequence (real run):

```
getLatestVersion
  → computeVersion
  → changelogWriter.write(newVersion, commits)  ← now returns formatted entry string
  → updateDistPackageJson
  → npm.publish(distDir)
  → git.createTag(`v${newVersion}`)
  → githubRelease.createRelease(`v${newVersion}`, `v${newVersion}`, entryString)
```

`changelogWriter.write()` returns the formatted changelog entry (e.g. `"## [1.2.0] — 2026-05-08\n### Added\n- ..."`) — the same text it already builds before writing to disk. The orchestrator captures this and passes it directly as the release body.

---

## GithubRelease Implementation

`GithubRelease` takes `ProjectConfig` and `GitRepository` as constructor dependencies.

`createRelease(tag, title, body)` flow:

1. **Parse owner/repo** — call `git.getRemoteUrl("origin")`, match against:
   - HTTPS: `https://github.com/([^/]+)/([^/.]+)(?:\.git)?`
   - SSH: `git@github\.com:([^/]+)/([^/.]+)(?:\.git)?`
   - Throw `Error("Cannot parse GitHub owner/repo from remote URL: <url>")` if neither matches.

2. **Read token** — `process.env.GITHUB_TOKEN`. Throw `Error("GITHUB_TOKEN env var is required to create a GitHub release")` if absent.

3. **Dry-run gate** — if `config.dryRun`: log `[dry run] would create GitHub release <tag> for <owner>/<repo>` and return. Steps 1 and 2 always run, so misconfiguration is caught before a real publish is attempted.

4. **Create release** — `new Octokit({ auth: token }).rest.repos.createRelease({ owner, repo, tag_name: tag, name: title, body })`.

---

## Error Handling

| Failure | Behaviour |
|---------|-----------|
| Remote URL unparseable | Throw before any API call; operator fixes git remote |
| `GITHUB_TOKEN` missing | Throw before any API call |
| Octokit call fails | Error propagates; npm publish + git tag already succeeded — operator creates release manually via `gh release create` |

Errors in steps 1–2 fail fast in both dry-run and real-run, so CI catches misconfiguration during the safe dry-run pass.

---

## Dry-Run Behaviour

Full dry-run log output (all existing lines plus new line):

```
Dry run — pass --publish to actually publish.
Latest published: 1.1.0
minor bump: 1.1.0 → 1.2.0
Commits:
  feat(stdlib): add HttpTool
[dry run] would update CHANGELOG.md
[dry run] would publish @webiny/stdlib@1.2.0
[dry run] would tag v1.2.0
[dry run] would create GitHub release v1.2.0 for webiny/webiny-node-tools
```

URL parsing and token presence are validated before the dry-run gate, so the last line only appears when config is correct.

---

## Testing

**`ChangelogWriter.write` return value** — existing tests updated to assert the returned string matches the expected entry format (same text that gets prepended to `CHANGELOG.md`).

**`GithubRelease`** — no script test suite exists. Dry-run mode is the practical test: with `GITHUB_TOKEN` set and a parseable remote, `node scripts/publishPackages.ts` must log the dry-run release line. Octokit call is not exercised in dry-run.

**`GitRepository.getRemoteUrl`** — manually verified against the actual repo; both SSH and HTTPS URL forms handled.

**End-to-end dry-run** — the primary verification gate before a real release.
