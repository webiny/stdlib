import { createInterface } from "node:readline";
import { AgentConfigurator as AgentConfiguratorAbstraction } from "./abstractions/AgentConfigurator.js";
import type { AgentModule } from "./agents/types.js";
import claudeAgent from "./agents/claude.js";
import cursorAgent from "./agents/cursor.js";
import clineAgent from "./agents/cline.js";
import copilotAgent from "./agents/copilot.js";
import windsurfAgent from "./agents/windsurf.js";
import kiroAgent from "./agents/kiro.js";
import opencodeAgent from "./agents/opencode.js";

const AGENTS: AgentModule[] = [
    claudeAgent,
    clineAgent,
    copilotAgent,
    cursorAgent,
    kiroAgent,
    opencodeAgent,
    windsurfAgent
].sort((a, b) => a.preset.displayName.localeCompare(b.preset.displayName));

class AgentConfiguratorImpl implements AgentConfiguratorAbstraction.Interface {
    public async configure(): Promise<void> {
        console.log("\nSelect your AI agent:\n");
        for (let i = 0; i < AGENTS.length; i++) {
            console.log(`  ${i + 1}. ${AGENTS[i]!.preset.displayName}`);
        }
        console.log();

        const rl = createInterface({ input: process.stdin, output: process.stdout });

        const answer = await new Promise<string>(resolve => {
            rl.question("Enter number: ", resolve);
        });
        rl.close();

        const index = parseInt(answer, 10) - 1;
        if (isNaN(index) || index < 0 || index >= AGENTS.length) {
            console.error("Invalid selection.");
            return;
        }

        const agent = AGENTS[index]!;
        console.log(`\nConfiguring ${agent.preset.displayName}...`);
        await agent.init({ cwd: process.cwd() });
        console.log("Done.");
    }
}

export const AgentConfigurator = AgentConfiguratorAbstraction.createImplementation({
    implementation: AgentConfiguratorImpl,
    dependencies: []
});
