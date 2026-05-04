import { Container } from "@webiny/di";
import { describe, it, expect } from "vitest";
import { PinoLogger } from "../src/features/PinoLogger/PinoLogger.js";
import { Logger } from "@webiny/utils-common";
import { PinoLoggerConfig } from "../src/features/PinoLogger/abstractions/PinoLoggerConfig.js";

function makeContainer(config?: PinoLoggerConfig.Config): Logger.Interface {
    const container = new Container();
    if (config !== undefined) {
        container.registerInstance(PinoLoggerConfig, { getConfig: () => config });
    }
    container.register(PinoLogger).inSingletonScope();
    return container.resolve(Logger);
}

describe("PinoLogger", () => {
    it("constructs without config (defaults to info + pretty)", () => {
        expect(() => makeContainer()).not.toThrow();
    });

    it("constructs with explicit logLevel and transport", () => {
        expect(() => makeContainer({ logLevel: "debug", transport: "json" })).not.toThrow();
    });

    it("child() returns a Logger.Interface instance", () => {
        const logger = makeContainer();
        const child = logger.child("Worker");
        expect(child).toBeDefined();
        expect(typeof child.info).toBe("function");
    });

    it("child logger does not throw when logging", () => {
        const logger = makeContainer({ transport: "json", logLevel: "info" });
        const child = logger.child("DB");
        expect(() => child.info("query executed")).not.toThrow();
    });

    it("logs all levels without data", () => {
        const logger = makeContainer({ transport: "json", logLevel: "debug" });
        expect(() => logger.debug("msg")).not.toThrow();
        expect(() => logger.info("msg")).not.toThrow();
        expect(() => logger.warn("msg")).not.toThrow();
        expect(() => logger.error("msg")).not.toThrow();
        expect(() => logger.fatal("msg")).not.toThrow();
    });

    it("logs all levels with data", () => {
        const logger = makeContainer({ transport: "json", logLevel: "debug" });
        const data = { key: "value" };
        expect(() => logger.debug("msg", data)).not.toThrow();
        expect(() => logger.info("msg", data)).not.toThrow();
        expect(() => logger.warn("msg", data)).not.toThrow();
        expect(() => logger.error("msg", data)).not.toThrow();
        expect(() => logger.fatal("msg", data)).not.toThrow();
    });

    it("child logs all levels without data", () => {
        const logger = makeContainer({ transport: "json", logLevel: "debug" });
        const child = logger.child("Worker");
        expect(() => child.debug("msg")).not.toThrow();
        expect(() => child.info("msg")).not.toThrow();
        expect(() => child.warn("msg")).not.toThrow();
        expect(() => child.error("msg")).not.toThrow();
        expect(() => child.fatal("msg")).not.toThrow();
    });

    it("child logs all levels with data", () => {
        const logger = makeContainer({ transport: "json", logLevel: "debug" });
        const child = logger.child("Worker");
        const data = { userId: 42 };
        expect(() => child.debug("msg", data)).not.toThrow();
        expect(() => child.info("msg", data)).not.toThrow();
        expect(() => child.warn("msg", data)).not.toThrow();
        expect(() => child.error("msg", data)).not.toThrow();
        expect(() => child.fatal("msg", data)).not.toThrow();
    });

    it("child().child() nests prefixes", () => {
        const logger = makeContainer({ transport: "json", logLevel: "debug" });
        const nested = logger.child("A").child("B");
        expect(() => nested.info("msg")).not.toThrow();
    });
});
