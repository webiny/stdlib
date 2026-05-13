# Verdaccio Publish Feature Refactor

## Goal

Refactor `scripts/publishToVerdaccio.ts` from a flat procedural script into a proper DI-based feature following the same pattern as `scripts/features/PublishPackages/`, so the structure is consistent and readable.

## Feature Structure

```
scripts/features/PublishToVerdaccio/
├── abstractions/
│   ├── ProjectConfig.ts        # { rootDir: string, packageName: string, version: string }
│   ├── PublishOrchestrator.ts  # { run(): void }
│   └── index.ts
├── PublishOrchestrator.ts      # implementation
└── index.ts                    # run(rootDir, version) entry point
```

## Components

### `abstractions/ProjectConfig.ts`

DI token + interface:

```ts
interface IProjectConfig {
    rootDir: string;
    packageName: string;
    version: string;
}
```

### `abstractions/PublishOrchestrator.ts`

DI token + interface:

```ts
interface IPublishOrchestrator {
    run(): void;
}
```

### `PublishOrchestrator.ts`

Implementation. Injected dependencies: `ProjectConfig`.

Flow:
1. Read `dist/package.json`
2. Set `version` to `config.version`
3. Write `dist/package.json` back (2-space indent + trailing newline)
4. Log: `Publishing <name>@<version> to http://localhost:4873 ...`
5. `execFileSync(bin("npm"), ["publish", "--registry", "http://localhost:4873"], { cwd: distDir, stdio: "inherit" })`

No `NpmRegistry` abstraction — YAGNI, there is only one registry target.

### `index.ts`

```ts
export function run(rootDir: string, version: string): void {
    const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")) as { name: string };
    const container = new Container();
    container.registerInstance(ProjectConfig, { rootDir, packageName: pkg.name, version });
    container.register(PublishOrchestratorImpl).inSingletonScope();
    container.resolve(PublishOrchestrator).run();
}
```

## Entry Script

`scripts/publishToVerdaccio.ts` becomes thin arg-parsing glue:

```ts
import { fileURLToPath } from "node:url";
import { run as build } from "./features/BuildPackages/index.ts";
import { run as publish } from "./features/PublishToVerdaccio/index.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

const versionIndex = process.argv.indexOf("--version");
const versionValue = process.argv[versionIndex + 1];
if (versionIndex === -1 || !versionValue || versionValue.startsWith("-")) {
    console.error(
        "Error: --version <x> is required.\n" +
            "Example: yarn publish:verdaccio --version 1.0.0-beta.abcdefg"
    );
    process.exit(1);
}

build(root);
publish(root, versionValue);
```

## Constraints

- Node 24 strip-only: `.ts` extensions in all relative imports within `scripts/`, no parameter properties in classes (expand to explicit field declarations).
- `bin("npm")` from `scripts/bin.ts` for cross-platform compatibility.
- No changes to `PublishPackages`, `BuildPackages`, or any `src/` code.
- `package.json` scripts block unchanged — `publish:verdaccio` entry stays as-is.
