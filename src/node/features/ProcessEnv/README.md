---
name: process-env
description: Node.js implementation of the Env abstraction, backed by process.env by default.
context: node
---

# ProcessEnv

Node.js implementation of the `Env` abstraction, backed by `process.env` by default. Accepts an optional `variables` record to override the source. Provides typed access to environment variables with `getString`, `getNumber`, and `getBoolean` families.

See [Env README](../../common/features/Env/README.md) for the full interface and usage.

## Usage

```ts
import { Container } from "@webiny/di";
import { Env } from "@webiny/stdlib";
import { ProcessEnvFeature } from "@webiny/stdlib/node";

const container = new Container();
ProcessEnvFeature.register(container);
const env = container.resolve(Env);

const port = env.getNumber("PORT", 3000);
```

### With custom variables (DI)

```ts
ProcessEnvFeature.register(container, {
  variables: { ...process.env, MY_VAR: "overridden" }
});
```

### Without DI

```ts
import { createProcessEnv } from "@webiny/stdlib/node";

// Defaults to process.env
const env = createProcessEnv();

// With custom variables
const env = createProcessEnv({
  variables: { ...process.env, MY_VAR: "overridden" }
});
```
