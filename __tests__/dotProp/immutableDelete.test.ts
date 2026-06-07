import { describe, expect, it } from "vitest";
import { immutableDelete } from "../../src/common/utils/dotProp/dotProp.js";

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

    it("splices an element from a cloned array by numeric index", () => {
        const arr = ["a", "b", "c"];
        const result = immutableDelete(arr, 1);
        expect(result).toEqual(["a", "c"]);
    });

    it("splices the first element from a cloned array", () => {
        const arr = [10, 20, 30];
        expect(immutableDelete(arr, 0)).toEqual([20, 30]);
    });

    it("splices the last element from a cloned array", () => {
        const arr = [10, 20, 30];
        expect(immutableDelete(arr, 2)).toEqual([10, 20]);
    });

    it("does not mutate the original array", () => {
        const arr = ["a", "b", "c"];
        immutableDelete(arr, 1);
        expect(arr).toEqual(["a", "b", "c"]);
    });

    it("returns a new array reference", () => {
        const arr = [1, 2, 3];
        const result = immutableDelete(arr, 0);
        expect(result).not.toBe(arr);
    });

    it("returns a clone when the index is out of bounds", () => {
        const arr = ["x"];
        const result = immutableDelete(arr, 5);
        expect(result).toEqual(["x"]);
        expect(result).not.toBe(arr);
    });

    it("returns a clone for a negative index", () => {
        const arr = [1, 2, 3];
        const result = immutableDelete(arr, -1);
        expect(result).toEqual([1, 2, 3]);
        expect(result).not.toBe(arr);
    });
});
