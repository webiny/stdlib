import { Abstraction } from "@webiny/di";

export interface IChangelogWriter {
    /**
     * Prepends a new release entry to CHANGELOG.md at the repo root.
     * Returns the formatted entry string (same text that was prepended).
     */
    write(version: string, commits: string[]): string;
}

export const ChangelogWriter = new Abstraction<IChangelogWriter>("Scripts/ChangelogWriter");

export namespace ChangelogWriter {
    export type Interface = IChangelogWriter;
}
