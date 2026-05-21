import { describe, expect, it } from "vitest";
import { immutableGet } from "../../src/common/utils/dotProp.js";

describe("immutableGet", () => {
    it("gets a top-level property", () => {
        expect(immutableGet({ a: 1 }, "a")).toBe(1);
    });

    it("gets a nested property by dot path", () => {
        expect(immutableGet({ a: { b: { c: 42 } } }, "a.b.c")).toBe(42);
    });

    it("returns undefined when path does not exist and no default is given", () => {
        expect(immutableGet({ a: 1 }, "b")).toBeUndefined();
    });

    it("returns the default value when path does not exist", () => {
        expect(immutableGet({ a: 1 }, "b", "fallback")).toBe("fallback");
    });

    it("returns the default value when object is null", () => {
        expect(immutableGet(null, "a.b", 99)).toBe(99);
    });

    it("returns the default value when object is undefined", () => {
        expect(immutableGet(undefined, "a.b", "x")).toBe("x");
    });

    it("does not mutate the source object", () => {
        const obj = { a: { b: 1 } };
        const newObj = immutableGet<any>(obj, "a");
        newObj.b = 2;
        expect(newObj).toEqual({ b: 2 });
        expect(obj).toEqual({ a: { b: 1 } });
    });
});
