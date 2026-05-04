type ErrorDataWithOptionalData<TData> = TData extends void
    ? { message: string; data?: never; stack: string }
    : { message: string; data: TData; stack: string };

export abstract class BaseError<TData = void> extends Error {
    public abstract readonly code: string;
    public readonly data: TData extends void ? undefined : TData;

    protected constructor(input: ErrorDataWithOptionalData<TData>) {
        super(input.message);
        this.stack = input?.stack || "";
        this.data = input.data as any;
    }
}
