---
name: uuid
description: Generates RFC 4122 v4 UUIDs, with a native crypto fallback for insecure browser contexts.
context: common
---

# uuid

Generates RFC 4122 v4 UUIDs. Uses the native `crypto.randomUUID()` when available (Node.js, secure browser contexts) and falls back to a manual implementation using `crypto.getRandomValues()` for insecure (HTTP) browser contexts. No external dependencies.

## API

```ts
function uuid(): string;
```

Returns a lowercase UUID v4 string in the standard `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` format, where `y` is one of `8`, `9`, `a`, or `b` (RFC 4122 variant bits).

## Usage

```ts
import { uuid } from "@webiny/stdlib";

const id = uuid(); // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```
