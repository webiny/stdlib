import { DependencyLocker as DependencyLockerAbstraction } from "./abstractions/DependencyLocker.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";
import semver from "semver";

class DependencyLockerImpl implements DependencyLockerAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;

    public constructor(config: ProjectConfig.Interface) {
        this.config = config;
    }

    public lock(pkgJson: DependencyLockerAbstraction.Params): void {
        if (!this.config.exactDependencyVersions) {
            return;
        }

        if (pkgJson.dependencies !== undefined) {
            pkgJson.dependencies = this.stripRangeOperators(pkgJson.dependencies);
        }

        if (pkgJson.devDependencies !== undefined) {
            pkgJson.devDependencies = this.stripRangeOperators(pkgJson.devDependencies);
        }
    }

    private stripRangeOperators(
        deps: DependencyLockerAbstraction.Dependency
    ): DependencyLockerAbstraction.Dependency {
        const result: DependencyLockerAbstraction.Dependency = {};
        if (!deps) {
            return result;
        }
        for (const [name, version] of Object.entries(deps)) {
            /**
             * Impossible but TS doesn't know that. If version is undefined, we skip it and don't include it in the result.
             */
            if (!version) {
                continue;
            }

            const newVersion = version.replace(/^(\^|~|>=|<=|>|<)+/, "");

            const valid = semver.valid(newVersion);
            if (!valid) {
                throw new Error(
                    `Stripped version for ${name} is not a valid semver version: ${newVersion} (original: ${version})`
                );
            }
            result[name] = newVersion;
        }
        return result;
    }
}

export const DependencyLocker = DependencyLockerAbstraction.createImplementation({
    implementation: DependencyLockerImpl,
    dependencies: [ProjectConfig]
});
