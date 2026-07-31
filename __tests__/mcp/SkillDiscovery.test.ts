import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import { SkillDiscovery, SkillDiscoveryConfig } from "../../src/mcp/features/Server/index.js";
import { SkillDiscovery as SkillDiscoveryImpl } from "../../src/mcp/features/Server/SkillDiscovery.js";
import type { SkillEntry } from "../../src/mcp/features/Server/abstractions/SkillDiscovery.js";

function makeContainer(manifestPath: string): Container {
    const container = new Container();
    container.registerInstance(SkillDiscoveryConfig, { manifestPath });
    container.register(SkillDiscoveryImpl).inSingletonScope();
    return container;
}

function writeManifest(dir: string, entries: SkillEntry[]): string {
    const manifestPath = join(dir, "skills.json");
    writeFileSync(manifestPath, JSON.stringify(entries));
    return manifestPath;
}

function writeSkillFile(dir: string, relativePath: string, content: string): void {
    const fullPath = join(dir, relativePath);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content);
}

describe("SkillDiscovery", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `wby-mcp-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should list entries from manifest", () => {
        const entries: SkillEntry[] = [
            {
                name: "foo-tool",
                description: "Does foo things.",
                context: "node",
                path: "features/Foo/README.md"
            },
            {
                name: "bar-util",
                description: "Bar utility.",
                context: "common",
                path: "utils/Bar/README.md"
            }
        ];
        const manifestPath = writeManifest(tmpDir, entries);

        const discovery = makeContainer(manifestPath).resolve(SkillDiscovery);
        const result = discovery.list();

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(entries[0]);
        expect(result[1]).toEqual(entries[1]);
    });

    it("should return empty array when manifest does not exist", () => {
        const manifestPath = join(tmpDir, "nonexistent.json");

        const discovery = makeContainer(manifestPath).resolve(SkillDiscovery);
        const result = discovery.list();

        expect(result).toHaveLength(0);
    });

    it("should return empty array for invalid JSON manifest", () => {
        const manifestPath = join(tmpDir, "skills.json");
        writeFileSync(manifestPath, "not json");

        const discovery = makeContainer(manifestPath).resolve(SkillDiscovery);
        const result = discovery.list();

        expect(result).toHaveLength(0);
    });

    it("should load body from file, stripping front-matter", () => {
        writeSkillFile(
            tmpDir,
            "features/Foo/README.md",
            "---\nname: foo-tool\ndescription: Does foo things.\ncontext: node\n---\n\n# FooTool\n\nContent here."
        );
        const manifestPath = writeManifest(tmpDir, [
            {
                name: "foo-tool",
                description: "Does foo things.",
                context: "node",
                path: "features/Foo/README.md"
            }
        ]);

        const discovery = makeContainer(manifestPath).resolve(SkillDiscovery);
        const body = discovery.loadBody("foo-tool");

        expect(body).toBe("# FooTool\n\nContent here.");
    });

    it("should load body from file without front-matter", () => {
        writeSkillFile(tmpDir, "guides/SKILL.md", "# Guide\n\nJust content.");
        const manifestPath = writeManifest(tmpDir, [
            { name: "guide", description: "A guide.", context: "guides", path: "guides/SKILL.md" }
        ]);

        const discovery = makeContainer(manifestPath).resolve(SkillDiscovery);
        const body = discovery.loadBody("guide");

        expect(body).toBe("# Guide\n\nJust content.");
    });

    it("should return null for unknown skill name", () => {
        const manifestPath = writeManifest(tmpDir, [
            { name: "foo", description: "Foo.", context: "common", path: "foo/README.md" }
        ]);

        const discovery = makeContainer(manifestPath).resolve(SkillDiscovery);
        const body = discovery.loadBody("nonexistent");

        expect(body).toBeNull();
    });

    it("should return null when skill file cannot be read", () => {
        const manifestPath = writeManifest(tmpDir, [
            {
                name: "missing",
                description: "Missing file.",
                context: "common",
                path: "missing/README.md"
            }
        ]);

        const discovery = makeContainer(manifestPath).resolve(SkillDiscovery);
        const body = discovery.loadBody("missing");

        expect(body).toBeNull();
    });

    it("should trim body whitespace", () => {
        writeSkillFile(
            tmpDir,
            "features/Trim/README.md",
            "---\nname: trimmed\ndescription: Trim test.\n---\n\n  Body with spaces.  \n\n"
        );
        const manifestPath = writeManifest(tmpDir, [
            {
                name: "trimmed",
                description: "Trim test.",
                context: "common",
                path: "features/Trim/README.md"
            }
        ]);

        const discovery = makeContainer(manifestPath).resolve(SkillDiscovery);
        const body = discovery.loadBody("trimmed");

        expect(body).toBe("Body with spaces.");
    });
});
