import { createFeature } from "../../../index.js";
import { ReadStreamFactory } from "./ReadStreamFactory.js";

export const ReadStreamFactoryFeature = createFeature({
    name: "Node/ReadStreamFactoryFeature",
    register(container) {
        container.register(ReadStreamFactory).inSingletonScope();
    }
});
