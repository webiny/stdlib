import {
    VersionStrategy as VersionStrategyAbstraction,
    type VersionResult
} from "./abstractions/VersionStrategy.ts";

/**
 * Patch types: any commit with a type not in this set and not in MINOR_TYPES is rejected.
 */
const PATCH_TYPES = new Set([
    "fix",
    "refactor",
    "test",
    "chore",
    "docs",
    "style",
    "perf",
    "build",
    "ci",
    "revert"
]);

const MINOR_TYPES = new Set(["feat"]);

/** Matches conventional commit subjects: `type(optional-scope)!: description` */
const COMMIT_RE = /^([a-z]+)(\([^)]*\))?!?:/;

class ConventionalCommitStrategy implements VersionStrategyAbstraction.Interface {
    public computeVersion(currentVersion: string, commits: string[]): VersionResult {
        let bumpType: "minor" | "patch" = "patch";

        for (const commit of commits) {
            const match = COMMIT_RE.exec(commit);
            if (!match) {
                return { error: `Commit does not follow conventional format: "${commit}"` };
            }
            const type = match[1]!;
            if (MINOR_TYPES.has(type)) {
                bumpType = "minor";
            } else if (!PATCH_TYPES.has(type)) {
                return { error: `Unknown commit type "${type}" in: "${commit}"` };
            }
        }

        // First publish always starts at 1.0.0 regardless of bump type.
        if (currentVersion === "0.0.0") {
            return { newVersion: "1.0.0", bumpType };
        }

        return { newVersion: this.bump(currentVersion, bumpType), bumpType };
    }

    private bump(current: string, type: "minor" | "patch"): string {
        const parts = current.split(".").map(Number);
        const [major, minor, patch] = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
        return type === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
    }
}

export const VersionStrategy = VersionStrategyAbstraction.createImplementation({
    implementation: ConventionalCommitStrategy,
    dependencies: []
});
