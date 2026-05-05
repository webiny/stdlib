import { createFeature } from "~/common/index.js";
import { NdJsonReaderTool } from "./NdJsonReaderTool.js";

export const NdJsonReaderToolFeature = createFeature({
    name: "Node/NdJsonReaderToolFeature",
    register(container) {
        container.register(NdJsonReaderTool).inSingletonScope();
    }
});
