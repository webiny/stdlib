import { createFeature } from "~/common/index.js";
import { ProcessEnv } from "./ProcessEnv.js";

export const ProcessEnvFeature = createFeature({
    name: "Node/ProcessEnvFeature",
    register(container) {
        container.register(ProcessEnv).inSingletonScope();
    }
});
