import { createFeature } from "@webiny/utils-common";
import { ReadStreamFactory } from "./ReadStreamFactory.js";

export const ReadStreamFactoryFeature = createFeature({
    name: "Node/ReadStreamFactoryFeature",
    register(container) {
        container.register(ReadStreamFactory).inSingletonScope();
    }
});
