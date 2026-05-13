import { fileURLToPath } from "node:url";
import { run as build } from "./features/BuildPackages/index.ts";
import { run as publish } from "./features/PublishToVerdaccio/index.ts";

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

build(root);
publish(root, versionValue);
