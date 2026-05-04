import { createAbstraction } from "../../../core/index.js";

/**
 * Configuration shape returned by ConsoleLoggerConfig implementations.
 * All fields are optional — ConsoleLogger uses sensible defaults for any omitted field.
 */
export type ConsoleLoggerConfigData = {
    /** Minimum log level to output. Default: "debug" (logs everything). */
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal";
    /** String prepended to every message, e.g. "MyApp". Default: none. */
    prefix?: string;
    /** Whether to include a timestamp in each message. Default: false. */
    timestamp?: boolean;
    /**
     * Custom timestamp formatter. Only called when `timestamp` is true.
     * Default: `(d) => d.toISOString()`.
     */
    formatTimestamp?: (date: Date) => string;
};

interface IConsoleLoggerConfig {
    getConfig(): ConsoleLoggerConfigData;
}

export const ConsoleLoggerConfig = createAbstraction<IConsoleLoggerConfig>(
    "Core/ConsoleLoggerConfig"
);

export namespace ConsoleLoggerConfig {
    export type Interface = IConsoleLoggerConfig;
    export type Config = ConsoleLoggerConfigData;
}
