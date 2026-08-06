import { createFeature } from "~/common/index.js";
import { DirectoryTool } from "./DirectoryTool.js";
import { GlobTool } from "../GlobTool/GlobTool.js";

export const DirectoryToolFeature = createFeature({
    name: "Core/DirectoryToolFeature",
    register(container) {
        container.register(GlobTool).inSingletonScope();
        container.register(DirectoryTool).inSingletonScope();
    }
});
