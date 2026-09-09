---
"@webiny/stdlib": patch
---

Add BrowserWindow abstraction to decouple browser features from the global `window` object, with real and null implementations. Replace silent `void` returns with `Result` pattern across `DirectoryTool.create`, `FileTool.writeFile`/`copy`, `JsonFileTool.writeJson`, and `PackageJsonFileTool.write`. Add `createOrThrow` to DirectoryTool. New typed errors: `DirectoryCreateError`, `FileWriteError`, `FileCopyError`.
