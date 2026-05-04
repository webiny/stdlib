import type { PackageJson } from "type-fest";

export interface IPackageJsonFile {
    /** Absolute path to the file on disk. */
    readonly path: string;

    /** The underlying parsed data. Mutated in place by the setter methods. */
    readonly raw: PackageJson;

    /** Returns a shallow copy of `dependencies`, or `{}` if absent. */
    getDependencies(): Record<string, string>;
    /** Returns the version string for `name`, or null if absent. */
    getDependency(name: string): string | null;
    setDependency(name: string, version: string): void;
    removeDependency(name: string): void;

    /** Returns a shallow copy of `devDependencies`, or `{}` if absent. */
    getDevDependencies(): Record<string, string>;
    getDevDependency(name: string): string | null;
    setDevDependency(name: string, version: string): void;
    removeDevDependency(name: string): void;

    /** Returns a shallow copy of `peerDependencies`, or `{}` if absent. */
    getPeerDependencies(): Record<string, string>;
    getPeerDependency(name: string): string | null;
    setPeerDependency(name: string, version: string): void;
    removePeerDependency(name: string): void;

    /** Returns a shallow copy of `resolutions` (Yarn), or `{}` if absent. */
    getResolutions(): Record<string, string>;
    getResolution(name: string): string | null;
    setResolution(name: string, version: string): void;
    removeResolution(name: string): void;

    /** Returns `version`, or null if absent. */
    getVersion(): string | null;

    /** Returns the value at `key`, or null if absent. */
    get(key: string): unknown;
    /** Sets an arbitrary top-level field. */
    set(key: string, value: unknown): void;
}

type DepSection = "dependencies" | "devDependencies" | "peerDependencies" | "resolutions";

export class PackageJsonFile implements IPackageJsonFile {
    public constructor(
        public readonly path: string,
        public readonly raw: PackageJson
    ) {}

    // ── dependency helpers ─────────────────────────────────────────────────

    private section(key: DepSection): Record<string, string> {
        return ((this.raw as Record<string, unknown>)[key] ?? {}) as Record<string, string>;
    }

    private ensureSection(key: DepSection): Record<string, string> {
        const data = this.raw as Record<string, unknown>;
        if (!data[key]) {
            data[key] = {};
        }
        return data[key] as Record<string, string>;
    }

    private getEntry(key: DepSection, name: string): string | null {
        return this.section(key)[name] ?? null;
    }

    private setEntry(key: DepSection, name: string, version: string): void {
        this.ensureSection(key)[name] = version;
    }

    private removeEntry(key: DepSection, name: string): void {
        delete this.section(key)[name];
    }

    // ── dependencies ──────────────────────────────────────────────────────

    public getDependencies(): Record<string, string> {
        return { ...this.section("dependencies") };
    }

    public getDependency(name: string): string | null {
        return this.getEntry("dependencies", name);
    }

    public setDependency(name: string, version: string): void {
        this.setEntry("dependencies", name, version);
    }

    public removeDependency(name: string): void {
        this.removeEntry("dependencies", name);
    }

    // ── devDependencies ───────────────────────────────────────────────────

    public getDevDependencies(): Record<string, string> {
        return { ...this.section("devDependencies") };
    }

    public getDevDependency(name: string): string | null {
        return this.getEntry("devDependencies", name);
    }

    public setDevDependency(name: string, version: string): void {
        this.setEntry("devDependencies", name, version);
    }

    public removeDevDependency(name: string): void {
        this.removeEntry("devDependencies", name);
    }

    // ── peerDependencies ──────────────────────────────────────────────────

    public getPeerDependencies(): Record<string, string> {
        return { ...this.section("peerDependencies") };
    }

    public getPeerDependency(name: string): string | null {
        return this.getEntry("peerDependencies", name);
    }

    public setPeerDependency(name: string, version: string): void {
        this.setEntry("peerDependencies", name, version);
    }

    public removePeerDependency(name: string): void {
        this.removeEntry("peerDependencies", name);
    }

    // ── resolutions ───────────────────────────────────────────────────────

    public getResolutions(): Record<string, string> {
        return { ...this.section("resolutions") };
    }

    public getResolution(name: string): string | null {
        return this.getEntry("resolutions", name);
    }

    public setResolution(name: string, version: string): void {
        this.setEntry("resolutions", name, version);
    }

    public removeResolution(name: string): void {
        this.removeEntry("resolutions", name);
    }

    // ── misc ──────────────────────────────────────────────────────────────

    public getVersion(): string | null {
        return this.raw.version ?? null;
    }

    public get(key: string): unknown {
        return (this.raw as Record<string, unknown>)[key] ?? null;
    }

    public set(key: string, value: unknown): void {
        (this.raw as Record<string, unknown>)[key] = value;
    }
}

export namespace PackageJsonFile {
    export type Interface = IPackageJsonFile;
}
