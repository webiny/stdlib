import { createFeature } from "../../../index.js";
import { DirectoryTool } from "./DirectoryTool.js";

export const DirectoryToolFeature = createFeature({
    name: "Core/DirectoryToolFeature",
    register(container) {
        container.register(DirectoryTool).inSingletonScope();
    }
});
