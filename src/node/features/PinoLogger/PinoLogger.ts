import pino from "pino";
import pretty from "pino-pretty";
import { Writable } from "node:stream";
import { Logger } from "#common";
import { PinoLoggerConfig } from "./abstractions/PinoLoggerConfig.js";

type JsonLogType = "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_TO_TYPE: Record<number, JsonLogType> = {
    20: "debug",
    30: "info",
    40: "warn",
    50: "error",
    60: "fatal"
};

const createJsonDestination = (): Writable => {
    return new Writable({
        write(chunk, _enc, cb) {
            try {
                const entry = JSON.parse(chunk.toString()) as { level: number; msg: string };
                const type: JsonLogType = LEVEL_TO_TYPE[entry.level] ?? "info";
                process.stdout.write(JSON.stringify({ type, message: entry.msg }) + "\n");
            } catch {
                // ignore malformed lines
            }
            cb();
        }
    });
};

const createPrettyDestination = (): Writable => {
    return pretty({
        colorize: true,
        customColors: "fatal:red,error:red,warn:yellow,info:blue,debug:gray",
        ignore: "pid,hostname,time",
        messageFormat: "{msg}"
    });
};

/**
 * Internal child logger that wraps an existing pino instance and prepends a prefix.
 * Not registered in DI — created by PinoLoggerImpl.child().
 */
class ChildPinoLogger implements Logger.Interface {
    public constructor(
        private readonly pinoLogger: pino.Logger,
        private readonly prefix: string
    ) {}

    private format(message: string): string {
        return `${this.prefix} ${message}`;
    }

    public debug(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.debug(data, this.format(message));
            return;
        }
        this.pinoLogger.debug(this.format(message));
    }

    public info(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.info(data, this.format(message));
            return;
        }
        this.pinoLogger.info(this.format(message));
    }

    public warn(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.warn(data, this.format(message));
            return;
        }
        this.pinoLogger.warn(this.format(message));
    }

    public error(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.error(data, this.format(message));
            return;
        }
        this.pinoLogger.error(this.format(message));
    }

    public fatal(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.fatal(data, this.format(message));
            return;
        }
        this.pinoLogger.fatal(this.format(message));
    }

    public child(prefix: string): Logger.Interface {
        const combined = `${this.prefix}:${prefix}`;
        return new ChildPinoLogger(this.pinoLogger, combined);
    }
}

/** Pino-based logger. Registered under the Logger abstraction by PinoLoggerFeature. */
class PinoLoggerImpl implements Logger.Interface {
    private readonly pinoLogger: pino.Logger;

    public constructor(configProvider?: PinoLoggerConfig.Interface) {
        const cfg = configProvider?.getConfig();
        const logLevel = cfg?.logLevel ?? "info";
        const transport = cfg?.transport ?? "pretty";

        const stream = transport === "json" ? createJsonDestination() : createPrettyDestination();

        this.pinoLogger = pino({ level: logLevel }, stream);
    }

    public debug(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.debug(data, message);
            return;
        }
        this.pinoLogger.debug(message);
    }

    public info(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.info(data, message);
            return;
        }
        this.pinoLogger.info(message);
    }

    public warn(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.warn(data, message);
            return;
        }
        this.pinoLogger.warn(message);
    }

    public error(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.error(data, message);
            return;
        }
        this.pinoLogger.error(message);
    }

    public fatal(message: string, data?: Record<string, unknown>): void {
        if (data) {
            this.pinoLogger.fatal(data, message);
            return;
        }
        this.pinoLogger.fatal(message);
    }

    public child(prefix: string): Logger.Interface {
        return new ChildPinoLogger(this.pinoLogger, prefix);
    }
}

/**
 * Pino-based Logger implementation for Node.js.
 * Register via PinoLoggerFeature. Optionally pair with PinoLoggerConfig
 * to configure log level and transport.
 */
export const PinoLogger = Logger.createImplementation({
    implementation: PinoLoggerImpl,
    dependencies: [[PinoLoggerConfig, { optional: true }]]
});

export interface CreatePinoLoggerParams {
    config?: PinoLoggerConfig.Config;
}

export function createPinoLogger(params?: CreatePinoLoggerParams): Logger.Interface {
    const configProvider =
        params?.config !== undefined ? { getConfig: () => params.config! } : undefined;
    return new PinoLoggerImpl(configProvider);
}
