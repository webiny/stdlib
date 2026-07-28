import { createAbstraction } from "~/common/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export interface IMcpServer {
    start(): Promise<void>;
    startWithTransport(transport: Transport): Promise<void>;
}

export const McpServer = createAbstraction<IMcpServer>("Mcp/McpServer");

export namespace McpServer {
    export type Interface = IMcpServer;
}
