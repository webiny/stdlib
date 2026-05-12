import { DependencyLocker as DependencyLockerAbstraction } from "./abstractions/DependencyLocker.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";

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
            result[name] = version.replace(/^(\^|~|>=|<=|>|<)+/, "");
        }
        return result;
    }
}

export const DependencyLocker = DependencyLockerAbstraction.createImplementation({
    implementation: DependencyLockerImpl,
    dependencies: [ProjectConfig]
});
