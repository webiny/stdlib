import { createAbstraction } from "~/common/index.js";

/**
 * Abstraction over the browser `window` object.
 * Provides access to browser-specific APIs (localStorage, etc.)
 * without coupling consumers directly to the global.
 */
export interface IBrowserWindow {
    /** Returns the localStorage instance, or null if unavailable. */
    readonly localStorage: Storage | null;
}

export const BrowserWindow = createAbstraction<IBrowserWindow>("Browser/BrowserWindow");

export namespace BrowserWindow {
    export type Interface = IBrowserWindow;
}
