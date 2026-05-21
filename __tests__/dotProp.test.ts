import { describe, expect, it } from "vitest";
import {
    immutableGet,
    immutableSet,
    immutableDelete,
    mutableSet,
    mutableDelete
} from "../src/common/utils/dotProp.js";

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

describe("immutableDelete", () => {
    it("returns a new object reference", () => {
        const obj = { a: 1 };
        const result = immutableDelete(obj, "a");
        expect(result).not.toBe(obj);
    });

    it("removes a top-level property", () => {
        expect(immutableDelete({ a: 1, b: 2 }, "a")).toEqual({ b: 2 });
    });

    it("removes a nested property by dot path", () => {
        expect(immutableDelete({ a: { b: 1, c: 2 } }, "a.b")).toEqual({ a: { c: 2 } });
    });

    it("does not mutate the original object", () => {
        const obj = { a: 1, b: 2 };
        immutableDelete(obj, "a");
        expect(obj).toEqual({ a: 1, b: 2 });
    });

    it("is a no-op when the path does not exist", () => {
        const obj = { a: 1 };
        expect(immutableDelete(obj, "b")).toEqual({ a: 1 });
    });
});

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

describe("mutableDelete", () => {
    it("removes a top-level property from the original object", () => {
        const obj = { a: 1, b: 2 };
        mutableDelete(obj, "a");
        expect(obj).toEqual({ b: 2 });
    });

    it("removes a nested property by dot path", () => {
        const obj = { a: { b: 1, c: 2 } };
        mutableDelete(obj, "a.b");
        expect(obj).toEqual({ a: { c: 2 } });
    });

    it("returns void", () => {
        const obj = { a: 1 };
        mutableDelete(obj, "a");
        expect(obj).toEqual({});
    });

    it("is a no-op when the path does not exist", () => {
        const obj = { a: 1 };
        expect(() => mutableDelete(obj, "b")).not.toThrow();
        expect(obj).toEqual({ a: 1 });
    });

    it("splices an element from an array by numeric index", () => {
        const arr = ["a", "b", "c"];
        mutableDelete(arr, 1);
        expect(arr).toEqual(["a", "c"]);
    });

    it("splices the first element from an array", () => {
        const arr = [10, 20, 30];
        mutableDelete(arr, 0);
        expect(arr).toEqual([20, 30]);
    });

    it("splices the last element from an array", () => {
        const arr = [10, 20, 30];
        mutableDelete(arr, 2);
        expect(arr).toEqual([10, 20]);
    });

    it("mutates the original array reference", () => {
        const arr = [1, 2, 3];
        const ref = arr;
        mutableDelete(arr, 0);
        expect(ref).toBe(arr);
        expect(arr.length).toBe(2);
        expect(ref).toEqual([2, 3]);
    });

    it("returns true when the index exists", () => {
        const arr = ["x", "y"];
        expect(mutableDelete(arr, 0)).toBe(true);
    });

    it("returns false when the index is out of bounds", () => {
        const arr = ["x"];
        expect(mutableDelete(arr, 5)).toBe(false);
    });

    it("returns false for an empty array", () => {
        const arr: string[] = [];
        expect(mutableDelete(arr, 0)).toBe(false);
    });
});
