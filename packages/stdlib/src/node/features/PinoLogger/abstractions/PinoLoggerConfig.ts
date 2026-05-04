import { createAbstraction } from "~/common";

/**
 * Configuration shape for PinoLogger.
 * All fields are optional — PinoLogger defaults to info level + pretty transport.
 */
export type PinoLoggerConfigData = {
    /** Minimum log level. Default: "info". */
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal";
    /**
     * Output transport.
     * - "pretty": human-readable coloured output (default, good for development)
     * - "json": compact JSON line per message (good for structured log pipelines)
     */
    transport?: "pretty" | "json";
};

interface IPinoLoggerConfig {
    getConfig(): PinoLoggerConfigData;
}

export const PinoLoggerConfig = createAbstraction<IPinoLoggerConfig>("Node/PinoLoggerConfig");

export namespace PinoLoggerConfig {
    export type Interface = IPinoLoggerConfig;
    export type Config = PinoLoggerConfigData;
}
