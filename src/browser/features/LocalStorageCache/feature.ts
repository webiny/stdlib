import { createFeature } from "~/common/index.js";
import { LocalStorageCache } from "./LocalStorageCache.js";

/** Registers LocalStorageCache as the Cache implementation. */
export const LocalStorageCacheFeature = createFeature({
    name: "Browser/LocalStorageCacheFeature",
    register(container) {
        container.register(LocalStorageCache).inSingletonScope();
    }
});
