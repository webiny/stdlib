import { BaseError } from "~/common/index.js";
import type { ErrorInput } from "~/common/index.js";

interface DirectoryCreateData {
    path: string;
}

/** The directory could not be created (permissions, read-only filesystem, etc.). */
export class DirectoryCreateError extends BaseError<DirectoryCreateData> {
    public readonly code = "DIRECTORY_CREATE_FAILED" as const;
    public constructor(input: ErrorInput<DirectoryCreateData>) {
        super(input);
    }
}
