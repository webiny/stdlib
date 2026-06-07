import { describe, it, expect, vi, afterEach } from "vitest";
import { uuid } from "../src/common/utils/uuid.js";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuid", () => {
    it("returns a string in UUID v4 format", () => {
        const id = uuid();
        expect(id).toMatch(UUID_V4_REGEX);
    });

    it("generates unique values on successive calls", () => {
        const ids = new Set(Array.from({ length: 1000 }, () => uuid()));
        expect(ids.size).toBe(1000);
    });

    it("sets the version nibble to 4", () => {
        const id = uuid();
        expect(id[14]).toBe("4");
    });

    it("sets the variant bits to RFC 4122 (8, 9, a, or b)", () => {
        for (let i = 0; i < 100; i++) {
            const id = uuid();
            expect(["8", "9", "a", "b"]).toContain(id[19]);
        }
    });

    it("returns lowercase hex characters", () => {
        const id = uuid();
        const hexOnly = id.replace(/-/g, "");
        expect(hexOnly).toBe(hexOnly.toLowerCase());
    });

    it("returns a 36-character string with hyphens at positions 8, 13, 18, 23", () => {
        const id = uuid();
        expect(id.length).toBe(36);
        expect(id[8]).toBe("-");
        expect(id[13]).toBe("-");
        expect(id[18]).toBe("-");
        expect(id[23]).toBe("-");
    });

    describe("fallback path", () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("produces valid UUID v4 when crypto.randomUUID is unavailable", () => {
            vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
                throw new Error("not available");
            });
            Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });

            const id = uuid();
            expect(id).toMatch(UUID_V4_REGEX);

            Object.defineProperty(crypto, "randomUUID", {
                value: globalThis.crypto.randomUUID,
                configurable: true
            });
        });

        it("generates unique values via the fallback path", () => {
            const original = crypto.randomUUID;
            Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });

            const ids = new Set(Array.from({ length: 1000 }, () => uuid()));
            expect(ids.size).toBe(1000);

            Object.defineProperty(crypto, "randomUUID", {
                value: original,
                configurable: true
            });
        });
    });
});
