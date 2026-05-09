import type { Job } from "../features/jobsSlice";

export const DEFAULT_CATEGORY_OPTIONS = [
    "Engineering",
    "Design",
    "Marketing",
    "Data",
    "Product",
    "Operations",
    "Support",
    "IT"
];

export const DEFAULT_JOB_TYPE_OPTIONS = [
    "Full-time",
    "Part-time",
    "Internship",
    "Contract",
];

export const DEFAULT_WORK_MODE_OPTIONS = [
    "Remote",
    "Hybrid",
    "On-site",
];

const normalizeValue = (value: string): string => value.trim().toLowerCase();

const normalizeWorkMode = (value: string): string =>
    normalizeValue(value).replace(/[\s-]+/g, "");

export const formatWorkModeLabel = (value: string): string => {
    if (normalizeWorkMode(value) === "onsite") {
        return "On-site";
    }

    return value;
};

export const mergeOptionValues = (
    values: string[],
    defaults: string[] = []
): string[] => {
    const seen = new Set<string>();
    const merged: string[] = [];

    [...defaults, ...values]
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => {
            const normalized = normalizeValue(value);

            if (seen.has(normalized)) {
                return;
            }

            seen.add(normalized);
            merged.push(value);
        });

    return merged.sort((left, right) => left.localeCompare(right));
};

export const mergeWorkModeValues = (values: string[]): string[] => {
    const byMode = new Map<string, string>();

    values
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => {
            const normalized = normalizeWorkMode(value);

            if (!byMode.has(normalized)) {
                byMode.set(normalized, value);
            }
        });

    DEFAULT_WORK_MODE_OPTIONS.forEach((value) => {
        byMode.set(normalizeWorkMode(value), value);
    });

    return Array.from(byMode.values()).sort((left, right) =>
        formatWorkModeLabel(left).localeCompare(formatWorkModeLabel(right))
    );
};

export const buildCategoryOptions = (jobs: Job[]): string[] =>
    mergeOptionValues(
        jobs.map((job) => job.category),
        DEFAULT_CATEGORY_OPTIONS
    );

export const buildJobTypeOptions = (jobs: Job[]): string[] =>
    mergeOptionValues(
        jobs.map((job) => job.job_type),
        DEFAULT_JOB_TYPE_OPTIONS
    );

export const buildWorkModeOptions = (jobs: Job[]): string[] =>
    mergeWorkModeValues(jobs.map((job) => job.work_mode));
