import { createAbstraction } from "~/common/index.js";

export interface ListWorkspacesParams {
    /** Directory to start searching from. Walks up until a package.json with workspaces is found. Defaults to process.cwd(). */
    cwd?: string;
}

export interface WorkspaceInfo {
    /** Package name from the workspace's package.json, or the folder name if no name field exists. */
    name: string;
    /** Absolute path to the workspace directory. */
    path: string;
}

/**
 * Discovers workspaces defined in the nearest root package.json.
 * Supports both flat array and { packages: [] } workspace formats.
 */
export interface IWorkspaceTool {
    /** List all workspace directories from the nearest root package.json with a workspaces field. */
    list(params?: ListWorkspacesParams): WorkspaceInfo[];
}

export const WorkspaceTool = createAbstraction<IWorkspaceTool>("Node/WorkspaceTool");

export namespace WorkspaceTool {
    export type Interface = IWorkspaceTool;
}
