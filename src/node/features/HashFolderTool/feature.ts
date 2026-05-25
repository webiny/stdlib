import { createFeature } from "~/common/index.js";
import { HashFolderTool } from "./HashFolderTool.js";

export const HashFolderToolFeature = createFeature({
    name: "Node/HashFolderToolFeature",
    register(container) {
        container.register(HashFolderTool).inSingletonScope();
    }
});
