---
"@webiny/stdlib": patch
---

Add `Env` abstraction for typed environment variable access with `getString`, `getNumber`, and `getBoolean` families (each with bare, default, and OrThrow variants). Node implementation (`ProcessEnvFeature`) reads from `process.env`; browser implementation (`BrowserEnvFeature`) accepts an injected variables object.
