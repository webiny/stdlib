import { describe, it, expect } from "vitest";
import { mdbid } from "../src/common/utils/mdbid/mdbid.js";

const OBJECTID_REGEX = /^[0-9a-f]{24}$/;

describe("mdbid", () => {
    it("returns a 24-character lowercase hex string", () => {
        const id = mdbid();
        expect(id).toMatch(OBJECTID_REGEX);
    });

    it("generates unique values on successive calls", () => {
        const ids = new Set(Array.from({ length: 1000 }, () => mdbid()));
        expect(ids.size).toBe(1000);
    });

    it("returns a string, not an ObjectID instance", () => {
        const id = mdbid();
        expect(typeof id).toBe("string");
    });

    it("has exactly 24 characters", () => {
        const id = mdbid();
        expect(id.length).toBe(24);
    });

    it("contains only lowercase hex characters", () => {
        const id = mdbid();
        expect(id).toBe(id.toLowerCase());
    });
});
