import { GlobTool as Abstraction } from "./abstractions/index.js";
import { globSync } from "tinyglobby";

class GlobToolImpl implements Abstraction.Interface {
    public findAll(patterns: string | string[], options?: Abstraction.AllOptions): string[] {
        return this.stripTrailingSlashes(globSync(patterns, options));
    }

    public findFiles(patterns: string | string[], options?: Abstraction.FilesOptions): string[] {
        return globSync(patterns, {
            ...options,
            onlyFiles: true
        });
    }

    public findDirectories(
        patterns: string | string[],
        options?: Abstraction.DirectoriesOptions
    ): string[] {
        return this.stripTrailingSlashes(
            globSync(patterns, {
                ...options,
                onlyDirectories: true
            })
        );
    }

    private stripTrailingSlashes(paths: string[]): string[] {
        return paths.map(p => p.replace(/\/+$/, ""));
    }
}

export const GlobTool = Abstraction.createImplementation({
    implementation: GlobToolImpl,
    dependencies: []
});

export const createGlobTool = (): Abstraction.Interface => {
    return new GlobToolImpl();
};
