---
"@webiny/stdlib": patch
---

Fix broken `stdlib-mcp` bin entry in published package

The build script's `ArtifactCopier` rewrites `main`, `types`, and `exports` paths when copying `package.json` into `dist/`, but was not rewriting `bin` entries. Since the package publishes from `dist/` (via `publishConfig.directory`), the bin path `./dist/mcp/cli.js` resolved to the nonexistent `dist/dist/mcp/cli.js`, causing `npx -y @webiny/stdlib stdlib-mcp` to fail with `command not found`. The `bin` field is now rewritten with the same `stripDist()` logic as the other path fields.
