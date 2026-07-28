export interface AgentPreset {
    slug: string;
    displayName: string;
    configFile: string;
    configKey: string;
    hintFile?: string;
}

export interface AgentModule {
    preset: AgentPreset;
    init: (params: { cwd: string }) => Promise<void>;
}
