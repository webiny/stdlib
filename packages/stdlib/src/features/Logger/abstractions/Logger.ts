import { createAbstraction } from "../../../core/index.js";

/**
 * Logger abstraction — the DI token and interface for all logger implementations.
 *
 * Register a concrete implementation (ConsoleLoggerFeature or PinoLoggerFeature)
 * before resolving this abstraction from the container.
 */
// Exported so cross-package declaration files can name this type directly.
export interface ILogger {
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    fatal(message: string, data?: Record<string, unknown>): void;
    /** Creates a child logger that prepends `prefix` to every message. */
    child(prefix: string): ILogger;
}

export const Logger = createAbstraction<ILogger>("Core/Logger");

export namespace Logger {
    export type Interface = ILogger;
}
