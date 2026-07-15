// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { Container } from "@webiny/di";
import { ConsoleLoggerConfig } from "../../src/common/features/Logger/abstractions/ConsoleLoggerConfig.js";
import { ConsoleLoggerFeature } from "../../src/common/features/Logger/feature.js";
import { Env } from "../../src/common/features/Env/index.js";
import { BrowserEnvFeature } from "../../src/browser/features/BrowserEnv/index.js";

function makeContainer(vars?: Record<string, string>): Container {
    const container = new Container();
    container.registerInstance(ConsoleLoggerConfig, {
        getConfig: () => ({ logLevel: "error" as const })
    });
    ConsoleLoggerFeature.register(container);
    BrowserEnvFeature.register(container, vars ? { variables: vars } : undefined);
    return container;
}

describe("BrowserEnv", () => {
    describe("with no variables provided", () => {
        let env: Env.Interface;

        beforeEach(() => {
            env = makeContainer().resolve(Env);
        });

        it("getString should return undefined", () => {
            expect(env.getString("ANY_KEY")).toBeUndefined();
        });

        it("getString should return default", () => {
            expect(env.getString("ANY_KEY", "fallback")).toBe("fallback");
        });

        it("getStringOrThrow should throw", () => {
            expect(() => env.getStringOrThrow("ANY_KEY")).toThrow();
        });

        it("getNumber should return undefined", () => {
            expect(env.getNumber("ANY_KEY")).toBeUndefined();
        });

        it("getNumber should return default", () => {
            expect(env.getNumber("ANY_KEY", 42)).toBe(42);
        });

        it("getNumberOrThrow should throw", () => {
            expect(() => env.getNumberOrThrow("ANY_KEY")).toThrow();
        });

        it("getBoolean should return undefined", () => {
            expect(env.getBoolean("ANY_KEY")).toBeUndefined();
        });

        it("getBoolean should return default", () => {
            expect(env.getBoolean("ANY_KEY", false)).toBe(false);
        });

        it("getBooleanOrThrow should throw", () => {
            expect(() => env.getBooleanOrThrow("ANY_KEY")).toThrow();
        });
    });

    describe("with variables provided", () => {
        let env: Env.Interface;

        beforeEach(() => {
            env = makeContainer({
                APP_NAME: "myapp",
                PORT: "3000",
                DEBUG: "true",
                INVALID_NUM: "abc"
            }).resolve(Env);
        });

        it("getString should return the value", () => {
            expect(env.getString("APP_NAME")).toBe("myapp");
        });

        it("getNumber should parse the value", () => {
            expect(env.getNumber("PORT")).toBe(3000);
        });

        it("getNumber should return undefined for unparseable", () => {
            expect(env.getNumber("INVALID_NUM")).toBeUndefined();
        });

        it("getNumber should return default for unparseable", () => {
            expect(env.getNumber("INVALID_NUM", 99)).toBe(99);
        });

        it("getBoolean should parse the value", () => {
            expect(env.getBoolean("DEBUG")).toBe(true);
        });

        it("getStringOrThrow should return the value", () => {
            expect(env.getStringOrThrow("APP_NAME")).toBe("myapp");
        });

        it("getNumberOrThrow should return parsed number", () => {
            expect(env.getNumberOrThrow("PORT")).toBe(3000);
        });

        it("getNumberOrThrow should throw for unparseable", () => {
            expect(() => env.getNumberOrThrow("INVALID_NUM")).toThrow();
        });

        it("getBooleanOrThrow should return parsed boolean", () => {
            expect(env.getBooleanOrThrow("DEBUG")).toBe(true);
        });
    });
});
