# ProcessEnv

Node.js implementation of the `Env` abstraction, backed by `process.env`. Provides typed access to environment variables with `getString`, `getNumber`, and `getBoolean` families.

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
