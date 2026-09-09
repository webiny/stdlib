# BrowserWindow

Abstraction over the browser `window` object. Provides injectable access to browser-specific APIs (`localStorage`, etc.) without coupling consumers directly to the global. The real implementation captures references at construction time; the null implementation returns `null` for all APIs, suitable for SSR or testing.

## Interface

```ts
interface IBrowserWindow {
  /** Returns the localStorage instance, or null if unavailable. */
  readonly localStorage: Storage | null;
}
```

## Usage

### DI container wiring

```ts
import { Container } from "@webiny/di";
import {
  BrowserWindow,
  BrowserWindowFeature,
  NullBrowserWindowFeature
} from "@webiny/stdlib/browser";

// Real — captures from the global window
const container = new Container();
BrowserWindowFeature.register(container);
const bw = container.resolve(BrowserWindow);
console.log(bw.localStorage); // Storage or null

// Null — all APIs return null
const ssrContainer = new Container();
NullBrowserWindowFeature.register(ssrContainer);
const nullBw = ssrContainer.resolve(BrowserWindow);
console.log(nullBw.localStorage); // null
```

### Factory functions

```ts
import { createBrowserWindow, createNullBrowserWindow } from "@webiny/stdlib/browser";

const bw = createBrowserWindow();
const nullBw = createNullBrowserWindow();
```
