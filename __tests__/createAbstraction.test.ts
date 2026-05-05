import { describe, expect, it } from "vitest";
import { Abstraction } from "@webiny/di";
import { createAbstraction } from "../src/common/core/createAbstraction.js";

describe("createAbstraction", () => {
    it("returns an Abstraction instance", () => {
        const token = createAbstraction<{ foo: string }>("Test/Token");
        expect(token).toBeInstanceOf(Abstraction);
    });

    it("includes the name in the string representation", () => {
        const token = createAbstraction<string>("My/Service");
        expect(token.toString()).toContain("My/Service");
    });

    it("creates distinct tokens for different names", () => {
        const a = createAbstraction<string>("Token/A");
        const b = createAbstraction<string>("Token/B");
        expect(a.token).not.toBe(b.token);
    });
});
