import { describe, it, expect } from "vitest";
import {
    generateId,
    generateAlphaNumericId,
    generateAlphaNumericLowerCaseId,
    generateAlphaId,
    generateAlphaLowerCaseId,
    generateAlphaUpperCaseId
} from "../src/common/utils/generateId/generateId.js";

const DEFAULT_SIZE = 21;

describe("generateId", () => {
    it("returns a string of default length", () => {
        const id = generateId();
        expect(typeof id).toBe("string");
        expect(id.length).toBe(DEFAULT_SIZE);
    });

    it("accepts a custom size", () => {
        const id = generateId(10);
        expect(id.length).toBe(10);
    });

    it("generates unique values on successive calls", () => {
        const ids = new Set(Array.from({ length: 1000 }, () => generateId()));
        expect(ids.size).toBe(1000);
    });
});

describe("generateAlphaNumericId", () => {
    it("returns a string of default length", () => {
        const id = generateAlphaNumericId();
        expect(typeof id).toBe("string");
        expect(id.length).toBe(DEFAULT_SIZE);
    });

    it("contains only alphanumeric characters", () => {
        const id = generateAlphaNumericId();
        expect(id).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it("accepts a custom size", () => {
        const id = generateAlphaNumericId(10);
        expect(id.length).toBe(10);
    });

    it("generates unique values on successive calls", () => {
        const ids = new Set(Array.from({ length: 1000 }, () => generateAlphaNumericId()));
        expect(ids.size).toBe(1000);
    });
});

describe("generateAlphaNumericLowerCaseId", () => {
    it("returns a string of default length", () => {
        const id = generateAlphaNumericLowerCaseId();
        expect(typeof id).toBe("string");
        expect(id.length).toBe(DEFAULT_SIZE);
    });

    it("contains only lowercase alphanumeric characters", () => {
        const id = generateAlphaNumericLowerCaseId();
        expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it("accepts a custom size", () => {
        const id = generateAlphaNumericLowerCaseId(10);
        expect(id.length).toBe(10);
    });

    it("generates unique values on successive calls", () => {
        const ids = new Set(Array.from({ length: 1000 }, () => generateAlphaNumericLowerCaseId()));
        expect(ids.size).toBe(1000);
    });
});

describe("generateAlphaId", () => {
    it("returns a string of default length", () => {
        const id = generateAlphaId();
        expect(typeof id).toBe("string");
        expect(id.length).toBe(DEFAULT_SIZE);
    });

    it("contains only alphabetic characters", () => {
        const id = generateAlphaId();
        expect(id).toMatch(/^[a-zA-Z]+$/);
    });

    it("accepts a custom size", () => {
        const id = generateAlphaId(10);
        expect(id.length).toBe(10);
    });

    it("generates unique values on successive calls", () => {
        const ids = new Set(Array.from({ length: 1000 }, () => generateAlphaId()));
        expect(ids.size).toBe(1000);
    });
});

describe("generateAlphaLowerCaseId", () => {
    it("returns a string of default length", () => {
        const id = generateAlphaLowerCaseId();
        expect(typeof id).toBe("string");
        expect(id.length).toBe(DEFAULT_SIZE);
    });

    it("contains only lowercase alphabetic characters", () => {
        const id = generateAlphaLowerCaseId();
        expect(id).toMatch(/^[a-z]+$/);
    });

    it("accepts a custom size", () => {
        const id = generateAlphaLowerCaseId(10);
        expect(id.length).toBe(10);
    });

    it("generates unique values on successive calls", () => {
        const ids = new Set(Array.from({ length: 1000 }, () => generateAlphaLowerCaseId()));
        expect(ids.size).toBe(1000);
    });
});

describe("generateAlphaUpperCaseId", () => {
    it("returns a string of default length", () => {
        const id = generateAlphaUpperCaseId();
        expect(typeof id).toBe("string");
        expect(id.length).toBe(DEFAULT_SIZE);
    });

    it("contains only uppercase alphabetic characters", () => {
        const id = generateAlphaUpperCaseId();
        expect(id).toMatch(/^[A-Z]+$/);
    });

    it("accepts a custom size", () => {
        const id = generateAlphaUpperCaseId(10);
        expect(id.length).toBe(10);
    });

    it("generates unique values on successive calls", () => {
        const ids = new Set(Array.from({ length: 1000 }, () => generateAlphaUpperCaseId()));
        expect(ids.size).toBe(1000);
    });
});
