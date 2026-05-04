import { createFeature } from "@webiny/utils-common";
import { PinoLogger } from "./PinoLogger.js";

/**
 * Registers PinoLogger as the Logger implementation.
 * Optionally pair with PinoLoggerConfig to override defaults (info + pretty).
 */
export const PinoLoggerFeature = createFeature({
    name: "Node/PinoLoggerFeature",
    register(container) {
        container.register(PinoLogger).inSingletonScope();
    }
});
