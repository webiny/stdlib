import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ArtifactCopier as ArtifactCopierAbstraction } from "./abstractions/ArtifactCopier.ts";
import type { PackageJson } from "type-fest";

function stripDist(path: string): string {
    return path.startsWith("./dist/") ? `./${path.slice("./dist/".length)}` : path;
}

function rewriteExports(value: PackageJson.Exports): PackageJson.Exports {
    if (value == null || Array.isArray(value)) {
        return value;
    }
    if (typeof value === "string") {
        return stripDist(value);
    }
    const result: PackageJson.ExportConditions = {};
    for (const [k, v] of Object.entries(value)) {
        if (v !== undefined) {
            result[k] = rewriteExports(v);
        }
    }
    return result;
}

class ArtifactCopierImpl implements ArtifactCopierAbstraction.Interface {
    public copyPackageJson(packageAbsDir: string, distAbsDir: string): void {
        mkdirSync(distAbsDir, { recursive: true });
        const pkgJson = JSON.parse(
            readFileSync(join(packageAbsDir, "package.json"), "utf8")
        ) as PackageJson;

        if (pkgJson.main) {
            pkgJson.main = stripDist(pkgJson.main);
        }
        if (pkgJson.types) {
            pkgJson.types = stripDist(pkgJson.types);
        }
        if (pkgJson.exports) {
            pkgJson.exports = rewriteExports(pkgJson.exports);
        }
        delete pkgJson.files;
        delete pkgJson["publishConfig"];

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
