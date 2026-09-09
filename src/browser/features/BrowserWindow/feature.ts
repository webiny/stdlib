import { createFeature } from "~/common/index.js";
import { BrowserWindow } from "./BrowserWindow.js";

/** Registers the real BrowserWindow that captures from the global `window`. */
export const BrowserWindowFeature = createFeature({
    name: "Browser/BrowserWindowFeature",
    register(container) {
        container.register(BrowserWindow).inSingletonScope();
    }
});
