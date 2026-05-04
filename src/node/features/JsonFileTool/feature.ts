import { createFeature } from "#common";
import { JsonFileTool } from "./JsonFileTool.js";

export const JsonFileToolFeature = createFeature({
    name: "Core/JsonFileToolFeature",
    register(container) {
        container.register(JsonFileTool).inSingletonScope();
    }
});
