import { createFeature } from "../../core/index.js";
import { MemoryCache } from "./MemoryCache.js";

/** Registers MemoryCache as the Cache implementation. */
export const MemoryCacheFeature = createFeature({
    name: "Core/MemoryCacheFeature",
    register(container) {
        container.register(MemoryCache).inSingletonScope();
    }
});
