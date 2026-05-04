# PinoLogger

A [pino](https://github.com/pinojs/pino)-based implementation of the `Logger` abstraction from `@webiny/stdlib`. Registers under the shared `Logger` DI token, so any tool that depends on `Logger` will receive a pino instance when `PinoLoggerFeature` is registered.

Defaults to `logLevel: "info"` and `transport: "pretty"` (coloured human-readable output). Override by registering a `PinoLoggerConfig` instance before registering `PinoLoggerFeature`.

## Interface

`PinoLogger` implements `Logger.Interface` from `@webiny/stdlib`:

```ts
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  fatal(message: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}
```

`PinoLoggerConfig` is an optional DI dependency:

```ts
interface PinoLoggerConfig {
  getConfig(): {
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal";
    transport?: "pretty" | "json";
  };
}
```

## Usage

### With DI (default config)

```ts
import { Container } from "@webiny/di";
import { PinoLoggerFeature } from "@webiny/stdlib/node";
import { Logger } from "@webiny/stdlib";

const container = new Container();
PinoLoggerFeature.register(container);

const logger = container.resolve(Logger);
logger.info("hello");
```

### With DI (custom config)

```ts
import { Container } from "@webiny/di";
import { PinoLoggerConfig, PinoLoggerFeature } from "@webiny/stdlib/node";
import { Logger } from "@webiny/stdlib";

const container = new Container();
container.registerInstance(PinoLoggerConfig, {
  getConfig: () => ({ logLevel: "warn", transport: "json" })
});
PinoLoggerFeature.register(container);

const logger = container.resolve(Logger);
logger.warn("only warnings and above");
```
