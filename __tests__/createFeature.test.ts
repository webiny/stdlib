import { describe, expect, it, vi } from "vitest";
import "@webiny/di"; // loads reflect-metadata side-effect
import { createFeature } from "../src/common/core/createFeature.js";
import type { Container } from "@webiny/di";

describe("createFeature", () => {
    it("returns a feature with the correct name", () => {
        const feature = createFeature({ name: "Test/Feature", register: () => {} });
        expect(feature.name).toBe("Test/Feature");
    });

    it("calls register with the container", () => {
        const register = vi.fn();
        const feature = createFeature({ name: "Test/Feature", register });
        const container = {} as Container;
        feature.register(container);
        expect(register).toHaveBeenCalledWith(container);
    });

    it("attaches wby:isFeature metadata", () => {
        const feature = createFeature({ name: "Test/Metadata", register: () => {} });
        expect(Reflect.getMetadata("wby:isFeature", feature)).toBe(true);
    });

    it("supports a typed context parameter", () => {
        interface Ctx {
            level: string;
        }
        const register = vi.fn();
        const feature = createFeature<Ctx>({ name: "Test/Ctx", register });
        const container = {} as Container;
        feature.register(container, { level: "debug" });
        expect(register).toHaveBeenCalledWith(container, { level: "debug" });
    });
});
