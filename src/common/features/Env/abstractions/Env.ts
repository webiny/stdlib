import { createAbstraction } from "~/common/core/index.js";

/**
 * Typed access to environment variables.
 * Platform-specific implementations back this interface:
 * `process.env` on Node, no-op on browsers.
 */
export interface IEnv {
    /** Read a string variable. Returns `undefined` if not set. */
    getString(key: string): string | undefined;
    /** Read a string variable with a fallback. */
    getString(key: string, defaultValue: string): string;

    /** Read a string variable or throw if not set. */
    getStringOrThrow(key: string): string;

    /** Read and parse a numeric variable. Returns `undefined` if not set or not a valid number. */
    getNumber(key: string): number | undefined;
    /** Read and parse a numeric variable with a fallback. */
    getNumber(key: string, defaultValue: number): number;

    /** Read and parse a numeric variable or throw if not set or not a valid number. */
    getNumberOrThrow(key: string): number;

    /** Read and parse a boolean variable using `toBoolean`. Returns `undefined` if not set. */
    getBoolean(key: string): boolean | undefined;
    /** Read and parse a boolean variable with a fallback. */
    getBoolean(key: string, defaultValue: boolean): boolean;

    /** Read and parse a boolean variable or throw if not set. */
    getBooleanOrThrow(key: string): boolean;
}

export const Env = createAbstraction<IEnv>("Core/Env");

export namespace Env {
    export type Interface = IEnv;
}
