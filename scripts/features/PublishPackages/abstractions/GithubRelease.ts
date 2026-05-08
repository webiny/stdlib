import { Abstraction } from "@webiny/di";

export interface IGithubRelease {
    /**
     * Creates a GitHub release for the given tag.
     * In dry-run mode, validates config (token + remote URL) but skips the API call.
     */
    createRelease(tag: string, title: string, body: string): Promise<void>;
}

export const GithubRelease = new Abstraction<IGithubRelease>("Scripts/GithubRelease");

export namespace GithubRelease {
    export type Interface = IGithubRelease;
}
