import { beforeEach, describe, expect, it } from "vitest";
import { dirname, join, resolve } from "node:path";
import { Container } from "@webiny/di";
import { PathTool, PathToolFeature, createPathTool } from "../src/features/PathTool/index.js";

function makeContainer(): Container {
    const container = new Container();
    PathToolFeature.register(container);
    return container;
}

describe("PathTool", () => {
    let tool: PathTool.Interface;

    beforeEach(() => {
        tool = makeContainer().resolve(PathTool);
    });

    describe("join", () => {
        it("joins multiple path segments", () => {
            expect(tool.join("a", "b", "c")).toBe(join("a", "b", "c"));
        });

        it("normalises redundant separators", () => {
            expect(tool.join("a", "", "b")).toBe(join("a", "", "b"));
        });
    });

    describe("resolve", () => {
        it("returns an absolute path from relative segments", () => {
            expect(tool.resolve("foo", "bar")).toBe(resolve("foo", "bar"));
        });

        it("treats an absolute segment as a new root", () => {
            expect(tool.resolve("/a", "/b")).toBe(resolve("/a", "/b"));
        });
    });

    describe("dirname", () => {
        it("returns the parent directory of a path", () => {
            expect(tool.dirname("/a/b/c.ts")).toBe(dirname("/a/b/c.ts"));
        });

        it("returns '.' for a bare filename", () => {
            expect(tool.dirname("file.txt")).toBe(".");
        });
    });

    describe("basename", () => {
        it("returns the last path segment", () => {
            expect(tool.basename("/a/b/c.ts")).toBe("c.ts");
        });

        it("strips the extension when ext is provided", () => {
            expect(tool.basename("/a/b/c.ts", ".ts")).toBe("c");
        });
    });
});

describe("createPathTool", () => {
    it("creates a working tool without arguments", () => {
        const tool = createPathTool();
        expect(tool.join("a", "b")).toBe(join("a", "b"));
    });
});
