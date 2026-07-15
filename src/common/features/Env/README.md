# Env

Typed access to environment variables. The `Env` abstraction lives in `@webiny/stdlib` (common) and has platform-specific implementations: `ProcessEnv` (Node, backed by `process.env`) and `BrowserEnv` (browser, backed by an injected variables object).

## Interface

- `getString(key)` / `getString(key, default)` — read a string variable
- `getStringOrThrow(key)` — read a string or throw if not set
- `getNumber(key)` / `getNumber(key, default)` — parse a numeric variable; returns `undefined` (or default) for missing or unparseable values
- `getNumberOrThrow(key)` — parse a number or throw if not set or not a valid number
- `getBoolean(key)` / `getBoolean(key, default)` — parse a boolean variable using `toBoolean`; returns `undefined` (or default) if not set
- `getBooleanOrThrow(key)` — parse a boolean or throw if not set

## Usage

### Node (ProcessEnv)

```ts
import { Container } from "@webiny/di";
import { Env } from "@webiny/stdlib";
import { ProcessEnvFeature } from "@webiny/stdlib/node";

const container = new Container();
ProcessEnvFeature.register(container);
const env = container.resolve(Env);

const port = env.getNumber("PORT", 3000);
const debug = env.getBoolean("DEBUG", false);
const secret = env.getStringOrThrow("SECRET_KEY");
```

### Browser (BrowserEnv)

```ts
import { Container } from "@webiny/di";
import { Env } from "@webiny/stdlib";
import { BrowserEnvFeature } from "@webiny/stdlib/browser";

const container = new Container();
BrowserEnvFeature.register(container, {
  variables: { API_URL: "https://api.example.com", DEBUG: "true" }
});
const env = container.resolve(Env);

const apiUrl = env.getString("API_URL");
```
