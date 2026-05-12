import { DependencyLocker as DependencyLockerAbstraction } from "./abstractions/DependencyLocker.ts";
import { ProjectConfig } from "./abstractions/ProjectConfig.ts";

class DependencyLockerImpl implements DependencyLockerAbstraction.Interface {
    private readonly config: ProjectConfig.Interface;

    public constructor(config: ProjectConfig.Interface) {
        this.config = config;
    }

    public lock(pkgJson: {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    }): void {
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

    private stripRangeOperators(deps: Record<string, string>): Record<string, string> {
        const result: Record<string, string> = {};
        for (const [name, version] of Object.entries(deps)) {
            result[name] = version.replace(/^(\^|~|>=|<=|>|<)+/, "");
        }
        return result;
    }
}

export const DependencyLocker = DependencyLockerAbstraction.createImplementation({
    implementation: DependencyLockerImpl,
    dependencies: [ProjectConfig]
});
