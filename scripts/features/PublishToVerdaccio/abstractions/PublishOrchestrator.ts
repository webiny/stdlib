import { Abstraction } from "@webiny/di";

export interface IPublishOrchestrator {
    /**
     * Injects the target version into dist/package.json and publishes
     * the package to the local Verdaccio registry at http://localhost:4873.
     * Throws if the npm publish command exits with a non-zero status.
     */
    run(): void;
}

export const PublishOrchestrator = new Abstraction<IPublishOrchestrator>(
    "Scripts/VerdaccioPublish/PublishOrchestrator"
);

export namespace PublishOrchestrator {
    export type Interface = IPublishOrchestrator;
}
