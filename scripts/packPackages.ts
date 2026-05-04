import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bin } from "./bin.ts";
import { getWorkspaces } from "./getWorkspaces.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

for (const { dir, name } of getWorkspaces(root)) {
    console.log(`\n--- ${name} ---`);
    execFileSync(bin("npm"), ["pack", "--dry-run"], {
        cwd: join(root, "packages", dir, "dist"),
        stdio: "inherit"
    });
}
