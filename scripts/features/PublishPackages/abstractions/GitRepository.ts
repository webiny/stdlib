import { Abstraction } from "@webiny/di";

export interface IGitRepository {
    /** Returns true if the given tag exists in the repository. */
    tagExists(tag: string): boolean;
    /** Returns commit subjects since the given ref, or all commits if ref is null. */
    commitsSince(ref: string | null): string[];
    /** Creates a lightweight tag at HEAD. */
    createTag(tag: string): void;
}

export const GitRepository = new Abstraction<IGitRepository>("Scripts/GitRepository");

export namespace GitRepository {
    export type Interface = IGitRepository;
}
