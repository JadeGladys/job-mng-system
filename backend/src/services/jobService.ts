import type { Request } from "express";
import { randomUUID } from "crypto";
import db from "../config/database";

type ServiceError = Error & {
    status?: number;
    originalError?: Error;
};

type AuthenticatedUser = NonNullable<Request["user"]>;

export type JobFilters = {
    title?: string;
    location?: string;
    category?: string;
    job_type?: string;
    work_mode?: string;
};

export type JobInput = {
    title: string;
    description: string;
    location: string;
    company: string;
    category: string;
    job_type: string;
    work_mode: string;
    requirements: string;
    deadline: string;
};

type JobRecord = JobInput & {
    uid: string;
    created_at?: string;
    updated_at?: string;
};

type JobsListResult = JobRecord[];

type CreateJobResult = {
    message: string;
    job: JobRecord;
};

type UpdateJobResult = {
    message: string;
};

type DeleteJobResult = {
    message: string;
};

type DbRunResult = {
    lastID: number;
    changes: number;
};

const REQUIRED_JOB_FIELDS: (keyof JobInput)[] = [
    "title",
    "description",
    "location",
    "company",
    "category",
    "job_type",
    "work_mode",
    "requirements",
    "deadline",
];

const UPDATABLE_JOB_FIELDS: (keyof JobInput)[] = [...REQUIRED_JOB_FIELDS];

const createServiceError = (
    message: string,
    status: number,
    originalError?: Error
): ServiceError => {
    const error = new Error(message) as ServiceError;
    error.status = status;

    if (originalError) {
        error.originalError = originalError;
    }

    return error;
};

const dbAll = <T>(query: string, params: unknown[] = []): Promise<T[]> =>
    new Promise((resolve, reject) => {
        db.all(query, params, (error: Error | null, rows: T[]) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(rows);
        });
    });

const dbRun = (query: string, params: unknown[] = []): Promise<DbRunResult> =>
    new Promise((resolve, reject) => {
        db.run(query, params, function onRun(this: DbRunResult, error: Error | null) {
            if (error) {
                reject(error);
                return;
            }

            resolve({
                lastID: this.lastID,
                changes: this.changes,
            });
        });
    });

const getAllJobs = async (filters: JobFilters = {}): Promise<JobsListResult> => {
    const { title, location, category, job_type, work_mode } = filters;

    let query = `
        SELECT
            uid,
            title,
            description,
            location,
            company,
            category,
            job_type,
            work_mode,
            requirements,
            deadline,
            created_at,
            updated_at
        FROM jobs
    `;

    const conditions: string[] = [];
    const params: string[] = [];

    if (title) {
        conditions.push("title LIKE ?");
        params.push(`%${title}%`);
    }

    if (location) {
        conditions.push("location LIKE ?");
        params.push(`%${location}%`);
    }

    if (category) {
        conditions.push("category LIKE ?");
        params.push(`%${category}%`);
    }

    if (job_type) {
        conditions.push("job_type LIKE ?");
        params.push(`%${job_type}%`);
    }

    if (work_mode) {
        conditions.push("work_mode LIKE ?");
        params.push(`%${work_mode}%`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY created_at DESC";

    try {
        return await dbAll<JobRecord>(query, params);
    } catch (error) {
        throw createServiceError("Failed to fetch jobs.", 500, error as Error);
    }
};

const createJob = async (
    jobData: JobInput,
    currentUser: AuthenticatedUser
): Promise<CreateJobResult> => {
    const missingField = REQUIRED_JOB_FIELDS.find((field) => !jobData[field]);

    if (missingField) {
        throw createServiceError("All job fields are required.", 400);
    }

    const jobUid = randomUUID();
    const trimmedJobData: JobInput = {
        title: jobData.title.trim(),
        description: jobData.description.trim(),
        location: jobData.location.trim(),
        company: jobData.company.trim(),
        category: jobData.category.trim(),
        job_type: jobData.job_type.trim(),
        work_mode: jobData.work_mode.trim(),
        requirements: jobData.requirements.trim(),
        deadline: jobData.deadline,
    };

    try {
        await dbRun(
            `
            INSERT INTO jobs (
                uid,
                title,
                description,
                location,
                company,
                category,
                job_type,
                work_mode,
                requirements,
                deadline,
                created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                jobUid,
                trimmedJobData.title,
                trimmedJobData.description,
                trimmedJobData.location,
                trimmedJobData.company,
                trimmedJobData.category,
                trimmedJobData.job_type,
                trimmedJobData.work_mode,
                trimmedJobData.requirements,
                trimmedJobData.deadline,
                currentUser.id,
            ]
        );
    } catch (error) {
        throw createServiceError("Failed to create job.", 500, error as Error);
    }

    return {
        message: "Job created successfully.",
        job: {
            uid: jobUid,
            ...trimmedJobData,
        },
    };
};

const updateJob = async (
    uid: string,
    jobData: Partial<JobInput>
): Promise<UpdateJobResult> => {
    const updates: string[] = [];
    const values: string[] = [];

    UPDATABLE_JOB_FIELDS.forEach((field) => {
        if (jobData[field] !== undefined) {
            updates.push(`${field} = ?`);
            values.push(
                typeof jobData[field] === "string"
                    ? jobData[field].trim()
                    : String(jobData[field])
            );
        }
    });

    if (updates.length === 0) {
        throw createServiceError("At least one valid field is required for update.", 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(uid);

    const query = `
        UPDATE jobs
        SET ${updates.join(", ")}
        WHERE uid = ?
    `;

    let result: DbRunResult;

    try {
        result = await dbRun(query, values);
    } catch (error) {
        throw createServiceError("Failed to update job.", 500, error as Error);
    }

    if (result.changes === 0) {
        throw createServiceError("Job not found.", 404);
    }

    return {
        message: "Job updated successfully.",
    };
};

const deleteJob = async (uid: string): Promise<DeleteJobResult> => {
    let result: DbRunResult;

    try {
        result = await dbRun("DELETE FROM jobs WHERE uid = ?", [uid]);
    } catch (error) {
        throw createServiceError("Failed to delete job.", 500, error as Error);
    }

    if (result.changes === 0) {
        throw createServiceError("Job not found.", 404);
    }

    return {
        message: "Job deleted successfully.",
    };
};

export default {
    getAllJobs,
    createJob,
    updateJob,
    deleteJob,
};
