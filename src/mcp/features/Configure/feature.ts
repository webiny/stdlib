import { createFeature } from "~/common/index.js";
import { AgentConfigurator } from "./AgentConfigurator.js";

export const AgentConfiguratorFeature = createFeature({
    name: "Mcp/AgentConfiguratorFeature",
    register(container) {
        container.register(AgentConfigurator).inSingletonScope();
    }
});
