import { Abstraction } from "@webiny/di";

export interface IGithubToken {
    /** Returns the GitHub personal access token. Throws if unavailable. */
    getToken(): string;
}

export const GithubToken = new Abstraction<IGithubToken>("Scripts/GithubToken");

export namespace GithubToken {
    export type Interface = IGithubToken;
}
