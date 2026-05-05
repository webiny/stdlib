import { join, resolve, dirname, basename } from "node:path";
import { createRequire } from "node:module";
import { PathTool as PathToolAbstraction } from "./abstractions/PathTool.js";
import { PackageNotFoundError } from "./errors.js";

class PathToolImpl implements PathToolAbstraction.Interface {
    public join(...paths: string[]): string {
        return join(...paths);
    }

    public resolve(...paths: string[]): string {
        return resolve(...paths);
    }

    public dirname(path: string): string {
        return dirname(path);
    }

    public basename(path: string, ext?: string): string {
        return basename(path, ext);
    }

    public resolvePackageFile(specifier: string): string {
        const require = createRequire(join(process.cwd(), "index.js"));
        try {
            return require.resolve(specifier);
        } catch {
            throw new PackageNotFoundError({
                message: `Cannot resolve package file: ${specifier}`,
                data: { specifier }
            });
        }
    }
}

export const PathTool = PathToolAbstraction.createImplementation({
    implementation: PathToolImpl,
    dependencies: []
});

export function createPathTool(): PathToolAbstraction.Interface {
    return new PathToolImpl();
}
