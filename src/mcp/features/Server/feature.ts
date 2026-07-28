import { createFeature } from "~/common/index.js";
import { SkillDiscovery } from "./SkillDiscovery.js";
import { McpServer } from "./McpServer.js";

export const McpServerFeature = createFeature({
    name: "Mcp/McpServerFeature",
    register(container) {
        container.register(SkillDiscovery).inSingletonScope();
        container.register(McpServer).inSingletonScope();
    }
});
