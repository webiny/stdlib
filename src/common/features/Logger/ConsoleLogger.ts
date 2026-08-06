import { Logger } from "./abstractions/Logger.js";
import { ConsoleLoggerConfig } from "./abstractions/ConsoleLoggerConfig.js";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
};

/** Console-based logger. Registered under the Logger abstraction by ConsoleLoggerFeature. */
class ConsoleLoggerImpl implements Logger.Interface {
    private readonly minLevel: number;
    private readonly prefix: string;
    private readonly timestamp: boolean;
    private readonly formatTimestamp: (date: Date) => string;

    public constructor(configProvider?: ConsoleLoggerConfig.Interface) {
        const config = configProvider?.getConfig();
        this.minLevel = LOG_LEVEL_PRIORITY[config?.logLevel ?? "debug"]!;
        this.prefix = config?.prefix ?? "";
        this.timestamp = config?.timestamp ?? false;
        this.formatTimestamp = config?.formatTimestamp ?? (d => d.toISOString());
    }

    private shouldLog(level: LogLevel): boolean {
        return (LOG_LEVEL_PRIORITY[level] ?? 0) >= this.minLevel;
    }

    private format(message: string): string {
        const parts: string[] = [];
        if (this.timestamp) {
            parts.push(`[${this.formatTimestamp(new Date())}]`);
        }
        if (this.prefix) {
            parts.push(`[${this.prefix}]`);
        }
        parts.push(message);
        return parts.join(" ");
    }

    public debug(message: string, data?: Record<string, unknown>): void {
        if (this.shouldLog("debug")) {
            console.debug(this.format(message), ...(data ? [data] : []));
        }
    }

    public info(message: string, data?: Record<string, unknown>): void {
        if (this.shouldLog("info")) {
            console.info(this.format(message), ...(data ? [data] : []));
        }
    }

    public warn(message: string, data?: Record<string, unknown>): void {
        if (this.shouldLog("warn")) {
            console.warn(this.format(message), ...(data ? [data] : []));
        }
    }

    public error(message: string, data?: Record<string, unknown>): void {
        if (this.shouldLog("error")) {
            console.error(this.format(message), ...(data ? [data] : []));
        }
    }

    public fatal(message: string, data?: Record<string, unknown>): void {
        if (this.shouldLog("fatal")) {
            console.error(this.format(message), ...(data ? [data] : []));
        }
    }

    public child(prefix: string): Logger.Interface {
        const combined = this.prefix ? `${this.prefix}:${prefix}` : prefix;
        const configOverride: ConsoleLoggerConfig.Interface = {
            getConfig: () => ({
                logLevel:
                    (Object.keys(LOG_LEVEL_PRIORITY) as LogLevel[]).find(
                        k => LOG_LEVEL_PRIORITY[k] === this.minLevel
                    ) ?? "debug",
                prefix: combined,
                timestamp: this.timestamp,
                formatTimestamp: this.formatTimestamp
            })
        };
        return new ConsoleLoggerImpl(configOverride);
    }
}

/**
 * Console-based Logger implementation.
 * Register via ConsoleLoggerFeature. Optionally pair with ConsoleLoggerConfig
 * to configure log level, prefix, and timestamps.
 */
export const ConsoleLogger = Logger.createImplementation({
    implementation: ConsoleLoggerImpl,
    dependencies: [[ConsoleLoggerConfig, { optional: true }]]
});

export const createConsoleLogger = (configProvider?: ConsoleLoggerConfig.Interface) => {
    return new ConsoleLoggerImpl(configProvider);
};
