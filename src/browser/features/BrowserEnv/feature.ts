import { createFeature } from "~/common/index.js";
import { Env } from "~/common/features/Env/abstractions/Env.js";
import { createBrowserEnv } from "./BrowserEnv.js";

export interface BrowserEnvFeatureParams {
    variables: Record<string, string>;
}

export const BrowserEnvFeature = createFeature<BrowserEnvFeatureParams>({
    name: "Browser/BrowserEnvFeature",
    register(container, params) {
        container.registerInstance(Env, createBrowserEnv(params));
    }
});
