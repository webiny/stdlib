import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import {
    PackageJsonFileTool,
    PackageJsonFileToolFeature,
    PackageJsonFile,
    createPackageJsonFileTool
} from "../../src/node/features/PackageJsonFileTool/index.js";
import { FileToolFeature } from "../../src/node/features/FileTool/index.js";
import { DirectoryToolFeature } from "../../src/node/features/DirectoryTool/index.js";
import { PinoLoggerConfig, PinoLoggerFeature } from "../../src/node/features/PinoLogger/index.js";

function makeContainer(): Container {
    const container = new Container();
    container.registerInstance(PinoLoggerConfig, {
        getConfig: () => ({ logLevel: "error" as const, transport: "json" as const })
    });
    PinoLoggerFeature.register(container);
    DirectoryToolFeature.register(container);
    FileToolFeature.register(container);
    PackageJsonFileToolFeature.register(container);
    return container;
}

describe("PackageJsonFileTool", () => {
    let tmpDir: string;
    let tool: PackageJsonFileTool.Interface;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-pkgjson-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
        tool = createPackageJsonFileTool();
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    describe("read", () => {
        it("returns null when the file does not exist", () => {
            expect(tool.read(join(tmpDir, "package.json"))).toBeNull();
        });

        it("returns a PackageJsonFile instance with the correct path", () => {
            const file = join(tmpDir, "package.json");
            writeFileSync(file, JSON.stringify({ name: "my-pkg" }));
            const result = tool.read(file);
            expect(result).toBeInstanceOf(PackageJsonFile);
            expect(result?.path).toBe(file);
        });

        it("exposes parsed data on raw", () => {
            const file = join(tmpDir, "package.json");
            writeFileSync(file, JSON.stringify({ name: "my-pkg", version: "1.0.0" }));
            expect(tool.read(file)?.raw).toMatchObject({ name: "my-pkg", version: "1.0.0" });
        });

        it("passes through unknown fields", () => {
            const file = join(tmpDir, "package.json");
            writeFileSync(
                file,
                JSON.stringify({ name: "pkg", exports: { ".": "./dist/index.js" }, custom: true })
            );
            expect(tool.read(file)?.raw).toMatchObject({
                exports: { ".": "./dist/index.js" },
                custom: true
            });
        });

        it("throws on invalid JSON", () => {
            const file = join(tmpDir, "package.json");
            writeFileSync(file, "not valid json");
            expect(() => tool.read(file)).toThrow();
        });

        it("throws when a known field has the wrong type", () => {
            const file = join(tmpDir, "package.json");
            writeFileSync(file, JSON.stringify({ name: 42 }));
            expect(() => tool.read(file)).toThrow();
        });
    });

    describe("readOrThrow", () => {
        it("throws when the file does not exist", () => {
            expect(() => tool.readOrThrow(join(tmpDir, "package.json"))).toThrow();
        });

        it("returns a PackageJsonFile instance", () => {
            const file = join(tmpDir, "package.json");
            writeFileSync(file, JSON.stringify({ name: "pkg", version: "0.0.1" }));
            const result = tool.readOrThrow(file);
            expect(result).toBeInstanceOf(PackageJsonFile);
            expect(result.path).toBe(file);
            expect(result.raw).toMatchObject({ name: "pkg", version: "0.0.1" });
        });

        it("throws on Zod validation failure", () => {
            const file = join(tmpDir, "package.json");
            writeFileSync(file, JSON.stringify({ version: 123 }));
            expect(() => tool.readOrThrow(file)).toThrow();
        });
    });

    describe("write(path, data)", () => {
        it("writes formatted JSON to the given path", () => {
            const file = join(tmpDir, "package.json");
            tool.write(file, { name: "written-pkg", version: "1.0.0" });
            expect(tool.readOrThrow(file).raw).toMatchObject({
                name: "written-pkg",
                version: "1.0.0"
            });
        });

        it("creates parent directories as needed", () => {
            const file = join(tmpDir, "nested", "dir", "package.json");
            tool.write(file, { name: "nested-pkg" });
            expect(tool.readOrThrow(file).raw).toMatchObject({ name: "nested-pkg" });
        });
    });

    describe("write(file)", () => {
        it("uses path and raw from the PackageJsonFile instance", () => {
            const filePath = join(tmpDir, "package.json");
            const pkgFile = tool.readOrThrow(
                (() => {
                    writeFileSync(filePath, JSON.stringify({ name: "orig" }));
                    return filePath;
                })()
            );
            pkgFile.set("name", "mutated");
            tool.write(pkgFile);
            expect(tool.readOrThrow(filePath).raw.name).toBe("mutated");
        });

        it("round-trips a mutated file back to disk", () => {
            const filePath = join(tmpDir, "package.json");
            writeFileSync(
                filePath,
                JSON.stringify({ name: "pkg", dependencies: { lodash: "^4.0.0" } })
            );
            const pkgFile = tool.readOrThrow(filePath);
            pkgFile.setDependency("zod", "^4.0.0");
            pkgFile.removeDependency("lodash");
            tool.write(pkgFile);
            const reloaded = tool.readOrThrow(filePath);
            expect(reloaded.getDependency("zod")).toBe("^4.0.0");
            expect(reloaded.getDependency("lodash")).toBeNull();
        });
    });

    describe("writeOrThrow(path, data)", () => {
        it("writes formatted JSON to the given path", () => {
            const file = join(tmpDir, "package.json");
            tool.writeOrThrow(file, { name: "thrown-pkg", version: "3.0.0" });
            expect(tool.readOrThrow(file).raw).toMatchObject({ name: "thrown-pkg" });
        });

        it("creates parent directories as needed", () => {
            const file = join(tmpDir, "deep", "package.json");
            tool.writeOrThrow(file, { name: "deep-pkg" });
            expect(tool.readOrThrow(file).raw).toMatchObject({ name: "deep-pkg" });
        });
    });

    describe("writeOrThrow(file)", () => {
        it("uses path and raw from the PackageJsonFile instance", () => {
            const filePath = join(tmpDir, "package.json");
            writeFileSync(filePath, JSON.stringify({ name: "orig" }));
            const pkgFile = tool.readOrThrow(filePath);
            pkgFile.set("version", "9.9.9");
            tool.writeOrThrow(pkgFile);
            expect(tool.readOrThrow(filePath).getVersion()).toBe("9.9.9");
        });
    });

    describe("createPackageJsonFileTool", () => {
        it("works without arguments", () => {
            const t = createPackageJsonFileTool();
            expect(typeof t.read).toBe("function");
            expect(typeof t.readOrThrow).toBe("function");
            expect(typeof t.write).toBe("function");
            expect(typeof t.writeOrThrow).toBe("function");
        });
    });

    describe("DI wiring", () => {
        it("resolves from container and returns a PackageJsonFile", () => {
            const file = join(tmpDir, "package.json");
            writeFileSync(file, JSON.stringify({ name: "di-pkg" }));
            const t = makeContainer().resolve(PackageJsonFileTool);
            expect(t.readOrThrow(file)).toBeInstanceOf(PackageJsonFile);
        });
    });
});

