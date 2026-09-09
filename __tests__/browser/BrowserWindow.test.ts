// @vitest-environment happy-dom
import { Container } from "@webiny/di";
import { describe, it, expect } from "vitest";
import { BrowserWindow } from "../../src/browser/features/BrowserWindow/abstractions/BrowserWindow.js";
import {
    BrowserWindow as BrowserWindowImpl,
    createBrowserWindow
} from "../../src/browser/features/BrowserWindow/BrowserWindow.js";
import {
    NullBrowserWindow,
    createNullBrowserWindow
} from "../../src/browser/features/BrowserWindow/NullBrowserWindow.js";
import { BrowserWindowFeature } from "../../src/browser/features/BrowserWindow/feature.js";
import { NullBrowserWindowFeature } from "../../src/browser/features/BrowserWindow/nullFeature.js";

describe("BrowserWindow", () => {
    describe("real implementation", () => {
        it("exposes localStorage from the global window", () => {
            const container = new Container();
            container.register(BrowserWindowImpl).inSingletonScope();
            const bw = container.resolve(BrowserWindow);
            expect(bw.localStorage).toBe(window.localStorage);
        });

        it("resolves via BrowserWindowFeature", () => {
            const container = new Container();
            BrowserWindowFeature.register(container);
            const bw = container.resolve(BrowserWindow);
            expect(bw.localStorage).toBe(window.localStorage);
        });

        it("creates via factory function", () => {
            const bw = createBrowserWindow();
            expect(bw.localStorage).toBe(window.localStorage);
        });
    });

    describe("null implementation", () => {
        it("returns null for localStorage", () => {
            const container = new Container();
            container.register(NullBrowserWindow).inSingletonScope();
            const bw = container.resolve(BrowserWindow);
            expect(bw.localStorage).toBeNull();
        });

        it("resolves via NullBrowserWindowFeature", () => {
            const container = new Container();
            NullBrowserWindowFeature.register(container);
            const bw = container.resolve(BrowserWindow);
            expect(bw.localStorage).toBeNull();
        });

        it("creates via factory function", () => {
            const bw = createNullBrowserWindow();
            expect(bw.localStorage).toBeNull();
        });
    });
});
