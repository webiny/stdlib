import { Container } from "@webiny/di";
import { describe, it, expect, beforeEach } from "vitest";
import { AsyncMemoryCache } from "../src/features/Cache/AsyncMemoryCache.js";
import { AsyncCache } from "../src/features/Cache/abstractions/AsyncCache.js";

function makeCache(): AsyncCache.Interface {
    const container = new Container();
    container.register(AsyncMemoryCache).inSingletonScope();
    return container.resolve(AsyncCache);
}

describe("AsyncMemoryCache", () => {
    let cache: AsyncCache.Interface;

    beforeEach(() => {
        cache = makeCache();
    });

    describe("get / set", () => {
        it("returns null for a missing key", async () => {
            const result = await cache.get("missing").unwrap();
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toBeNull();
            }
        });

        it("returns a stored string", async () => {
            await cache.set("name", "Alice").unwrap();
            const result = await cache.get<string>("name").unwrap();
            if (result.isOk()) {
                expect(result.value).toBe("Alice");
            }
        });

        it("returns a stored object", async () => {
            await cache.set("user", { id: 1 }).unwrap();
            const result = await cache.get<{ id: number }>("user").unwrap();
            if (result.isOk()) {
                expect(result.value).toEqual({ id: 1 });
            }
        });
    });

    describe("has", () => {
        it("returns false for a missing key", async () => {
            const result = await cache.has("missing").unwrap();
            if (result.isOk()) {
                expect(result.value).toBe(false);
            }
        });

        it("returns true for an existing key", async () => {
            await cache.set("x", 1).unwrap();
            const result = await cache.has("x").unwrap();
            if (result.isOk()) {
                expect(result.value).toBe(true);
            }
        });
    });

    describe("remove", () => {
        it("removes an existing key", async () => {
            await cache.set("x", 1).unwrap();
            await cache.remove("x").unwrap();
            const result = await cache.get("x").unwrap();
            if (result.isOk()) {
                expect(result.value).toBeNull();
            }
        });
    });

    describe("clear", () => {
        it("removes all entries on root cache", async () => {
            await cache.set("a", 1).unwrap();
            await cache.set("b", 2).unwrap();
            await cache.clear().unwrap();
            const keys = await cache.keys().unwrap();
            if (keys.isOk()) {
                expect(keys.value).toEqual([]);
            }
        });

        it("removes only prefixed entries on scoped cache", async () => {
            await cache.set("other", "keep").unwrap();
            const scoped = cache.byPrefix("app");
            await scoped.set("x", 1).unwrap();
            await scoped.clear().unwrap();
            const scopedKeys = await scoped.keys().unwrap();
            if (scopedKeys.isOk()) {
                expect(scopedKeys.value).toEqual([]);
            }
            const rootGet = await cache.get("other").unwrap();
            if (rootGet.isOk()) {
                expect(rootGet.value).toBe("keep");
            }
        });
    });

    describe("keys", () => {
        it("returns empty array when cache is empty", async () => {
            const result = await cache.keys().unwrap();
            if (result.isOk()) {
                expect(result.value).toEqual([]);
            }
        });

        it("returns only scoped keys stripped of prefix", async () => {
            const scoped = cache.byPrefix("app");
            await scoped.set("x", 1).unwrap();
            await scoped.set("y", 2).unwrap();
            await cache.set("other", 3).unwrap();
            const result = await scoped.keys().unwrap();
            if (result.isOk()) {
                expect(result.value.sort()).toEqual(["x", "y"]);
            }
        });
    });

    describe("getOrSet", () => {
        it("calls sync factory and stores result when key is missing", async () => {
            let calls = 0;
            const result = await cache
                .getOrSet("x", () => {
                    calls++;
                    return 42;
                })
                .unwrap();
            if (result.isOk()) {
                expect(result.value).toBe(42);
            }
            expect(calls).toBe(1);
        });

        it("calls async factory and stores result when key is missing", async () => {
            let calls = 0;
            const result = await cache
                .getOrSet("x", async () => {
                    calls++;
                    return 42;
                })
                .unwrap();
            if (result.isOk()) {
                expect(result.value).toBe(42);
            }
            expect(calls).toBe(1);
        });

        it("returns existing value without calling factory", async () => {
            await cache.set("x", 99).unwrap();
            let calls = 0;
            const result = await cache
                .getOrSet("x", () => {
                    calls++;
                    return 0;
                })
                .unwrap();
            if (result.isOk()) {
                expect(result.value).toBe(99);
            }
            expect(calls).toBe(0);
        });
    });

    describe("byPrefix", () => {
        it("scopes reads and writes under the prefix", async () => {
            const scoped = cache.byPrefix("ns");
            await scoped.set("key", "value").unwrap();
            const direct = await cache.get<string>("ns.key").unwrap();
            if (direct.isOk()) {
                expect(direct.value).toBe("value");
            }
        });

        it("nests prefixes with dot separator", async () => {
            const nested = cache.byPrefix("app").byPrefix("user");
            await nested.set("name", "Alice").unwrap();
            const direct = await cache.get<string>("app.user.name").unwrap();
            if (direct.isOk()) {
                expect(direct.value).toBe("Alice");
            }
        });
    });
});
