import { Abstraction } from "@webiny/di";

export interface IChangelogWriter {
    /** Prepends a new release entry to CHANGELOG.md at the repo root. */
    write(version: string, commits: string[]): void;
}

export const ChangelogWriter = new Abstraction<IChangelogWriter>("Scripts/ChangelogWriter");

export namespace ChangelogWriter {
    export type Interface = IChangelogWriter;
}
