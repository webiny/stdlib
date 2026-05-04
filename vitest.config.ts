import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["**/__tests__/**", "**/index.ts", "**/abstractions/**"]
        }
    }
});
