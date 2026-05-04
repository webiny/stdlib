import { fileURLToPath } from "node:url";
import { run as build } from "./features/BuildPackages/index.ts";
import { run as publish } from "./features/PublishPackages/index.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
build(root);
publish(root);
