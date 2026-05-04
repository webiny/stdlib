import { BaseError } from "~/common/index.js";

/** Thrown when a package-relative specifier cannot be resolved to a filesystem path. */
export class PackageNotFoundError extends BaseError<{ specifier: string }> {
    public readonly code = "PACKAGE_NOT_FOUND" as const;
    public constructor(input: { message: string; data: { specifier: string }; stack: string }) {
        super(input);
    }
}
