import { execFileSync } from "node:child_process";
import { NpmRegistry as NpmRegistryAbstraction } from "./abstractions/NpmRegistry.ts";
import { bin } from "../../bin.ts";

class NpmRegistryImpl implements NpmRegistryAbstraction.Interface {
    public getLatestVersion(packageName: string): string | null {
        try {
            return (
                execFileSync(bin("npm"), ["view", packageName, "version"], {
                    encoding: "utf8",
                    stdio: ["pipe", "pipe", "pipe"]
                }).trim() || null
            );
        } catch {
            return null;
        }
    }

    public publish(distDir: string): void {
        execFileSync(bin("npm"), ["publish", "--access", "public"], {
            cwd: distDir,
            stdio: "inherit"
        });
    }
}

export const NpmRegistry = NpmRegistryAbstraction.createImplementation({
    implementation: NpmRegistryImpl,
    dependencies: []
});
