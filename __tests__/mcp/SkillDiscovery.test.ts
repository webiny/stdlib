import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Container } from "@webiny/di";
import { SkillDiscovery, SkillDiscoveryConfig } from "../../src/mcp/features/Server/index.js";
import { SkillDiscovery as SkillDiscoveryImpl } from "../../src/mcp/features/Server/SkillDiscovery.js";
import type { Skill } from "../../src/mcp/features/Server/abstractions/SkillDiscovery.js";

function makeContainer(scanPaths: string[]): Container {
    const container = new Container();
    container.registerInstance(SkillDiscoveryConfig, { scanPaths });
    container.register(SkillDiscoveryImpl).inSingletonScope();
    return container;
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

    it("should parse valid front-matter from README.md", () => {
        const dir = join(tmpDir, "features", "Foo");
        mkdirSync(dir, { recursive: true });
        writeFileSync(
            join(dir, "README.md"),
            "---\nname: foo-tool\ndescription: Does foo things.\ncontext: node\n---\n\n# FooTool\n\nContent here."
        );

        const discovery = makeContainer([tmpDir]).resolve(SkillDiscovery);
        const skills: Skill[] = discovery.discover();

        expect(skills).toHaveLength(1);
        expect(skills[0]).toEqual({
            name: "foo-tool",
            description: "Does foo things.",
            context: "node",
            body: "# FooTool\n\nContent here."
        });
    });

    it("should default context to common when omitted", () => {
        mkdirSync(join(tmpDir, "a"), { recursive: true });
        writeFileSync(
            join(tmpDir, "a", "README.md"),
            "---\nname: bar\ndescription: Bar desc.\n---\n\nBody."
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills[0]!.context).toBe("common");
    });

    it("should skip files without front-matter", () => {
        mkdirSync(join(tmpDir, "b"), { recursive: true });
        writeFileSync(join(tmpDir, "b", "README.md"), "# No front-matter\n\nJust content.");

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
    });

    it("should skip files with missing name", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mkdirSync(join(tmpDir, "c"), { recursive: true });
        writeFileSync(
            join(tmpDir, "c", "README.md"),
            "---\ndescription: Missing name.\n---\n\nBody."
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("should skip files with missing description", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mkdirSync(join(tmpDir, "d"), { recursive: true });
        writeFileSync(join(tmpDir, "d", "README.md"), "---\nname: no-desc\n---\n\nBody.");

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("should skip files with empty name", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mkdirSync(join(tmpDir, "e"), { recursive: true });
        writeFileSync(
            join(tmpDir, "e", "README.md"),
            '---\nname: ""\ndescription: Empty name.\n---\n\nBody.'
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
        spy.mockRestore();
    });

    it("should skip files with non-string name", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mkdirSync(join(tmpDir, "f"), { recursive: true });
        writeFileSync(
            join(tmpDir, "f", "README.md"),
            "---\nname: 42\ndescription: Numeric name.\n---\n\nBody."
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
        spy.mockRestore();
    });

    it("should discover SKILL.md files", () => {
        mkdirSync(join(tmpDir, "guides"), { recursive: true });
        writeFileSync(
            join(tmpDir, "guides", "SKILL.md"),
            "---\nname: di-patterns\ndescription: DI guide.\ncontext: guides\n---\n\n# DI"
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(1);
        expect(skills[0]!.name).toBe("di-patterns");
    });

    it("should handle name collision with first-match-wins", () => {
        const dir1 = join(tmpDir, "first");
        const dir2 = join(tmpDir, "second");
        mkdirSync(dir1, { recursive: true });
        mkdirSync(dir2, { recursive: true });
        writeFileSync(
            join(dir1, "SKILL.md"),
            "---\nname: dupe\ndescription: First.\n---\n\nFirst body."
        );
        writeFileSync(
            join(dir2, "SKILL.md"),
            "---\nname: dupe\ndescription: Second.\n---\n\nSecond body."
        );

        const skills = makeContainer([dir1, dir2]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(1);
        expect(skills[0]!.description).toBe("First.");
    });

    it("should return empty array for empty directory", () => {
        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
    });

    it("should skip missing directories silently", () => {
        const missing = join(tmpDir, "nonexistent");
        const skills = makeContainer([missing]).resolve(SkillDiscovery).discover();

        expect(skills).toHaveLength(0);
    });

    it("should trim body whitespace", () => {
        mkdirSync(join(tmpDir, "g"), { recursive: true });
        writeFileSync(
            join(tmpDir, "g", "README.md"),
            "---\nname: trimmed\ndescription: Trim test.\n---\n\n  Body with spaces.  \n\n"
        );

        const skills = makeContainer([tmpDir]).resolve(SkillDiscovery).discover();

        expect(skills[0]!.body).toBe("Body with spaces.");
    });
});