describe("PackageJsonFile", () => {
    it("getDependencies returns empty object when absent", () => {
        const f = new PackageJsonFile("/p", {});
        expect(f.getDependencies()).toEqual({});
    });

    it("setDependency / getDependency / removeDependency", () => {
        const f = new PackageJsonFile("/p", {});
        f.setDependency("lodash", "^4.0.0");
        expect(f.getDependency("lodash")).toBe("^4.0.0");
        f.removeDependency("lodash");
        expect(f.getDependency("lodash")).toBeNull();
    });

    it("devDependency methods work correctly", () => {
        const f = new PackageJsonFile("/p", {});
        f.setDevDependency("vitest", "^4.0.0");
        expect(f.getDevDependency("vitest")).toBe("^4.0.0");
        expect(f.getDevDependencies()).toEqual({ vitest: "^4.0.0" });
        f.removeDevDependency("vitest");
        expect(f.getDevDependency("vitest")).toBeNull();
    });

    it("peerDependency methods work correctly", () => {
        const f = new PackageJsonFile("/p", {});
        f.setPeerDependency("react", ">=18");
        expect(f.getPeerDependency("react")).toBe(">=18");
        f.removePeerDependency("react");
        expect(f.getPeerDependency("react")).toBeNull();
    });

    it("resolution methods work correctly", () => {
        const f = new PackageJsonFile("/p", {});
        f.setResolution("lodash", "4.17.21");
        expect(f.getResolution("lodash")).toBe("4.17.21");
        f.removeResolution("lodash");
        expect(f.getResolution("lodash")).toBeNull();
    });

    it("getVersion returns version or null", () => {
        expect(new PackageJsonFile("/p", { version: "1.2.3" }).getVersion()).toBe("1.2.3");
        expect(new PackageJsonFile("/p", {}).getVersion()).toBeNull();
    });

    it("get returns null for absent keys", () => {
        expect(new PackageJsonFile("/p", {}).get("missing")).toBeNull();
    });

    it("set writes an arbitrary top-level field", () => {
        const f = new PackageJsonFile("/p", {});
        f.set("custom", { x: 1 });
        expect(f.get("custom")).toEqual({ x: 1 });
    });

    it("getDependencies returns a shallow copy, not a live reference", () => {
        const f = new PackageJsonFile("/p", { dependencies: { a: "1" } });
        const copy = f.getDependencies();
        copy["b"] = "2";
        expect(f.getDependency("b")).toBeNull();
    });
});
