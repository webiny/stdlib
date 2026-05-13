# Verdaccio Publish Script

## Goal

Enable manual testing of release candidates by publishing `@webiny/stdlib` to a local Verdaccio registry with an explicit version string (e.g. `1.0.0-beta.abcdefg`), using the same build pipeline as the real publish flow.

## Script

**`scripts/publishToVerdaccio.ts`** — a standalone procedural script, no DI.

### Flow

1. Parse `--version <x>` from `process.argv`. Hard fail with a clear error message if missing.
2. Call `build(root)` from the existing `BuildPackages` feature — cleans `dist/` and compiles all three slices.
3. Read `dist/package.json`, set `version` to the provided value, write it back.
4. Run `npm publish --registry http://localhost:4873` in `dist/`.

### package.json entry

```json
"publish:verdaccio": "node scripts/publishToVerdaccio.ts"
```

### Usage

```sh
# terminal 1 — start local registry
yarn verdaccio:start

# terminal 2 — build and publish a release candidate
yarn publish:verdaccio --version 1.0.0-beta.abcdefg
```

## Constraints

- Follows Node 24 strip-only rules: `.ts` extensions in all relative imports within `scripts/`, no parameter properties in classes (moot here — script is procedural, no classes).
- No `--access public` flag — not required for a local Verdaccio registry.
- No changelog, no git tag, no GitHub release — this is dev-only.
- The real `publishPackages.ts` and its `PublishPackages` feature are not modified.
