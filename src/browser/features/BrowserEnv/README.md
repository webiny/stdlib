---
name: browser-env
description: Browser implementation of the Env abstraction, backed by an injected Record<string, string> of variables.
context: browser
---

# BrowserEnv

Browser implementation of the `Env` abstraction, backed by an injected `Record<string, string>`. Pass variables at feature registration time; defaults to an empty object (all reads return `undefined` or the provided default).

See [Env README](../../common/features/Env/README.md) for the full interface and usage.

## Usage

```ts
import { Container } from "@webiny/di";
import { Env } from "@webiny/stdlib";
import { BrowserEnvFeature } from "@webiny/stdlib/browser";

const container = new Container();
BrowserEnvFeature.register(container, {
  variables: { API_URL: "https://api.example.com" }
});
const env = container.resolve(Env);
```

### Without DI

```ts
import { createBrowserEnv } from "@webiny/stdlib/browser";

const env = createBrowserEnv({
  variables: { API_URL: "https://api.example.com" }
});
```
