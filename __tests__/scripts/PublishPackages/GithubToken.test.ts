import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "@webiny/di";
import { Container } from "@webiny/di";
import { GithubToken } from "../../../scripts/features/PublishPackages/abstractions/GithubToken.ts";
import { GithubToken as GithubTokenImpl } from "../../../scripts/features/PublishPackages/GithubToken.ts";

function makeToken(): GithubToken.Interface {
    const container = new Container();
    container.register(GithubTokenImpl).inSingletonScope();
    return container.resolve(GithubToken);
}

describe("GithubToken", () => {
    let savedToken: string | undefined;

    beforeEach(() => {
        savedToken = process.env["GITHUB_TOKEN"];
    });

    afterEach(() => {
        if (savedToken === undefined) {
            delete process.env["GITHUB_TOKEN"];
        } else {
            process.env["GITHUB_TOKEN"] = savedToken;
        }
    });

    it("returns the token from GITHUB_TOKEN env var", () => {
        process.env["GITHUB_TOKEN"] = "ghp_test123";
        const token = makeToken();
        expect(token.getToken()).toBe("ghp_test123");
    });

    it("throws when GITHUB_TOKEN is not set", () => {
        delete process.env["GITHUB_TOKEN"];
        const token = makeToken();
        expect(() => token.getToken()).toThrow("GITHUB_TOKEN env var is required");
    });
});
