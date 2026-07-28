import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

export default defineConfig({
    root,
    resolve: {
        alias: {
            "~": resolve(root, "src")
        }
    },
    test: {
        globals: true,
        include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: [
                "**/__tests__/**",
                "**/index.ts",
                "**/abstractions/**",
                "**/feature.ts",
                "**/cli.ts",
                "**/AgentConfigurator.ts"
            ],
            thresholds: {
                statements: 96,
                branches: 93,
                functions: 96,
                lines: 96
            }
        }
    }
});
