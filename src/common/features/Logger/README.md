# Logger / ConsoleLogger

`Logger` is the shared DI token for logging across all packages. `ConsoleLoggerFeature` registers a `console`-based implementation that supports log levels, optional prefix, and optional timestamps. Any package that injects `Logger` works with any registered implementation — swap `ConsoleLogger` for `PinoLogger` from `@webiny/stdlib/node` without changing call sites.

## Interface

```ts
interface ILogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  fatal(message: string, data?: Record<string, unknown>): void;
  /** Creates a child logger that prepends `prefix` to every message. */
  child(prefix: string): ILogger;
}
```

`ConsoleLoggerConfig` is an optional DI dependency for `ConsoleLoggerFeature`:

```ts
interface IConsoleLoggerConfig {
  getConfig(): {
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal";
    prefix?: string;
    timestamp?: boolean;
    formatTimestamp?: (date: Date) => string;
  };
}
```

## Usage

### With DI (default config)

```ts
import { Container } from "@webiny/di";
import { Logger, ConsoleLoggerFeature } from "@webiny/stdlib";

const container = new Container();
ConsoleLoggerFeature.register(container);

const logger = container.resolve(Logger);
logger.info("hello");
logger.child("MyModule").debug("child logger");
```

### With DI (custom config)

```ts
import { Container } from "@webiny/di";
import {
  Logger,
  ConsoleLoggerConfig,
  ConsoleLoggerFeature
} from "@webiny/stdlib";

const container = new Container();
container.registerInstance(ConsoleLoggerConfig, {
  getConfig: () => ({ logLevel: "warn", prefix: "App", timestamp: true })
});
ConsoleLoggerFeature.register(container);

const logger = container.resolve(Logger);
logger.warn("only warnings and above");
```
