import { describe, expect, it } from "vitest";
import { mutableSet } from "../../src/common/utils/dotProp/dotProp.js";

describe("mutableSet", () => {
    it("returns the same object reference", () => {
        const obj = { a: 1 };
        const result = mutableSet(obj, "a", 2);
        expect(result).toBe(obj);
    });

    it("sets a top-level property on the original object", () => {
        const obj = { a: 1 };
        mutableSet(obj, "a", 42);
        expect(obj.a).toBe(42);
    });

    it("sets a nested property by dot path", () => {
        const obj = { a: { b: 1 } };
        mutableSet(obj, "a.b", 99);
        expect(obj.a.b).toBe(99);
    });

    it("creates intermediate objects for missing paths", () => {
        const obj: Record<string, any> = {};
        mutableSet(obj, "a.b.c", 7);
        expect(obj).toEqual({ a: { b: { c: 7 } } });
    });
});
