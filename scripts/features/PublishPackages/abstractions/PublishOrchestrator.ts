import { Abstraction } from "@webiny/di";

export interface IPublishOrchestrator {
    run(): Promise<void>;
}

export const PublishOrchestrator = new Abstraction<IPublishOrchestrator>(
    "Scripts/PublishOrchestrator"
);

export namespace PublishOrchestrator {
    export type Interface = IPublishOrchestrator;
}
