import { Abstraction } from "@webiny/di";

export interface ICompiler {
    /** Compiles the package at the given path relative to the project root. */
    compile(packageRelDir: string): void;
}

export const Compiler = new Abstraction<ICompiler>("Scripts/Build/Compiler");

export namespace Compiler {
    export type Interface = ICompiler;
}
