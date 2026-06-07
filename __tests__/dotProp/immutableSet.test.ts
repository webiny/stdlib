import { describe, expect, it } from "vitest";
import { immutableSet } from "../../src/common/utils/dotProp/dotProp.js";

describe("immutableSet", () => {
    it("returns a new object reference", () => {
        const obj = { a: 1 };
        const result = immutableSet(obj, "a", 2);
        expect(result).not.toBe(obj);
    });

    it("sets a top-level property", () => {
        expect(immutableSet({ a: 1 }, "a", 2)).toEqual({ a: 2 });
    });

    it("sets a nested property by dot path", () => {
        expect(immutableSet({ a: { b: 1 } }, "a.b", 99)).toEqual({ a: { b: 99 } });
    });

    it("creates intermediate objects for missing paths", () => {
        expect(immutableSet({} as Record<string, any>, "a.b.c", 7)).toEqual({ a: { b: { c: 7 } } });
    });

    it("does not mutate the original object", () => {
        const obj = { a: { b: 1 } };
        immutableSet(obj, "a.b", 99);
        expect(obj.a.b).toBe(1);
    });

    it("deep-clones nested objects so the result shares no references with the original", () => {
        const obj = { a: { b: 1 } };
        const result = immutableSet(obj, "a.b", 2);
        expect(result.a).not.toBe(obj.a);
    });

    it("accepts a functional updater that receives the current value", () => {
        const result = immutableSet({ count: 5 }, "count", (n: number) => n + 1);
        expect(result).toEqual({ count: 6 });
    });

    it("functional updater receives undefined for a missing path", () => {
        let received: unknown = "sentinel";
        immutableSet({} as Record<string, any>, "missing", (v: unknown) => {
            received = v;
            return 0;
        });
        expect(received).toBeUndefined();
    });
});
