import { Container } from "@webiny/di";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleLogger } from "../src/features/Logger/ConsoleLogger.js";
import { Logger } from "../src/features/Logger/abstractions/Logger.js";
import { ConsoleLoggerConfig } from "../src/features/Logger/abstractions/ConsoleLoggerConfig.js";

function makeContainer(config?: ConsoleLoggerConfig.Config): {
    logger: Logger.Interface;
    container: Container;
} {
    const container = new Container();
    if (config !== undefined) {
        container.registerInstance(ConsoleLoggerConfig, { getConfig: () => config });
    }
    container.register(ConsoleLogger).inSingletonScope();
    return { logger: container.resolve(Logger), container };
}

describe("ConsoleLogger", () => {
    beforeEach(() => {
        vi.spyOn(console, "debug").mockImplementation(() => {});
        vi.spyOn(console, "info").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("log level filtering", () => {
        it("logs everything by default when no config is registered", () => {
            const { logger } = makeContainer();
            logger.debug("hi");
            expect(console.debug).toHaveBeenCalledWith("hi");
        });

        it("suppresses debug when logLevel is info", () => {
            const { logger } = makeContainer({ logLevel: "info" });
            logger.debug("hidden");
            expect(console.debug).not.toHaveBeenCalled();
        });

        it("logs info when logLevel is info", () => {
            const { logger } = makeContainer({ logLevel: "info" });
            logger.info("visible");
            expect(console.info).toHaveBeenCalledWith("visible");
        });

        it("suppresses debug and info when logLevel is warn", () => {
            const { logger } = makeContainer({ logLevel: "warn" });
            logger.debug("d");
            logger.info("i");
            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
        });

        it("logs warn, error, fatal when logLevel is warn", () => {
            const { logger } = makeContainer({ logLevel: "warn" });
            logger.warn("w");
            logger.error("e");
            logger.fatal("f");
            expect(console.warn).toHaveBeenCalledWith("w");
            expect(console.error).toHaveBeenCalledWith("e");
            expect(console.error).toHaveBeenCalledWith("f");
        });
    });

    describe("prefix", () => {
        it("prepends prefix to messages", () => {
            const { logger } = makeContainer({ prefix: "App" });
            logger.info("started");
            expect(console.info).toHaveBeenCalledWith("[App] started");
        });

        it("does not add prefix brackets when prefix is not configured", () => {
            const { logger } = makeContainer();
            logger.info("plain");
            expect(console.info).toHaveBeenCalledWith("plain");
        });
    });

    describe("timestamp", () => {
        it("does not include timestamp by default", () => {
            const { logger } = makeContainer();
            logger.info("msg");
            expect(console.info).toHaveBeenCalledWith("msg");
        });

        it("includes ISO timestamp when timestamp is true", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
            const { logger } = makeContainer({ timestamp: true });
            logger.info("msg");
            expect(console.info).toHaveBeenCalledWith("[2026-01-01T00:00:00.000Z] msg");
            vi.useRealTimers();
        });

        it("uses custom formatTimestamp when provided", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
            const { logger } = makeContainer({
                timestamp: true,
                formatTimestamp: d => String(d.getFullYear())
            });
            logger.info("msg");
            expect(console.info).toHaveBeenCalledWith("[2026] msg");
            vi.useRealTimers();
        });
    });

    describe("data parameter", () => {
        it("passes data object as second argument to console methods", () => {
            const { logger } = makeContainer();
            const data = { userId: 1, action: "login" };
            logger.info("event", data);
            expect(console.info).toHaveBeenCalledWith("event", data);
        });

        it("does not pass a second argument when data is omitted", () => {
            const { logger } = makeContainer();
            logger.info("plain");
            expect(console.info).toHaveBeenCalledWith("plain");
            expect((console.info as ReturnType<typeof vi.spyOn>).mock.calls[0].length).toBe(1);
        });

        it("passes data on all log levels", () => {
            const { logger } = makeContainer();
            const data = { x: 1 };
            logger.debug("d", data);
            logger.warn("w", data);
            logger.error("e", data);
            logger.fatal("f", data);
            expect(console.debug).toHaveBeenCalledWith("d", data);
            expect(console.warn).toHaveBeenCalledWith("w", data);
            expect(console.error).toHaveBeenCalledWith("e", data);
            expect(console.error).toHaveBeenCalledWith("f", data);
        });
    });

    describe("child()", () => {
        it("creates child logger with combined prefix", () => {
            const { logger } = makeContainer({ prefix: "App" });
            const child = logger.child("DB");
            child.info("query");
            expect(console.info).toHaveBeenCalledWith("[App:DB] query");
        });

        it("creates child with prefix when parent has none", () => {
            const { logger } = makeContainer();
            const child = logger.child("Worker");
            child.warn("slow");
            expect(console.warn).toHaveBeenCalledWith("[Worker] slow");
        });

        it("child inherits parent log level", () => {
            const { logger } = makeContainer({ logLevel: "error" });
            const child = logger.child("Sub");
            child.info("suppressed");
            expect(console.info).not.toHaveBeenCalled();
            child.error("visible");
            expect(console.error).toHaveBeenCalled();
        });
    });
});
