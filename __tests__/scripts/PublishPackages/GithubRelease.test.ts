import { describe, it, expect, beforeEach, vi } from "vitest";
import "@webiny/di";
import { Container } from "@webiny/di";
import { ProjectConfig } from "../../../scripts/features/PublishPackages/abstractions/ProjectConfig.ts";
import { GitRepository } from "../../../scripts/features/PublishPackages/abstractions/GitRepository.ts";
import { GithubToken } from "../../../scripts/features/PublishPackages/abstractions/GithubToken.ts";
import { GithubRelease } from "../../../scripts/features/PublishPackages/abstractions/GithubRelease.ts";
import { GithubRelease as GithubReleaseImpl } from "../../../scripts/features/PublishPackages/GithubRelease.ts";

const { mockCreateRelease } = vi.hoisted(() => ({
    mockCreateRelease: vi.fn().mockResolvedValue({})
}));

vi.mock("@octokit/rest", () => {
    class MockOctokit {
        public readonly rest = { repos: { createRelease: mockCreateRelease } };
    }
    return { Octokit: MockOctokit };
});

function makeContainer(opts: {
    dryRun?: boolean;
    remoteUrl?: string;
    token?: string;
}): GithubRelease.Interface {
    const container = new Container();
    container.registerInstance(ProjectConfig, {
        rootDir: "/tmp",
        packageName: "@test/pkg",
        dryRun: opts.dryRun ?? false,
        exactDependencyVersions: false
    });
    container.registerInstance(GitRepository, {
        tagExists: vi.fn(),
        commitsSince: vi.fn(),
        createTag: vi.fn(),
        getRemoteUrl: vi
            .fn()
            .mockReturnValue(opts.remoteUrl ?? "https://github.com/acme/my-repo.git")
    });
    container.registerInstance(GithubToken, {
        getToken: () => opts.token ?? "test-token"
    });
    container.register(GithubReleaseImpl).inSingletonScope();
    return container.resolve(GithubRelease);
}

describe("GithubRelease", () => {
    beforeEach(() => {
        mockCreateRelease.mockClear();
    });

    describe("constructor", () => {
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
                expect(
                    calls.some(
                        msg => msg.includes("would create GitHub release") && msg.includes("v1.2.3")
                    )
                ).toBe(true);
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
