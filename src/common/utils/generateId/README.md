---
name: generate-id
description: Nanoid-based ID generators with configurable alphabets and sizes.
context: common
---

# generateId

Nanoid-based ID generators with configurable alphabets and sizes. Uses `nanoid` (v5) and `nanoid-dictionary` under the hood. All generators default to 21 characters and accept an optional `size` parameter.

## API

```ts
function generateId(size?: number): string;
function generateAlphaNumericId(size?: number): string;
function generateAlphaNumericLowerCaseId(size?: number): string;
function generateAlphaId(size?: number): string;
function generateAlphaLowerCaseId(size?: number): string;
function generateAlphaUpperCaseId(size?: number): string;
```

| Function                          | Alphabet                 | Example output           |
| --------------------------------- | ------------------------ | ------------------------ |
| `generateId`                      | URL-safe (`A-Za-z0-9_-`) | `V1StGXR8_Z5jdHi6B-myT`  |
| `generateAlphaNumericId`          | `A-Z a-z 0-9`            | `k3Bf9xQpWm7Yz2RtJhNcA`  |
| `generateAlphaNumericLowerCaseId` | `a-z 0-9`                | `m7k3xq9pw2yz5rtjh8nca`  |
| `generateAlphaId`                 | `A-Z a-z`                | `kBfxQpWmYzRtJhNcAeLsG`  |
| `generateAlphaLowerCaseId`        | `a-z`                    | `kbfxqpwmyzrtjhncaelsgd` |
| `generateAlphaUpperCaseId`        | `A-Z`                    | `KBFXQPWMYZRTJHNCAELSGD` |

## Usage

```ts
import { generateId, generateAlphaNumericLowerCaseId } from "@webiny/stdlib";

const id = generateId(); // default 21 chars, URL-safe
const short = generateId(10); // custom size
const slug = generateAlphaNumericLowerCaseId(12); // lowercase alphanumeric
```
