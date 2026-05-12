import { Abstraction } from "@webiny/di";

export interface IDependencyLocker {
    /**
     * Strips all version range operators (^, ~, >=, >, <=, <) from
     * dependencies and devDependencies. peerDependencies are left untouched.
     * Mutates the object in place. No-op when exactDependencyVersions is false.
     */
    lock(pkgJson: {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    }): void;
}

export const DependencyLocker = new Abstraction<IDependencyLocker>("Scripts/DependencyLocker");

export namespace DependencyLocker {
    export type Interface = IDependencyLocker;
}
