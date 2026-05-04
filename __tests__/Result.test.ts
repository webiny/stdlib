import { describe, expect, it } from "vitest";
import { Result } from "../src/common/core/Result.js";

describe("Result", () => {
    describe("ok", () => {
        it("creates a successful result with a value", () => {
            const result = Result.ok(42);
            expect(result.isOk()).toBe(true);
            expect(result.isFail()).toBe(false);
            expect(result.value).toBe(42);
        });

        it("creates a successful void result", () => {
            const result = Result.ok();
            expect(result.isOk()).toBe(true);
        });
    });

    describe("fail", () => {
        it("creates a failed result with an error", () => {
            const result = Result.fail("something went wrong");
            expect(result.isFail()).toBe(true);
            expect(result.isOk()).toBe(false);
            expect(result.error).toBe("something went wrong");
        });
    });

    describe("value getter", () => {
        it("throws when called on a failure", () => {
            const result = Result.fail("err");
            expect(() => result.value).toThrow();
        });
    });

    describe("error getter", () => {
        it("throws when called on a success", () => {
            const result = Result.ok(42);
            expect(() => result.error).toThrow();
        });
    });

    describe("map", () => {
        it("transforms the success value", () => {
            const result = Result.ok(2).map(v => v * 3);
            expect(result.value).toBe(6);
        });

        it("passes through failure unchanged", () => {
            const result = Result.fail<string>("err").map(() => "mapped");
            expect(result.error).toBe("err");
        });
    });

    describe("mapError", () => {
        it("transforms the error value", () => {
            const result = Result.fail("err").mapError(e => `wrapped: ${e}`);
            expect(result.error).toBe("wrapped: err");
        });

        it("passes through success unchanged", () => {
            const result = Result.ok(42).mapError(() => "new error");
            expect(result.value).toBe(42);
        });
    });

    describe("flatMap", () => {
        it("chains on success", () => {
            const result = Result.ok(2).flatMap(v => Result.ok(v * 3));
            expect(result.value).toBe(6);
        });

        it("short-circuits on failure", () => {
            const result = Result.fail<string>("err").flatMap(() => Result.ok("mapped"));
            expect(result.error).toBe("err");
        });
    });

    describe("match", () => {
        it("calls the ok handler on success", () => {
            const out = Result.ok(42).match({ ok: v => v * 2, fail: () => 0 });
            expect(out).toBe(84);
        });

        it("calls the fail handler on failure", () => {
            const out = Result.fail("err").match({ ok: () => "ok", fail: e => `fail: ${e}` });
            expect(out).toBe("fail: err");
        });
    });

    describe("UnwrapResult / UnwrapError", () => {
        it("unwraps ok type from a Result-returning promise", () => {
            type R = Result.UnwrapResult<Promise<Result<number, string>>>;
            const _: R = 42;
            expect(_).toBe(42);
        });
    });
});
