import { Logger } from "~/common/index.js";

export class LineAccumulator {
    private pending: string[] = [];

    public constructor(private readonly logger: Logger.Interface) {}

    public feed(line: string): Record<string, unknown> | null {
        if (this.pending.length === 0) {
            try {
                return JSON.parse(line) as Record<string, unknown>;
            } catch {
                this.logger.debug("Failed to parse line, accumulating");
                this.pending.push(line);
                return null;
            }
        }

        try {
            const record = JSON.parse([...this.pending, line].join("\n")) as Record<
                string,
                unknown
            >;
            this.pending = [];
            this.logger.debug("Newline-joined accumulation parsed successfully");
            return record;
        } catch {
            // try next strategy
        }

        try {
            const record = JSON.parse([...this.pending, line].join("")) as Record<string, unknown>;
            this.pending = [];
            this.logger.debug("Empty-string-joined accumulation parsed successfully");
            return record;
        } catch {
            // try next strategy
        }

        try {
            const record = JSON.parse(line) as Record<string, unknown>;
            this.logger.warn(
                `Discarding ${this.pending.length} accumulated line(s) that could not form valid JSON`
            );
            this.pending = [];
            return record;
        } catch {
            this.logger.debug(
                `All strategies failed, continuing to accumulate (${this.pending.length + 1} lines pending)`
            );
            this.pending.push(line);
            return null;
        }
    }

    /**
     * Attempt a final parse of any buffered lines. Returns the record on success,
     * logs a warning and returns null on failure.
     */
    public flush(): Record<string, unknown> | null {
        if (this.pending.length === 0) {
            return null;
        }
        const combined = this.pending.join("\n");
        this.pending = [];
        try {
            return JSON.parse(combined) as Record<string, unknown>;
        } catch {
            this.logger.warn(
                `Discarding ${combined.split("\n").length} unfinished accumulated line(s) at end of input`
            );
            return null;
        }
    }
}
