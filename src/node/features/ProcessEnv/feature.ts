import { createFeature } from "~/common/index.js";
import { Env } from "~/common/features/Env/abstractions/Env.js";
import { createProcessEnv } from "./ProcessEnv.js";

export interface ProcessEnvFeatureParams {
    variables?: Record<string, string | undefined>;
}

export const ProcessEnvFeature = createFeature<ProcessEnvFeatureParams | void>({
    name: "Node/ProcessEnvFeature",
    register(container, params) {
        container.registerInstance(Env, createProcessEnv(params || undefined));
    }
});
