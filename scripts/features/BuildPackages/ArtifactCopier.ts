import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ArtifactCopier as ArtifactCopierAbstraction } from "./abstractions/ArtifactCopier.ts";

interface PackageJsonExports {
    [key: string]: string | PackageJsonExports;
}

interface PackageJson {
    main?: string;
    types?: string;
    exports?: string | PackageJsonExports;
    files?: string[];
    [key: string]: unknown;
}

function stripDist(path: string): string {
    return path.startsWith("./dist/") ? `./${path.slice("./dist/".length)}` : path;
}

function rewriteExports(value: string | PackageJsonExports): string | PackageJsonExports {
    if (typeof value === "string") {
        return stripDist(value);
    }
    const result: PackageJsonExports = {};
    for (const [k, v] of Object.entries(value)) {
        result[k] = rewriteExports(v);
    }
    return result;
}

class ArtifactCopierImpl implements ArtifactCopierAbstraction.Interface {
    public copyPackageJson(packageAbsDir: string, distAbsDir: string): void {
        mkdirSync(distAbsDir, { recursive: true });
        const pkgJson = JSON.parse(
            readFileSync(join(packageAbsDir, "package.json"), "utf8")
        ) as PackageJson;

        if (pkgJson.main !== undefined) {
            pkgJson.main = stripDist(pkgJson.main);
        }
        if (pkgJson.types !== undefined) {
            pkgJson.types = stripDist(pkgJson.types);
        }
        if (pkgJson.exports !== undefined) {
            pkgJson.exports = rewriteExports(pkgJson.exports);
        }
        delete pkgJson.files;

        writeFileSync(join(distAbsDir, "package.json"), JSON.stringify(pkgJson, null, 2) + "\n");
    }

    public copyReadme(packageAbsDir: string, distAbsDir: string): void {
        mkdirSync(distAbsDir, { recursive: true });
        copyFileSync(join(packageAbsDir, "README.md"), join(distAbsDir, "README.md"));
    }

    public copyLicense(sourceDir: string, distAbsDir: string): void {
        mkdirSync(distAbsDir, { recursive: true });
        copyFileSync(join(sourceDir, "LICENSE"), join(distAbsDir, "LICENSE"));
    }
}

export const ArtifactCopier = ArtifactCopierAbstraction.createImplementation({
    implementation: ArtifactCopierImpl,
    dependencies: []
});
