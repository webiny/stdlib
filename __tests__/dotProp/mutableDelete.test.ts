import { describe, expect, it } from "vitest";
import { mutableDelete } from "../../src/common/utils/dotProp.js";

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

    it("returns true when the property existed", () => {
        const obj = { a: 1 };
        expect(mutableDelete(obj, "a")).toBe(true);
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

    it("returns false for a negative index", () => {
        const arr = [1, 2, 3];
        expect(mutableDelete(arr, -1)).toBe(false);
    });

    it("returns false for an empty array", () => {
        const arr: string[] = [];
        expect(mutableDelete(arr, 0)).toBe(false);
    });
});
