import { describe, it, expect } from "vitest";
import { Container } from "@webiny/di";
import { ProjectConfig } from "../../../scripts/features/PublishPackages/abstractions/ProjectConfig.ts";
import { DependencyLocker } from "../../../scripts/features/PublishPackages/abstractions/DependencyLocker.ts";
import { DependencyLocker as DependencyLockerImpl } from "../../../scripts/features/PublishPackages/DependencyLocker.ts";

function makeLocker(exactDependencyVersions: boolean): DependencyLocker.Interface {
    const container = new Container();
    container.registerInstance(ProjectConfig, {
        rootDir: "/tmp",
        packageName: "@test/pkg",
        dryRun: false,
        exactDependencyVersions
    });
    container.register(DependencyLockerImpl).inSingletonScope();
    return container.resolve(DependencyLocker);
}

describe("DependencyLocker", () => {
    describe("when exactDependencyVersions is false", () => {
        it("does not modify dependencies", () => {
            const locker = makeLocker(false);
            const pkgJson = { dependencies: { foo: "^1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "^1.2.3" });
        });
    });

    describe("when exactDependencyVersions is true", () => {
        it("strips ^ from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "^1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips ~ from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "~1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips >= from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: ">=1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips > from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: ">1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips <= from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "<=1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips < from dependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "<1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("strips range operators from devDependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = { devDependencies: { bar: "^2.0.0" } };
            locker.lock(pkgJson);
            expect(pkgJson.devDependencies).toEqual({ bar: "2.0.0" });
        });

        it("does not modify peerDependencies", () => {
            const locker = makeLocker(true);
            const pkgJson = {
                dependencies: { foo: "^1.0.0" },
                peerDependencies: { baz: "^3.0.0" }
            };
            locker.lock(pkgJson);
            expect(pkgJson.peerDependencies).toEqual({ baz: "^3.0.0" });
        });

        it("leaves exact versions unchanged", () => {
            const locker = makeLocker(true);
            const pkgJson = { dependencies: { foo: "1.2.3" } };
            locker.lock(pkgJson);
            expect(pkgJson.dependencies).toEqual({ foo: "1.2.3" });
        });

        it("handles missing dependency fields gracefully", () => {
            const locker = makeLocker(true);
            expect(() => locker.lock({})).not.toThrow();
        });
    });
});
