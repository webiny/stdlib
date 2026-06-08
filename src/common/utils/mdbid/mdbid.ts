import _ObjectID from "bson-objectid";

interface ObjectIDInstance {
    toHexString(): string;
}

/** CJS interop: tsgo resolves the default as the module namespace, not the callable. */
const ObjectID = _ObjectID as unknown as () => ObjectIDInstance;

/**
 * Generates a MongoDB-compatible ObjectId as a 24-character lowercase hex string.
 * Uses `bson-objectid` which produces time-sortable, globally unique identifiers
 * matching MongoDB's native ObjectId format.
 */
export function mdbid(): string {
    return ObjectID().toHexString();
}
