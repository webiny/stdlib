/** Exact semantic parity with the `boolean` npm package. */
export function toBoolean(value: unknown): boolean {
    switch (Object.prototype.toString.call(value)) {
        case "[object String]":
            return ["true", "t", "yes", "y", "on", "1"].includes(
                (value as string).trim().toLowerCase()
            );
        case "[object Number]":
            return (value as number).valueOf() === 1;
        case "[object Boolean]":
            return (value as boolean).valueOf();
        default:
            return false;
    }
}

/** Returns `toBoolean(value)`. Readable alias for use in predicates. */
export function isTruthy(value: unknown): boolean {
    return toBoolean(value);
}

/** Returns `!toBoolean(value)`. Readable inverse of `isTruthy`. */
export function isFalsy(value: unknown): boolean {
    return !toBoolean(value);
}
