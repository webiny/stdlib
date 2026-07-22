import { createFeature } from "~/common/index.js";
import { WorkspaceTool } from "./WorkspaceTool.js";

export const WorkspaceToolFeature = createFeature({
    name: "Node/WorkspaceToolFeature",
    register(container) {
        container.register(WorkspaceTool).inSingletonScope();
    }
});
