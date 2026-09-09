import { BrowserWindow as BrowserWindowAbstraction } from "./abstractions/BrowserWindow.js";

class NullBrowserWindowImpl implements BrowserWindowAbstraction.Interface {
    public readonly localStorage: Storage | null = null;
}

export const NullBrowserWindow = BrowserWindowAbstraction.createImplementation({
    implementation: NullBrowserWindowImpl,
    dependencies: []
});

export function createNullBrowserWindow(): BrowserWindowAbstraction.Interface {
    return new NullBrowserWindowImpl();
}
