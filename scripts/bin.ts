/**
 * Appends .cmd on Windows so npm-installed CLI tools (npm, tsgo, etc.) can
 * be spawned via execFileSync, which does not invoke a shell by default.
 * Git is a native .exe on Windows and does not need this treatment.
 */
export function bin(name: string): string {
    return process.platform === "win32" ? `${name}.cmd` : name;
}
