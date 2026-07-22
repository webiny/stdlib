export {
    WorkspaceTool,
    type ListWorkspacesParams,
    type WorkspaceInfo
} from "./abstractions/index.js";
export { WorkspaceRootNotFoundError } from "./abstractions/index.js";
export { WorkspaceToolFeature } from "./feature.js";
export { createWorkspaceTool, listWorkspaces } from "./WorkspaceTool.js";
