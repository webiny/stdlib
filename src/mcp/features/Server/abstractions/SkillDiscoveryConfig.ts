import { createAbstraction } from "~/common/index.js";

export interface ISkillDiscoveryConfig {
    manifestPath: string;
}

export const SkillDiscoveryConfig = createAbstraction<ISkillDiscoveryConfig>(
    "Mcp/SkillDiscoveryConfig"
);

export namespace SkillDiscoveryConfig {
    export type Interface = ISkillDiscoveryConfig;
}
