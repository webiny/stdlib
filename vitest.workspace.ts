import { defineProject } from "vitest/config";

export default [
    defineProject({ test: { name: "utils-common", root: "./packages/common" } }),
    defineProject({ test: { name: "utils-node", root: "./packages/node" } }),
    defineProject({ test: { name: "utils-browser", root: "./packages/browser" } })
];
