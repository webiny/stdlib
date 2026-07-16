import { Env as EnvAbstraction } from "~/common/features/Env/abstractions/Env.js";
import { toBoolean } from "~/common/utils/boolean/index.js";

class ProcessEnvImpl implements EnvAbstraction.Interface {
    getString(key: string): string | undefined;
    getString(key: string, defaultValue: string): string;
    getString(key: string, defaultValue?: string): string | undefined {
        const value = process.env[key];
        if (value === undefined) {
            return defaultValue;
        }
        return value;
    }

    getStringOrThrow(key: string): string {
        const value = process.env[key];
        if (value === undefined) {
            throw new Error(`Environment variable "${key}" is not set.`);
        }
        return value;
    }

    getNumber(key: string): number | undefined;
    getNumber(key: string, defaultValue: number): number;
    getNumber(key: string, defaultValue?: number): number | undefined {
        const raw = process.env[key];
        if (raw === undefined || raw === "") {
            return defaultValue;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
            return defaultValue;
        }
        return parsed;
    }

    getNumberOrThrow(key: string): number {
        const raw = process.env[key];
        if (raw === undefined || raw === "") {
            throw new Error(`Environment variable "${key}" is not set.`);
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
            throw new Error(`Environment variable "${key}" is not a valid number: "${raw}".`);
        }
        return parsed;
    }

    getBoolean(key: string): boolean | undefined;
    getBoolean(key: string, defaultValue: boolean): boolean;
    getBoolean(key: string, defaultValue?: boolean): boolean | undefined {
        const raw = process.env[key];
        if (raw === undefined) {
            return defaultValue;
        }
        return toBoolean(raw);
    }

    getBooleanOrThrow(key: string): boolean {
        const raw = process.env[key];
        if (raw === undefined) {
            throw new Error(`Environment variable "${key}" is not set.`);
        }
        return toBoolean(raw);
    }
}

export const ProcessEnv = EnvAbstraction.createImplementation({
    implementation: ProcessEnvImpl,
    dependencies: []
});

export function createProcessEnv(): EnvAbstraction.Interface {
    return new ProcessEnvImpl();
}
