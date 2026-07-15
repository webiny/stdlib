import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Container } from "@webiny/di";
import { PinoLoggerConfig, PinoLoggerFeature } from "../../src/node/features/PinoLogger/index.js";
import { ProcessEnvFeature } from "../../src/node/features/ProcessEnv/index.js";
import { Env } from "../../src/common/features/Env/index.js";

function makeContainer(): Container {
    const container = new Container();
    container.registerInstance(PinoLoggerConfig, {
        getConfig: () => ({ logLevel: "error" as const, transport: "json" as const })
    });
    PinoLoggerFeature.register(container);
    ProcessEnvFeature.register(container);
    return container;
}

describe("ProcessEnv", () => {
    let env: Env.Interface;
    const TEST_PREFIX = "WBY_STDLIB_TEST_";

    beforeEach(() => {
        env = makeContainer().resolve(Env);
    });

    afterEach(() => {
        for (const key of Object.keys(process.env)) {
            if (key.startsWith(TEST_PREFIX)) {
                delete process.env[key];
            }
        }
    });

    describe("getString", () => {
        it("should return the value when set", () => {
            process.env[`${TEST_PREFIX}STR`] = "hello";
            expect(env.getString(`${TEST_PREFIX}STR`)).toBe("hello");
        });

        it("should return undefined when not set", () => {
            expect(env.getString(`${TEST_PREFIX}MISSING`)).toBeUndefined();
        });

        it("should return default when not set and default provided", () => {
            expect(env.getString(`${TEST_PREFIX}MISSING`, "fallback")).toBe("fallback");
        });

        it("should return the value over the default when set", () => {
            process.env[`${TEST_PREFIX}STR`] = "actual";
            expect(env.getString(`${TEST_PREFIX}STR`, "fallback")).toBe("actual");
        });

        it("should return empty string when set to empty", () => {
            process.env[`${TEST_PREFIX}EMPTY`] = "";
            expect(env.getString(`${TEST_PREFIX}EMPTY`)).toBe("");
        });
    });

    describe("getStringOrThrow", () => {
        it("should return the value when set", () => {
            process.env[`${TEST_PREFIX}STR`] = "hello";
            expect(env.getStringOrThrow(`${TEST_PREFIX}STR`)).toBe("hello");
        });

        it("should throw when not set", () => {
            expect(() => env.getStringOrThrow(`${TEST_PREFIX}MISSING`)).toThrow();
        });
    });

    describe("getNumber", () => {
        it("should parse an integer", () => {
            process.env[`${TEST_PREFIX}NUM`] = "42";
            expect(env.getNumber(`${TEST_PREFIX}NUM`)).toBe(42);
        });

        it("should parse a float", () => {
            process.env[`${TEST_PREFIX}NUM`] = "3.14";
            expect(env.getNumber(`${TEST_PREFIX}NUM`)).toBe(3.14);
        });

        it("should parse a negative number", () => {
            process.env[`${TEST_PREFIX}NUM`] = "-7";
            expect(env.getNumber(`${TEST_PREFIX}NUM`)).toBe(-7);
        });

        it("should return undefined when not set", () => {
            expect(env.getNumber(`${TEST_PREFIX}MISSING`)).toBeUndefined();
        });

        it("should return undefined for unparseable value", () => {
            process.env[`${TEST_PREFIX}NUM`] = "abc";
            expect(env.getNumber(`${TEST_PREFIX}NUM`)).toBeUndefined();
        });

        it("should return undefined for empty string", () => {
            process.env[`${TEST_PREFIX}NUM`] = "";
            expect(env.getNumber(`${TEST_PREFIX}NUM`)).toBeUndefined();
        });

        it("should return default when not set", () => {
            expect(env.getNumber(`${TEST_PREFIX}MISSING`, 99)).toBe(99);
        });

        it("should return default for unparseable value", () => {
            process.env[`${TEST_PREFIX}NUM`] = "abc";
            expect(env.getNumber(`${TEST_PREFIX}NUM`, 99)).toBe(99);
        });

        it("should return parsed value over default", () => {
            process.env[`${TEST_PREFIX}NUM`] = "42";
            expect(env.getNumber(`${TEST_PREFIX}NUM`, 99)).toBe(42);
        });

        it("should return undefined for NaN-producing values", () => {
            process.env[`${TEST_PREFIX}NUM`] = "NaN";
            expect(env.getNumber(`${TEST_PREFIX}NUM`)).toBeUndefined();
        });

        it("should return undefined for Infinity", () => {
            process.env[`${TEST_PREFIX}NUM`] = "Infinity";
            expect(env.getNumber(`${TEST_PREFIX}NUM`)).toBeUndefined();
        });
    });

    describe("getNumberOrThrow", () => {
        it("should return parsed number when valid", () => {
            process.env[`${TEST_PREFIX}NUM`] = "42";
            expect(env.getNumberOrThrow(`${TEST_PREFIX}NUM`)).toBe(42);
        });

        it("should throw when not set", () => {
            expect(() => env.getNumberOrThrow(`${TEST_PREFIX}MISSING`)).toThrow();
        });

        it("should throw for unparseable value", () => {
            process.env[`${TEST_PREFIX}NUM`] = "abc";
            expect(() => env.getNumberOrThrow(`${TEST_PREFIX}NUM`)).toThrow();
        });
    });

    describe("getBoolean", () => {
        it("should parse truthy values", () => {
            for (const val of ["true", "t", "yes", "y", "on", "1", "TRUE", "Yes"]) {
                process.env[`${TEST_PREFIX}BOOL`] = val;
                expect(env.getBoolean(`${TEST_PREFIX}BOOL`)).toBe(true);
            }
        });

        it("should parse falsy values", () => {
            for (const val of ["false", "f", "no", "n", "off", "0", "FALSE", "No"]) {
                process.env[`${TEST_PREFIX}BOOL`] = val;
                expect(env.getBoolean(`${TEST_PREFIX}BOOL`)).toBe(false);
            }
        });

        it("should return undefined when not set", () => {
            expect(env.getBoolean(`${TEST_PREFIX}MISSING`)).toBeUndefined();
        });

        it("should return default when not set", () => {
            expect(env.getBoolean(`${TEST_PREFIX}MISSING`, false)).toBe(false);
            expect(env.getBoolean(`${TEST_PREFIX}MISSING`, true)).toBe(true);
        });

        it("should return parsed value over default", () => {
            process.env[`${TEST_PREFIX}BOOL`] = "true";
            expect(env.getBoolean(`${TEST_PREFIX}BOOL`, false)).toBe(true);
        });
    });

    describe("getBooleanOrThrow", () => {
        it("should return parsed boolean when set", () => {
            process.env[`${TEST_PREFIX}BOOL`] = "true";
            expect(env.getBooleanOrThrow(`${TEST_PREFIX}BOOL`)).toBe(true);
        });

        it("should throw when not set", () => {
            expect(() => env.getBooleanOrThrow(`${TEST_PREFIX}MISSING`)).toThrow();
        });
    });
});
