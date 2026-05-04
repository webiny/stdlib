import { createFeature } from "../../core/index.js";
import { ConsoleLogger } from "./ConsoleLogger.js";

/**
 * Registers ConsoleLogger as the Logger implementation.
 * Optionally pair with ConsoleLoggerConfig to override defaults.
 */
export const ConsoleLoggerFeature = createFeature({
    name: "Core/ConsoleLoggerFeature",
    register(container) {
        container.register(ConsoleLogger).inSingletonScope();
    }
});
