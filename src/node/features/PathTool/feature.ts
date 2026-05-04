import { createFeature } from "~/common/index.js";
import { PathTool } from "./PathTool.js";

export const PathToolFeature = createFeature({
    name: "Node/PathToolFeature",
    register(container) {
        container.register(PathTool).inSingletonScope();
    }
});
