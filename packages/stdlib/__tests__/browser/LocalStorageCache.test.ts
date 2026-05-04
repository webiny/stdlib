// @vitest-environment happy-dom
import { Container } from "@webiny/di";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LocalStorageCache } from "../../src/browser/features/LocalStorageCache/LocalStorageCache.js";
import { Cache } from "../../src/index.js";
import {
    LocalStorageParseError,
    LocalStorageQuotaExceededError,
    LocalStorageUnavailableError
} from "../../src/browser/features/LocalStorageCache/errors.js";

function makeCache(): Cache.Interface {
    const container = new Container();
    container.register(LocalStorageCache).inSingletonScope();
    return container.resolve(Cache);
}

describe("LocalStorageCache", () => {
    let cache: Cache.Interface;

    beforeEach(() => {
        localStorage.clear();
        cache = makeCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        localStorage.clear();
    });

    describe("get", () => {
        it("returns null for a missing key", () => {
            const result = cache.get("missing");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toBeNull();
            }
        });

        it("returns a stored string", () => {
            cache.set("name", "Alice");
            const result = cache.get<string>("name");
            if (result.isOk()) {
                expect(result.value).toBe("Alice");
            }
        });

        it("returns a stored object", () => {
            cache.set("user", { id: 1 });
            const result = cache.get<{ id: number }>("user");
            if (result.isOk()) {
                expect(result.value).toEqual({ id: 1 });
            }
        });

        it("returns PARSE_ERROR for corrupted data", () => {
            localStorage.setItem("bad", "not-json{{{");
            const result = cache.get("bad");
            expect(result.isFail()).toBe(true);
            if (result.isFail()) {
                expect(result.error).toBeInstanceOf(LocalStorageParseError);
                expect(result.error.data).toEqual({ key: "bad" });
            }
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const unavailableCache = makeCache();
            const result = unavailableCache.get("x");
            expect(result.isFail()).toBe(true);
            if (result.isFail()) {
                expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
            }
        });
    });

    describe("set", () => {
        it("stores and retrieves a value", () => {
            cache.set("x", 42);
            const result = cache.get<number>("x");
            if (result.isOk()) {
                expect(result.value).toBe(42);
            }
        });

        it("returns QUOTA_EXCEEDED when storage is full", () => {
            const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
                throw new DOMException("QuotaExceededError");
            });
            try {
                const result = cache.set("x", "value");
                expect(result.isFail()).toBe(true);
                if (result.isFail()) {
                    expect(result.error).toBeInstanceOf(LocalStorageQuotaExceededError);
                }
            } finally {
                spy.mockRestore();
            }
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const unavailableCache = makeCache();
            const result = unavailableCache.set("x", 1);
            expect(result.isFail()).toBe(true);
            if (result.isFail()) {
                expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
            }
        });
    });

    describe("has", () => {
        it("returns false for missing key", () => {
            const result = cache.has("missing");
            if (result.isOk()) {
                expect(result.value).toBe(false);
            }
        });

        it("returns true for existing key", () => {
            cache.set("x", 1);
            const result = cache.has("x");
            if (result.isOk()) {
                expect(result.value).toBe(true);
            }
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const unavailableCache = makeCache();
            const result = unavailableCache.has("x");
            expect(result.isFail()).toBe(true);
            if (result.isFail()) {
                expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
            }
        });
    });

    describe("remove", () => {
        it("removes an existing key", () => {
            cache.set("x", 1);
            cache.remove("x");
            const result = cache.get("x");
            if (result.isOk()) {
                expect(result.value).toBeNull();
            }
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const unavailableCache = makeCache();
            const result = unavailableCache.remove("x");
            expect(result.isFail()).toBe(true);
            if (result.isFail()) {
                expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
            }
        });
    });

    describe("clear", () => {
        it("clears all entries on root cache", () => {
            cache.set("a", 1);
            cache.set("b", 2);
            cache.clear();
            const keys = cache.keys();
            if (keys.isOk()) {
                expect(keys.value).toEqual([]);
            }
        });

        it("clears only prefixed entries on scoped cache", () => {
            cache.set("other", "keep");
            const scoped = cache.byPrefix("app");
            scoped.set("x", 1);
            scoped.clear();
            const scopedKeys = scoped.keys();
            if (scopedKeys.isOk()) {
                expect(scopedKeys.value).toEqual([]);
            }
            const rootGet = cache.get("other");
            if (rootGet.isOk()) {
                expect(rootGet.value).toBe("keep");
            }
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const unavailableCache = makeCache();
            const result = unavailableCache.clear();
            expect(result.isFail()).toBe(true);
            if (result.isFail()) {
                expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
            }
        });
    });

    describe("keys", () => {
        it("returns all keys on root cache", () => {
            cache.set("a", 1);
            cache.set("b", 2);
            const result = cache.keys();
            if (result.isOk()) {
                expect(result.value.sort()).toEqual(["a", "b"]);
            }
        });

        it("returns only scoped keys stripped of prefix", () => {
            const scoped = cache.byPrefix("app");
            scoped.set("x", 1);
            scoped.set("y", 2);
            cache.set("other", 3);
            const result = scoped.keys();
            if (result.isOk()) {
                expect(result.value.sort()).toEqual(["x", "y"]);
            }
        });

        it("returns STORAGE_UNAVAILABLE when localStorage is not available", () => {
            vi.stubGlobal("localStorage", undefined);
            const unavailableCache = makeCache();
            const result = unavailableCache.keys();
            expect(result.isFail()).toBe(true);
            if (result.isFail()) {
                expect(result.error).toBeInstanceOf(LocalStorageUnavailableError);
            }
        });
    });

    describe("getOrSet", () => {
        it("calls factory and stores result when key is missing", () => {
            let calls = 0;
            const result = cache.getOrSet("x", () => {
                calls++;
                return 42;
            });
            if (result.isOk()) {
                expect(result.value).toBe(42);
            }
            expect(calls).toBe(1);
        });

        it("returns existing value without calling factory", () => {
            cache.set("x", 99);
            let calls = 0;
            const result = cache.getOrSet("x", () => {
                calls++;
                return 0;
            });
            if (result.isOk()) {
                expect(result.value).toBe(99);
            }
            expect(calls).toBe(0);
        });
    });

    describe("byPrefix", () => {
        it("scopes reads and writes under the prefix", () => {
            const scoped = cache.byPrefix("ns");
            scoped.set("key", "value");
            const direct = cache.get<string>("ns.key");
            if (direct.isOk()) {
                expect(direct.value).toBe("value");
            }
        });

        it("does not leak keys between prefixes", () => {
            cache.byPrefix("a").set("x", 1);
            const result = cache.byPrefix("b").get("x");
            if (result.isOk()) {
                expect(result.value).toBeNull();
            }
        });

        it("nests prefixes with dot separator", () => {
            const nested = cache.byPrefix("app").byPrefix("user");
            nested.set("name", "Alice");
            const direct = cache.get<string>("app.user.name");
            if (direct.isOk()) {
                expect(direct.value).toBe("Alice");
            }
        });
    });
});
