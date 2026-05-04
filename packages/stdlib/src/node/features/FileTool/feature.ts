import { createFeature } from "~/common";
import { FileTool } from "./FileTool.js";

export const FileToolFeature = createFeature({
    name: "Core/FileToolFeature",
    register(container) {
        container.register(FileTool).inSingletonScope();
    }
});
