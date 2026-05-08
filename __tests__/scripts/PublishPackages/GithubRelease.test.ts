import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@webiny/di"; // loads reflect-metadata side-effect
import { Container } from "@webiny/di";
import { ProjectConfig } from "../../../scripts/features/PublishPackages/abstractions/ProjectConfig.ts";
import { GitRepository } from "../../../scripts/features/PublishPackages/abstractions/GitRepository.ts";
import { GithubRelease } from "../../../scripts/features/PublishPackages/abstractions/GithubRelease.ts";
import { GithubRelease as GithubReleaseImpl } from "../../../scripts/features/PublishPackages/GithubRelease.ts";

// Hoist mock functions so they are available both inside vi.mock factory and in tests.
const { mockCreateRelease } = vi.hoisted(() => ({
    mockCreateRelease: vi.fn().mockResolvedValue({})
}));

vi.mock("@octokit/rest", () => {
    class MockOctokit {
        public readonly rest = { repos: { createRelease: mockCreateRelease } };
    }
    return { Octokit: MockOctokit };
});

/**
 * Builds a DI container with mock ProjectConfig and GitRepository instances,
 * registers GithubReleaseImpl, and returns the resolved IGithubRelease.
 */
function makeContainer(opts: { dryRun?: boolean; remoteUrl?: string }): GithubRelease.Interface {
    const container = new Container();
    container.registerInstance(ProjectConfig, {
        rootDir: "/tmp",
        packageName: "@test/pkg",
        dryRun: opts.dryRun ?? false
    });
    container.registerInstance(GitRepository, {
        tagExists: vi.fn(),
        commitsSince: vi.fn(),
        createTag: vi.fn(),
        getRemoteUrl: vi
            .fn()
            .mockReturnValue(opts.remoteUrl ?? "https://github.com/acme/my-repo.git")
    });
    container.register(GithubReleaseImpl).inSingletonScope();
    return container.resolve(GithubRelease);
}

describe("GithubRelease", () => {
    let savedToken: string | undefined;

    beforeEach(() => {
        savedToken = process.env["GITHUB_TOKEN"];
        process.env["GITHUB_TOKEN"] = "test-token";
        mockCreateRelease.mockClear();
    });

    afterEach(() => {
        if (savedToken === undefined) {
            delete process.env["GITHUB_TOKEN"];
        } else {
            process.env["GITHUB_TOKEN"] = savedToken;
        }
    });

    describe("constructor", () => {
        it("throws when GITHUB_TOKEN is not set", () => {
            delete process.env["GITHUB_TOKEN"];
            expect(() => makeContainer({})).toThrow("GITHUB_TOKEN env var is required");
        });

        it("parses HTTPS remote URL without throwing", () => {
            expect(() =>
                makeContainer({ remoteUrl: "https://github.com/acme/my-repo.git" })
            ).not.toThrow();
        });

        it("parses SSH remote URL without throwing", () => {
            expect(() =>
                makeContainer({ remoteUrl: "git@github.com:acme/my-repo.git" })
            ).not.toThrow();
        });

        it("throws for unrecognised remote URL", () => {
            expect(() => makeContainer({ remoteUrl: "https://gitlab.com/acme/repo.git" })).toThrow(
                "Cannot parse GitHub owner/repo"
            );
        });
    });

    describe("createRelease", () => {
        it("dry-run: logs and skips API call", async () => {
            const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
            try {
                const release = makeContainer({ dryRun: true });
                await release.createRelease("v1.2.3", "v1.2.3", "body");

                expect(mockCreateRelease).not.toHaveBeenCalled();
                const calls = logSpy.mock.calls.map(args => args.join(" "));
                const hasExpectedLog = calls.some(
                    msg => msg.includes("would create GitHub release") && msg.includes("v1.2.3")
                );
                expect(hasExpectedLog).toBe(true);
            } finally {
                logSpy.mockRestore();
            }
        });

        it("real publish: calls Octokit with correct params", async () => {
            const release = makeContainer({ dryRun: false });
            await release.createRelease("v1.2.3", "v1.2.3", "body text");

            expect(mockCreateRelease).toHaveBeenCalledOnce();
            expect(mockCreateRelease).toHaveBeenCalledWith({
                owner: "acme",
                repo: "my-repo",
                tag_name: "v1.2.3",
                name: "v1.2.3",
                body: "body text"
            });
        });
    });
});
