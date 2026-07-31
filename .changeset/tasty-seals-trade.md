---
"@webiny/stdlib": patch
---

Replace filesystem-scanning skill discovery with a build-time manifest. The build now generates `skills.json` at the package root with metadata (name, description, context, path) for each skill. The MCP server reads the manifest on startup and loads skill bodies on demand, eliminating recursive directory walking at runtime.
