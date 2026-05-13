import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run as build } from "./features/BuildPackages/index.ts";
import { bin } from "./bin.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

const versionIndex = process.argv.indexOf("--version");
const versionValue = process.argv[versionIndex + 1];
if (versionIndex === -1 || !versionValue || versionValue.startsWith("-")) {
    console.error(
        "Error: --version <x> is required.\n" +
            "Example: yarn publish:verdaccio --version 1.0.0-beta.abcdefg"
    );
    process.exit(1);
}
const version = versionValue;

build(root);

const distPkgPath = join(root, "dist", "package.json");
const pkg = JSON.parse(readFileSync(distPkgPath, "utf8")) as Record<string, unknown>;
pkg["version"] = version;
writeFileSync(distPkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`Publishing ${String(pkg["name"])}@${version} to http://localhost:4873 ...`);

execFileSync(bin("npm"), ["publish", "--registry", "http://localhost:4873"], {
    cwd: join(root, "dist"),
    stdio: "inherit"
});
