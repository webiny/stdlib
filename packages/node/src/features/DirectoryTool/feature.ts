import { createFeature } from "@webiny/utils-common";
import { DirectoryTool } from "./DirectoryTool.js";

export const DirectoryToolFeature = createFeature({
    name: "Core/DirectoryToolFeature",
    register(container) {
        container.register(DirectoryTool).inSingletonScope();
    }
});
