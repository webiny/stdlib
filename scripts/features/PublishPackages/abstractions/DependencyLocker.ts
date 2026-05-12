import { Abstraction } from "@webiny/di";
import type { PackageJson } from "type-fest";

export type IDependencyLockerLockParams = Pick<PackageJson, "dependencies" | "devDependencies">;

export interface IDependencyLocker {
    /**
     * Strips all version range operators (^, ~, >=, >, <=, <) from
     * dependencies and devDependencies. peerDependencies are left untouched.
     * Mutates the object in place. No-op when exactDependencyVersions is false.
     */
    lock(pkgJson: IDependencyLockerLockParams): void;
}

export const DependencyLocker = new Abstraction<IDependencyLocker>("Scripts/DependencyLocker");

export namespace DependencyLocker {
    export type Interface = IDependencyLocker;
    export type Params = IDependencyLockerLockParams;
    export type Dependency = Required<PackageJson["dependencies"]>;
}
