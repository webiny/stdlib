import { Octokit } from "@octokit/rest";
import { GithubRelease as GithubReleaseAbstraction } from "./abstractions/GithubRelease.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import { GitRepository } from "./abstractions/GitRepository.ts";
import { GithubToken } from "./abstractions/GithubToken.ts";

const HTTPS_RE = /https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/;
const SSH_RE = /git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/;

function parseGithubRepo(url: string): { owner: string; repo: string } {
    const https = HTTPS_RE.exec(url);
    if (https) {
        return { owner: https[1]!, repo: https[2]! };
    }
    const ssh = SSH_RE.exec(url);
    if (ssh) {
        return { owner: ssh[1]!, repo: ssh[2]! };
    }
    throw new Error(`Cannot parse GitHub owner/repo from remote URL: ${url}`);
}

class GithubReleaseImpl implements GithubReleaseAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;
    private readonly owner: string;
    private readonly repo: string;
    private readonly octokit: Octokit;

    public constructor(
        config: ProjectConfig.Interface,
        git: GitRepository.Interface,
        token: GithubToken.Interface
    ) {
        this.config = config;
        const url = git.getRemoteUrl("origin");
        const { owner, repo } = parseGithubRepo(url);
        this.owner = owner;
        this.repo = repo;
        this.octokit = new Octokit({ auth: token.getToken() });
    }

    public async createRelease(tag: string, title: string, body: string): Promise<void> {
        if (this.config.dryRun) {
            console.log(
                `[dry run] would create GitHub release ${tag} for ${this.owner}/${this.repo}`
            );
            return;
        }

        await this.octokit.rest.repos.createRelease({
            owner: this.owner,
            repo: this.repo,
            tag_name: tag,
            name: title,
            body
        });
        console.log(`Created GitHub release ${tag} for ${this.owner}/${this.repo}`);
    }
}

export const GithubRelease = GithubReleaseAbstraction.createImplementation({
    implementation: GithubReleaseImpl,
    dependencies: [ProjectConfig, GitRepository, GithubToken]
});
