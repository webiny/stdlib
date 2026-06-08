# mdbid

Generates MongoDB-compatible ObjectId strings. Uses `bson-objectid` to produce 24-character, time-sortable, globally unique hex identifiers that match MongoDB's native ObjectId format.

## API

```ts
function mdbid(): string;
```

Returns a 24-character lowercase hex string (e.g. `"507f1f77bcf86cd799439011"`).

## Usage

```ts
import { mdbid } from "@webiny/stdlib";

const id = mdbid(); // "507f1f77bcf86cd799439011"
```
