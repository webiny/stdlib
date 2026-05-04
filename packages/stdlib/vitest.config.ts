import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "#common": new URL("./src/index.ts", import.meta.url).pathname
        }
    },
    test: {
        globals: true,
        include: ["__tests__/**/*.{test,spec}.{ts,tsx}"]
    }
});
