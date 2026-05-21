import { getProperty, setProperty, deleteProperty } from "dot-prop";

/**
 * Get a nested property value by dot-notation path.
 */
function immutableGet<T = unknown>(
    target: Record<string, any> | null | undefined,
    path: string,
    defaultValue?: T
): T {
    if (!target && !defaultValue) {
        return defaultValue as unknown as T;
    } else if (!target) {
        return structuredClone(defaultValue) as T;
    }
    return getProperty(structuredClone(target), path, defaultValue) as T;
}

/**
 * Returns a deep clone with the value set at the given path.
 * If value is a function, it receives the current value and should return the new value.
 */
function immutableSet<T extends Record<string, any>>(
    target: T,
    path: string,
    value: unknown | ((current: any) => unknown)
): T {
    const clone = structuredClone(target);
    const finalValue = typeof value === "function" ? value(getProperty(clone, path)) : value;
    setProperty(clone, path, finalValue);
    return clone;
}

/**
 * Returns a deep clone with the property at the given path removed.
 * When target is an array, pass a numeric index to splice the element out of the clone.
 */
function immutableDelete<T>(target: T[], index: number): T[];
function immutableDelete<T extends Record<string, any>>(target: T, path: string): T;
function immutableDelete(target: Record<string, any> | unknown[], path: string | number): unknown {
    const clone = structuredClone(target);
    if (Array.isArray(clone) && typeof path === "number") {
        if (path < 0 || path >= clone.length) {
            return clone;
        }
        clone.splice(path, 1);
        return clone;
    }
    deleteProperty(clone as Record<string, any>, path as string);
    return clone;
}

/**
 * Sets the value at the given path on the original target.
 */
function mutableSet<T extends Record<string, any>>(target: T, path: string, value: unknown): T {
    return setProperty(target, path, value);
}

/**
 * Removes the property at the given path from the original target.
 * When target is an array, pass a numeric index to splice the element out.
 */
function mutableDelete<T>(target: T[], index: number): boolean;
function mutableDelete<T extends Record<string, any>>(target: T, path: string): boolean;
function mutableDelete(target: Record<string, any> | unknown[], path: string | number): boolean {
    if (Array.isArray(target) && typeof path === "number") {
        if (path < 0 || path >= target.length) {
            return false;
        }
        target.splice(path, 1);
        return true;
    }
    return deleteProperty(target as Record<string, any>, path as string);
}

export { immutableGet, immutableSet, immutableDelete, mutableSet, mutableDelete };
