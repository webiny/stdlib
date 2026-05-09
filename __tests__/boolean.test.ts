import { describe, expect, it } from "vitest";
import { toBoolean, isTruthy, isFalsy } from "../src/common/utils/boolean.js";

describe("toBoolean", () => {
    describe("strings — truthy set", () => {
        it.each(["true", "t", "yes", "y", "on", "1"])('returns true for "%s"', value => {
            expect(toBoolean(value)).toBe(true);
        });

        it.each(["TRUE", "True", "YES", "Yes", "ON", "On", "T", "Y"])(
            'returns true for uppercase/mixed "%s"',
            value => {
                expect(toBoolean(value)).toBe(true);
            }
        );

        it.each([" true ", " 1 ", " yes "])('returns true for whitespace-padded "%s"', value => {
            expect(toBoolean(value)).toBe(true);
        });
    });

    describe("strings — falsy set", () => {
        it.each(["false", "f", "no", "n", "off", "0", "", "banana", "2", "null"])(
            'returns false for "%s"',
            value => {
                expect(toBoolean(value)).toBe(false);
            }
        );
    });

    describe("numbers", () => {
        it("returns true for 1", () => {
            expect(toBoolean(1)).toBe(true);
        });

        it.each([0, 2, -1, 100, NaN])("returns false for %s", value => {
            expect(toBoolean(value)).toBe(false);
        });
    });

    describe("booleans", () => {
        it("returns true for true", () => {
            expect(toBoolean(true)).toBe(true);
        });

        it("returns false for false", () => {
            expect(toBoolean(false)).toBe(false);
        });
    });

    describe("other types", () => {
        it.each([null, undefined, {}, [], () => {}, Symbol("x")])(
            "returns false for non-string/number/boolean values",
            value => {
                expect(toBoolean(value)).toBe(false);
            }
        );
    });
});

describe("isTruthy", () => {
    it("mirrors toBoolean for a truthy value", () => {
        expect(isTruthy("true")).toBe(true);
        expect(isTruthy(1)).toBe(true);
        expect(isTruthy(true)).toBe(true);
    });

    it("mirrors toBoolean for a falsy value", () => {
        expect(isTruthy("false")).toBe(false);
        expect(isTruthy(0)).toBe(false);
        expect(isTruthy(null)).toBe(false);
    });
});

describe("isFalsy", () => {
    it("is the inverse of toBoolean for a truthy value", () => {
        expect(isFalsy("true")).toBe(false);
        expect(isFalsy(1)).toBe(false);
        expect(isFalsy(true)).toBe(false);
    });

    it("is the inverse of toBoolean for a falsy value", () => {
        expect(isFalsy("false")).toBe(true);
        expect(isFalsy(0)).toBe(true);
        expect(isFalsy(null)).toBe(true);
    });
});
