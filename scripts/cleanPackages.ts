import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getWorkspaces } from "./getWorkspaces.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

for (const { dir } of getWorkspaces(root)) {
    rmSync(join(root, "packages", dir, "dist"), { recursive: true, force: true });
}
