import { createFeature } from "../../../index.js";
import { PackageJsonFileTool } from "./PackageJsonFileTool.js";

export const PackageJsonFileToolFeature = createFeature({
    name: "Node/PackageJsonFileToolFeature",
    register(container) {
        container.register(PackageJsonFileTool).inSingletonScope();
    }
});
