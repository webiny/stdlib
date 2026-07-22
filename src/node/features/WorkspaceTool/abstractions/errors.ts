import { BaseError } from "~/common/index.js";
import type { ErrorInput } from "~/common/index.js";

export class WorkspaceRootNotFoundError extends BaseError {
    public readonly code = "WORKSPACE_ROOT_NOT_FOUND" as const;
    public constructor(input: ErrorInput) {
        super(input);
    }
}
