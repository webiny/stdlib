export type ErrorInput<TData = void> = TData extends void
    ? { message: string; data?: never }
    : { message: string; data: TData };

export abstract class BaseError<TData = void> extends Error {
    public abstract readonly code: string;
    public readonly data: TData extends void ? undefined : TData;

    protected constructor(input: ErrorInput<TData>) {
        super(input.message);
        this.data = input.data as any;
    }
}
