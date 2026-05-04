import { describe, expect, it } from "vitest";
import { Result } from "../src/core/Result.js";
import { ResultAsync } from "../src/core/ResultAsync.js";

describe("ResultAsync", () => {
    describe("ok", () => {
        it("wraps a successful value", async () => {
            const result = await ResultAsync.ok(42).unwrap();
            expect(result.isOk()).toBe(true);
            expect(result.value).toBe(42);
        });
    });

    describe("fail", () => {
        it("wraps a failure", async () => {
            const result = await ResultAsync.fail("err").unwrap();
            expect(result.isFail()).toBe(true);
            expect(result.error).toBe("err");
        });
    });

    describe("from", () => {
        it("wraps a promise returning Result", async () => {
            const result = await ResultAsync.from(() => Promise.resolve(Result.ok(42))).unwrap();
            expect(result.value).toBe(42);
        });
    });

    describe("mapAsync", () => {
        it("transforms the success value", async () => {
            const result = await ResultAsync.ok(2)
                .mapAsync(v => v * 3)
                .unwrap();
            expect(result.value).toBe(6);
        });

        it("supports async transform functions", async () => {
            const result = await ResultAsync.ok(2)
                .mapAsync(async v => v * 3)
                .unwrap();
            expect(result.value).toBe(6);
        });

        it("passes through failure", async () => {
            const result = await ResultAsync.fail<string>("err")
                .mapAsync(() => "mapped")
                .unwrap();
            expect(result.error).toBe("err");
        });
    });

    describe("mapErrorAsync", () => {
        it("transforms the error value", async () => {
            const result = await ResultAsync.fail("err")
                .mapErrorAsync(e => `wrapped: ${e}`)
                .unwrap();
            expect(result.error).toBe("wrapped: err");
        });

        it("passes through success", async () => {
            const result = await ResultAsync.ok(42)
                .mapErrorAsync(() => "new error")
                .unwrap();
            expect(result.value).toBe(42);
        });
    });

    describe("flatMapAsync", () => {
        it("chains successful results", async () => {
            const result = await ResultAsync.ok(2)
                .flatMapAsync(v => ResultAsync.ok(v * 3))
                .unwrap();
            expect(result.value).toBe(6);
        });

        it("short-circuits on failure", async () => {
            const result = await ResultAsync.fail<string>("err")
                .flatMapAsync(() => ResultAsync.ok("mapped"))
                .unwrap();
            expect(result.error).toBe("err");
        });
    });

    describe("match", () => {
        it("resolves with the ok handler on success", async () => {
            const value = await ResultAsync.ok(42).match({ ok: v => v * 2, fail: () => 0 });
            expect(value).toBe(84);
        });

        it("resolves with the fail handler on failure", async () => {
            const value = await ResultAsync.fail("err").match({
                ok: () => "ok",
                fail: e => `fail: ${e}`
            });
            expect(value).toBe("fail: err");
        });
    });
});
