import { createAbstraction } from "~/common/index.js";

export interface IAgentConfigurator {
    configure(): Promise<void>;
}

export const AgentConfigurator = createAbstraction<IAgentConfigurator>("Mcp/AgentConfigurator");

export namespace AgentConfigurator {
    export type Interface = IAgentConfigurator;
}
