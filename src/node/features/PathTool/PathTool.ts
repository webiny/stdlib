import { join, resolve, dirname, basename } from "node:path";
import { PathTool as PathToolAbstraction } from "./abstractions/PathTool.js";

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
}

export const PathTool = PathToolAbstraction.createImplementation({
    implementation: PathToolImpl,
    dependencies: []
});

export function createPathTool(): PathToolAbstraction.Interface {
    return new PathToolImpl();
}
