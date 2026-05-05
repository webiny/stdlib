import { describe, expect, it } from "vitest";
import * as barrel from "../../src/browser/index.js";

describe("utils-browser barrel", () => {
    it("is importable", () => {
        expect(barrel).toBeDefined();
    });
});
