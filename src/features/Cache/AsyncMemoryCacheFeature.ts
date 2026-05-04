import { createFeature } from "../../core/index.js";
import { AsyncMemoryCache } from "./AsyncMemoryCache.js";

/** Registers AsyncMemoryCache as the AsyncCache implementation. */
export const AsyncMemoryCacheFeature = createFeature({
    name: "Core/AsyncMemoryCacheFeature",
    register(container) {
        container.register(AsyncMemoryCache).inSingletonScope();
    }
});
