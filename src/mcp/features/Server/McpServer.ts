import { McpServer as SdkMcpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { McpServer as McpServerAbstraction } from "./abstractions/McpServer.js";
import { SkillDiscovery, type Skill } from "./abstractions/SkillDiscovery.js";

const CONTEXT_HEADINGS: Record<string, string> = {
    common: "Platform-agnostic utilities",
    node: "Node.js-specific tools",
    browser: "Browser-specific tools",
    guides: "Cross-cutting guides and patterns"
};

const CONTEXT_ORDER = ["common", "node", "browser", "guides"];

function buildCatalog(skills: Skill[]): string {
    if (skills.length === 0) {
        return "No skills found.";
    }

    const groups = new Map<string, Skill[]>();
    for (const skill of skills) {
        const existing = groups.get(skill.context);
        if (existing) {
            existing.push(skill);
        } else {
            groups.set(skill.context, [skill]);
        }
    }

    for (const [, group] of groups) {
        group.sort((a, b) => a.name.localeCompare(b.name));
    }

    const sections: string[] = [];
    const orderedContexts = [
        ...CONTEXT_ORDER.filter(c => groups.has(c)),
        ...[...groups.keys()].filter(c => !CONTEXT_ORDER.includes(c)).sort()
    ];

    for (const ctx of orderedContexts) {
        const heading = CONTEXT_HEADINGS[ctx] ?? ctx;
        const group = groups.get(ctx)!;
        const rows = group.map(s => `| ${s.name} | ${s.description} |`).join("\n");
        sections.push(`## ${heading}\n\n| Skill | Description |\n|-------|-------------|\n${rows}`);
    }

    return sections.join("\n\n");
}

class McpServerImpl implements McpServerAbstraction.Interface {
    public constructor(private readonly skillDiscovery: SkillDiscovery.Interface) {}

    public async start(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.startWithTransport(transport);
    }

    public async startWithTransport(transport: Transport): Promise<void> {
        const skills = this.skillDiscovery.discover();
        const skillMap = new Map<string, Skill>();
        for (const skill of skills) {
            skillMap.set(skill.name, skill);
        }

        const server = new SdkMcpServer({ name: "stdlib", version: "1.0.0" });

        server.registerTool(
            "list_stdlib_skills",
            {
                title: "List stdlib skills",
                description:
                    "Returns a catalog of all available @webiny/stdlib skills. Call this first when working with @webiny/stdlib, then call get_stdlib_skill to load a specific skill.",
                annotations: { readOnlyHint: true }
            },
            () => ({
                content: [{ type: "text" as const, text: buildCatalog(skills) }]
            })
        );

        server.registerTool(
            "get_stdlib_skill",
            {
                title: "Get stdlib skill",
                description:
                    "Loads full documentation for a specific @webiny/stdlib skill. Call list_stdlib_skills first to see available names.",
                inputSchema: { topic: z.string().describe("Skill name from list_stdlib_skills") },
                annotations: { readOnlyHint: true }
            },
            ({ topic }) => {
                const skill = skillMap.get(topic);
                if (!skill) {
                    const available = [...skillMap.keys()]
                        .sort()
                        .map(n => {
                            const s = skillMap.get(n)!;
                            return `- ${n} (${s.context})`;
                        })
                        .join("\n");
                    return {
                        isError: true,
                        content: [
                            {
                                type: "text" as const,
                                text: `Skill "${topic}" not found. Available skills:\n${available}`
                            }
                        ]
                    };
                }
                return {
                    content: [{ type: "text" as const, text: skill.body }]
                };
            }
        );

        await server.connect(transport);
    }
}

export const McpServer = McpServerAbstraction.createImplementation({
    implementation: McpServerImpl,
    dependencies: [SkillDiscovery]
});
