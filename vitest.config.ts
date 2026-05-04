import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            provider: "v8",
            include: ["packages/*/src/**/*.ts"],
            exclude: ["packages/*/__tests__/**", "**/index.ts", "**/abstractions/**"]
        }
    }
});
