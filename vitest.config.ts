import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
    resolve: {
        alias: {
            "~": resolve(import.meta.dirname, "src")
        }
    },
    test: {
        globals: true,
        include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["**/__tests__/**", "**/index.ts", "**/abstractions/**"],
            thresholds: {
                statements: 90,
                branches: 80,
                functions: 90,
                lines: 90
            }
        }
    }
});
