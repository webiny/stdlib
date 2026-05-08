import { execFileSync } from "node:child_process";
import { GitRepository as GitRepositoryAbstraction } from "./abstractions/GitRepository.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";

class GitRepositoryImpl implements GitRepositoryAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;

    public constructor(config: ProjectConfig.Interface) {
        this.config = config;
    }

    public tagExists(tag: string): boolean {
        try {
            execFileSync("git", ["rev-parse", "--verify", tag], {
                cwd: this.config.rootDir,
                stdio: "pipe"
            });
            return true;
        } catch {
            return false;
        }
    }

    public commitsSince(ref: string | null): string[] {
        const args = ref ? ["log", `${ref}..HEAD`, "--format=%s"] : ["log", "--format=%s"];
        return execFileSync("git", args, { cwd: this.config.rootDir, encoding: "utf8" })
            .trim()
            .split("\n")
            .filter(Boolean);
    }

    public createTag(tag: string): void {
        execFileSync("git", ["tag", tag], { cwd: this.config.rootDir });
    }

    public getRemoteUrl(name: string): string {
        return execFileSync("git", ["remote", "get-url", name], {
            cwd: this.config.rootDir,
            encoding: "utf8"
        }).trim();
    }
}

export const GitRepository = GitRepositoryAbstraction.createImplementation({
    implementation: GitRepositoryImpl,
    dependencies: [ProjectConfig]
});
