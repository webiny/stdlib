import { GithubToken as GithubTokenAbstraction } from "./abstractions/GithubToken.ts";

class GithubTokenImpl implements GithubTokenAbstraction.Interface {
    public getToken(): string {
        const token = process.env["GITHUB_TOKEN"];
        if (!token) {
            throw new Error("GITHUB_TOKEN env var is required to create a GitHub release");
        }
        return token;
    }
}

export const GithubToken = GithubTokenAbstraction.createImplementation({
    implementation: GithubTokenImpl,
    dependencies: []
});
