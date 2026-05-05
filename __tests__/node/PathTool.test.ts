import { beforeEach, describe, expect, it } from "vitest";
import { dirname, join, resolve } from "node:path";
import { Container } from "@webiny/di";
import {
    PathTool,
    PathToolFeature,
    createPathTool
} from "../../src/node/features/PathTool/index.js";
import { PackageNotFoundError } from "../../src/node/features/PathTool/errors.js";

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

    describe("resolvePackageFile", () => {
        it("returns an absolute path for an installed package file", () => {
            const result = tool.resolvePackageFile("vitest/package.json");
            expect(result).toMatch(/node_modules\/vitest\/package\.json$/);
            expect(result.startsWith("/")).toBe(true);
        });

        it("throws PackageNotFoundError when the package is not installed", () => {
            expect(() => tool.resolvePackageFile("@definitely/not-installed/file.json")).toThrow(
                PackageNotFoundError
            );
        });

        it("includes the specifier in PackageNotFoundError.data", () => {
            let caught: PackageNotFoundError | undefined;
            try {
                tool.resolvePackageFile("@definitely/not-installed/file.json");
            } catch (e) {
                if (e instanceof PackageNotFoundError) {
                    caught = e;
                }
            }
            expect(caught?.data.specifier).toBe("@definitely/not-installed/file.json");
        });
    });
});

describe("createPathTool", () => {
    it("creates a working tool without arguments", () => {
        const tool = createPathTool();
        expect(tool.join("a", "b")).toBe(join("a", "b"));
    });
});

describe("PackageNotFoundError", () => {
    it("has code PACKAGE_NOT_FOUND", () => {
        const err = new PackageNotFoundError({
            message: "test",
            data: { specifier: "@foo/bar" },
            stack: new Error().stack ?? ""
        });
        expect(err.code).toBe("PACKAGE_NOT_FOUND");
    });

    it("exposes specifier in data", () => {
        const err = new PackageNotFoundError({
            message: "test",
            data: { specifier: "@foo/bar/file.json" },
            stack: new Error().stack ?? ""
        });
        expect(err.data.specifier).toBe("@foo/bar/file.json");
    });
});
