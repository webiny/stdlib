import { BrowserWindow as BrowserWindowAbstraction } from "./abstractions/BrowserWindow.js";

class BrowserWindowImpl implements BrowserWindowAbstraction.Interface {
    public readonly localStorage: Storage | null;

    public constructor() {
        this.localStorage =
            typeof window !== "undefined" && window?.localStorage ? window.localStorage : null;
    }
}

export const BrowserWindow = BrowserWindowAbstraction.createImplementation({
    implementation: BrowserWindowImpl,
    dependencies: []
});

export function createBrowserWindow(): BrowserWindowAbstraction.Interface {
    return new BrowserWindowImpl();
}
