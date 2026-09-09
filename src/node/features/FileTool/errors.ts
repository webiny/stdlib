import { BaseError } from "~/common/index.js";
import type { ErrorInput } from "~/common/index.js";

interface FileWriteData {
    path: string;
}

interface FileCopyData {
    source: string;
    target: string;
}

/** The file could not be written (directory creation failure, permissions, disk full, etc.). */
export class FileWriteError extends BaseError<FileWriteData> {
    public readonly code = "FILE_WRITE_FAILED" as const;
    public constructor(input: ErrorInput<FileWriteData>) {
        super(input);
    }
}

/** The file could not be copied (source not found, permissions, directory creation failure, etc.). */
export class FileCopyError extends BaseError<FileCopyData> {
    public readonly code = "FILE_COPY_FAILED" as const;
    public constructor(input: ErrorInput<FileCopyData>) {
        super(input);
    }
}
