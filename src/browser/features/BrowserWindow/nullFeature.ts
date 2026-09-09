import { createFeature } from "~/common/index.js";
import { NullBrowserWindow } from "./NullBrowserWindow.js";

/** Registers a null BrowserWindow where all APIs return null. */
export const NullBrowserWindowFeature = createFeature({
    name: "Browser/NullBrowserWindowFeature",
    register(container) {
        container.register(NullBrowserWindow).inSingletonScope();
    }
});
