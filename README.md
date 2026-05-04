# webiny-node-utils

A Yarn 4 monorepo of TypeScript utility packages published under the `@webiny/` scope. All packages are built on a constructor-injection DI system and share a single synchronized version.

## Packages

| Package                                       | Description                                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [`@webiny/utils-common`](./packages/common)   | Platform-agnostic utilities — `Result`, `BaseError`, `Logger`, `Cache`. Safe in Node, browser, and edge workers. |
| [`@webiny/utils-node`](./packages/node)       | Node.js utils — `FileTool`, `DirectoryTool`, `PinoLogger`.                                                       |
| [`@webiny/utils-browser`](./packages/browser) | Browser utils — `LocalStorageCacheFeature`.                                                                      |

## Development

```sh
yarn install
yarn build          # clean + compile all packages
yarn test           # run all tests
yarn test:coverage  # with v8 coverage
yarn typecheck      # type-check all packages + scripts
```

## Publishing

```sh
node scripts/publishPackages.ts           # dry run — logs release plan, no side effects
node scripts/publishPackages.ts --publish # real release: changelog, npm publish, git tag
```

All packages are versioned and released together. The version is computed from conventional commits since the last tag and injected into `dist/package.json` at publish time — source `package.json` files always stay at `0.0.0`.
