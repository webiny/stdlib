import { describe, expect, it } from "vitest";
import { BaseError } from "../src/core/BaseError.js";

class TestError extends BaseError<{ detail: string }> {
    public readonly code = "TEST_ERROR";

    public constructor(message: string, detail: string) {
        super({ message, data: { detail }, stack: new Error().stack ?? "" });
    }
}

class SimpleError extends BaseError {
    public readonly code = "SIMPLE_ERROR";

    public constructor(message: string) {
        super({ message, stack: new Error().stack ?? "" });
    }
}

describe("BaseError", () => {
    it("exposes message, code, and typed data", () => {
        const err = new TestError("something failed", "extra info");
        expect(err.message).toBe("something failed");
        expect(err.code).toBe("TEST_ERROR");
        expect(err.data).toEqual({ detail: "extra info" });
    });

    it("is instanceof Error and BaseError", () => {
        const err = new TestError("test", "detail");
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(BaseError);
        expect(err).toBeInstanceOf(TestError);
    });

    it("data is undefined when TData is void", () => {
        const err = new SimpleError("oops");
        expect(err.message).toBe("oops");
        expect(err.data).toBeUndefined();
    });
});
