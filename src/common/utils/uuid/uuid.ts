const HEX: ReadonlyArray<string> = Array.from({ length: 256 }, (_, i) =>
    i.toString(16).padStart(2, "0")
);

const DASH_POSITIONS = new Set([4, 6, 8, 10]);

function v4Fallback(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    let result = "";
    for (let i = 0; i < 16; i++) {
        if (DASH_POSITIONS.has(i)) {
            result += "-";
        }

        let byte = bytes[i] as number;

        if (i === 6) {
            byte = (byte & 0x0f) | 0x40;
        } else if (i === 8) {
            byte = (byte & 0x3f) | 0x80;
        }

        result += HEX[byte];
    }

    return result;
}

/**
 * Generates a RFC 4122 v4 UUID.
 * Uses `crypto.randomUUID` when available (Node.js, secure browser contexts).
 * Falls back to `crypto.getRandomValues` for insecure (HTTP) browser contexts.
 */
export function uuid(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return v4Fallback();
}
