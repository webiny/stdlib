import { describe, expect, it } from "vitest";
import * as barrel from "../src/index.js";

describe("utils-browser barrel", () => {
    it("is importable", () => {
        expect(barrel).toBeDefined();
    });
});
