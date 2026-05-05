import { BaseError } from "~/common/index.js";
import type { ErrorInput } from "~/common/index.js";

interface PackageNotFoundData {
    specifier: string;
}

/** Thrown when a package-relative specifier cannot be resolved to a filesystem path. */
export class PackageNotFoundError extends BaseError<PackageNotFoundData> {
    public readonly code = "PACKAGE_NOT_FOUND" as const;
    public constructor(input: ErrorInput<PackageNotFoundData>) {
        super(input);
    }
}
