import { Abstraction } from "@webiny/di";

export interface IPathAliasRewriter {
    /**
     * Walks distDir recursively and rewrites every ~/ import alias in
     * .js and .d.ts files to a depth-relative path so Node can resolve them.
     */
    rewrite(distDir: string): void;
}

export const PathAliasRewriter = new Abstraction<IPathAliasRewriter>(
    "Scripts/Build/PathAliasRewriter"
);

export namespace PathAliasRewriter {
    export type Interface = IPathAliasRewriter;
}
