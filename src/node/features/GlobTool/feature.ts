import { createFeature } from "~/common/index.js";
import { GlobTool } from "./GlobTool.js";

export const GlobToolFeature = createFeature({
    name: "Core/GlobToolFeature",
    register(container) {
        container.register(GlobTool).inSingletonScope();
    }
});
