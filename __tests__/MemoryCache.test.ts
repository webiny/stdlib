import { Container } from "@webiny/di";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryCache } from "../src/features/Cache/MemoryCache.js";
import { Cache } from "../src/features/Cache/abstractions/Cache.js";

function makeCache(): Cache.Interface {
    const container = new Container();
    container.register(MemoryCache).inSingletonScope();
    return container.resolve(Cache);
}

describe("MemoryCache", () => {
    let cache: Cache.Interface;

    beforeEach(() => {
        cache = makeCache();
    });

    describe("get / set", () => {
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
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toBe("Alice");
            }
        });

        it("returns a stored object", () => {
            cache.set("user", { id: 1, name: "Alice" });
            const result = cache.get<{ id: number; name: string }>("user");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toEqual({ id: 1, name: "Alice" });
            }
        });

        it("overwrites an existing key", () => {
            cache.set("x", 1);
            cache.set("x", 2);
            const result = cache.get<number>("x");
            if (result.isOk()) {
                expect(result.value).toBe(2);
            }
        });
    });

    describe("has", () => {
        it("returns false for a missing key", () => {
            const result = cache.has("missing");
            if (result.isOk()) {
                expect(result.value).toBe(false);
            }
        });

        it("returns true for an existing key", () => {
            cache.set("x", 1);
            const result = cache.has("x");
            if (result.isOk()) {
                expect(result.value).toBe(true);
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

        it("is a no-op for missing key", () => {
            expect(() => cache.remove("missing")).not.toThrow();
        });
    });

    describe("clear", () => {
        it("removes all entries on a root cache", () => {
            cache.set("a", 1);
            cache.set("b", 2);
            cache.clear();
            const keys = cache.keys();
            if (keys.isOk()) {
                expect(keys.value).toEqual([]);
            }
        });

        it("removes only prefixed entries on a scoped cache", () => {
            cache.set("other", "keep");
            const scoped = cache.byPrefix("app");
            scoped.set("x", 1);
            scoped.set("y", 2);
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
    });

    describe("keys", () => {
        it("returns empty array when cache is empty", () => {
            const result = cache.keys();
            if (result.isOk()) {
                expect(result.value).toEqual([]);
            }
        });

        it("returns all stored keys on root cache", () => {
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
    });

    describe("getOrSet", () => {
        it("calls factory and stores result when key is missing", () => {
            let calls = 0;
            const result = cache.getOrSet("x", () => {
                calls++;
                return 42;
            });
            expect(result.isOk()).toBe(true);
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
