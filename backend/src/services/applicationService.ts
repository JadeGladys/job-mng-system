import type { Request } from "express";
import { randomUUID } from "crypto";
import db from "../config/database";
import {
    extractTextFromLocalFile,
    extractTextFromRemoteFile,
} from "./documentExtractionService";
import aiScreeningService from "./aiScreeningService";
import emailService from "./emailService";

export type ApplicationFilters = {
    job_uid?: string;
    title?: string;
    location?: string;
    category?: string;
    job_type?: string;
    work_mode?: string;
    applicant_name?: string;
    applicant_email?: string;
    status?: string;
};

type ApplicationRecord = {
    uid: string;
    cover_letter_file_link: string;
    cv_link: string;
    status: ApplicationRow["status"];
    ai_score: number | null;
    ai_summary: string | null;
    ai_recommendation: string | null;
    created_at: string;
    updated_at: string;
    job_uid: string;
    title: string;
    location: string;
    category: string;
    job_type: string;
    work_mode: string;
    company: string;
    description: string;
    requirements: string;
    applicant_uid: string;
    applicant_name: string;
    applicant_email: string;
    applicant_phone_number: string;
};

type ApplicationsListResult = ApplicationRecord[];

type ServiceError = Error & {
    status?: number;
    originalError?: Error;
};

type AuthenticatedUser = NonNullable<Request["user"]>;

type CreateApplicationInput = {
    job_uid: string;
    cover_letter_file_link?: string;
    cv_link: string;
};

type ApplicationUpdateInput = {
    cover_letter_file_link?: string;
    cv_link?: string;
};

type JobRow = {
    id: number;
    uid: string;
};

type ApplicationRow = {
    id: number;
    uid: string;
    job_id: number;
    cover_letter_file_link: string;
    cv_link: string;
    status: "draft" | "pending" | "rejected" | "shortlisted";
    created_by: number;
};

type ExistingApplicationRow = {
    id: number;
};

type CreateApplicationResult = {
    message: string;
    application: {
        uid: string;
        job_uid: string;
        cover_letter_file_link: string;
        cv_link: string;
        status: "draft";
    };
};

type ActionResult = {
    message: string;
};

type AdminApplicationStatus = "rejected" | "shortlisted";

type AdminStatusUpdateInput = {
    status: AdminApplicationStatus;
};

type DbRunResult = {
    lastID: number;
    changes: number;
};

type AiScreeningResult = {
    message: string;
    screening: {
        application_uid: string;
        ai_score: number;
        ai_summary: string;
        ai_recommendation: "reject" | "review" | "shortlist";
    };
};

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

const trimOptionalString = (value?: string): string | undefined => value?.trim();

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

const dbGet = <T>(query: string, params: unknown[] = []): Promise<T | undefined> =>
    new Promise((resolve, reject) => {
        db.get(query, params, (error: Error | null, row: T | undefined) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(row);
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

const createApplication = async (
    applicationData: CreateApplicationInput,
    currentUser: AuthenticatedUser
): Promise<CreateApplicationResult> => {
    const { job_uid, cover_letter_file_link, cv_link } = applicationData;

    if (!job_uid || !cover_letter_file_link || !cv_link) {
        throw createServiceError("Job, cover letter file, and CV link are required.", 400);
    }

    const normalizedJobUid = job_uid.trim();
    const trimmedCvLink = trimOptionalString(cv_link);

    if (!normalizedJobUid || !cover_letter_file_link || !trimmedCvLink) {
        throw createServiceError("Job, cover letter file, and CV link are required.", 400);
    }

    let job: JobRow | undefined;

    try {
        job = await dbGet<JobRow>("SELECT id, uid FROM jobs WHERE uid = ?", [normalizedJobUid]);
    } catch (error) {
        throw createServiceError("Failed to validate the selected job.", 500, error as Error);
    }

    if (!job) {
        throw createServiceError("Job not found.", 404);
    }

    let existingApplication: ExistingApplicationRow | undefined;

    try {
        existingApplication = await dbGet<ExistingApplicationRow>(
            "SELECT id FROM applications WHERE job_id = ? AND created_by = ?",
            [job.id, currentUser.id]
        );
    } catch (error) {
        throw createServiceError("Failed to check existing application.", 500, error as Error);
    }

    if (existingApplication) {
        throw createServiceError("You already have an application for this job.", 409);
    }

    const applicationUid = randomUUID();

    try {
        await dbRun(
            `
            INSERT INTO applications (
                uid,
                job_id,
                cover_letter_file_link,
                cv_link,
                status,
                created_by
            )
            VALUES (?, ?, ?, ?, 'draft', ?)
            `,
            [applicationUid, job.id, cover_letter_file_link, trimmedCvLink, currentUser.id]
        );
    } catch (error) {
        throw createServiceError("Failed to create application.", 500, error as Error);
    }

    return {
        message: "Application draft created successfully.",
        application: {
            uid: applicationUid,
            job_uid: job.uid,
            cover_letter_file_link,
            cv_link: trimmedCvLink,
            status: "draft",
        },
    };
};

const updateApplication = async (
    uid: string,
    applicationData: ApplicationUpdateInput,
    currentUser: AuthenticatedUser
): Promise<ActionResult> => {
    let application: ApplicationRow | undefined;

    try {
        application = await dbGet<ApplicationRow>(
            "SELECT * FROM applications WHERE uid = ? AND created_by = ?",
            [uid, currentUser.id]
        );
    } catch (error) {
        throw createServiceError("Failed to fetch application.", 500, error as Error);
    }

    if (!application) {
        throw createServiceError("Application not found.", 404);
    }

    if (application.status !== "draft") {
        throw createServiceError("Only draft applications can be updated.", 400);
    }

    const updates: string[] = [];
    const values: Array<string | number> = [];

    if (applicationData.cover_letter_file_link !== undefined) {
        updates.push("cover_letter_file_link = ?");
        values.push(applicationData.cover_letter_file_link);
    }

    if (applicationData.cv_link !== undefined) {
        const trimmedCvLink = trimOptionalString(applicationData.cv_link);

        if (!trimmedCvLink) {
            throw createServiceError("CV link cannot be empty.", 400);
        }

        updates.push("cv_link = ?");
        values.push(trimmedCvLink);
    }

    if (updates.length === 0) {
        throw createServiceError(
            "At least a cover letter file or CV link is required for update.",
            400
        );
    }

    updates.push("updated_by = ?");
    values.push(currentUser.id);

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(uid);

    try {
        await dbRun(
            `
            UPDATE applications
            SET ${updates.join(", ")}
            WHERE uid = ?
            `,
            values
        );
    } catch (error) {
        throw createServiceError("Failed to update application.", 500, error as Error);
    }

    return {
        message: "Application updated successfully.",
    };
};

const submitApplication = async (
    uid: string,
    applicationData: ApplicationUpdateInput,
    currentUser: AuthenticatedUser
): Promise<ActionResult> => {
    let application: ApplicationRow | undefined;

    try {
        application = await dbGet<ApplicationRow>(
            "SELECT * FROM applications WHERE uid = ? AND created_by = ?",
            [uid, currentUser.id]
        );
    } catch (error) {
        throw createServiceError("Failed to fetch application.", 500, error as Error);
    }

    if (!application) {
        throw createServiceError("Application not found.", 404);
    }

    if (application.status !== "draft") {
        throw createServiceError("Only draft applications can be submitted.", 400);
    }

    const finalCoverLetterFileLink =
        applicationData.cover_letter_file_link !== undefined
            ? applicationData.cover_letter_file_link
            : application.cover_letter_file_link;

    const finalCvLink =
        applicationData.cv_link !== undefined
            ? trimOptionalString(applicationData.cv_link)
            : application.cv_link;

    if (!finalCoverLetterFileLink || !finalCvLink) {
        throw createServiceError(
            "Cover letter file and CV link are required before submission.",
            400
        );
    }

    try {
        await dbRun(
            `
            UPDATE applications
            SET
                cover_letter_file_link = ?,
                cv_link = ?,
                status = 'pending',
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE uid = ?
            `,
            [finalCoverLetterFileLink, finalCvLink, currentUser.id, uid]
        );
    } catch (error) {
        throw createServiceError("Failed to submit application.", 500, error as Error);
    }

    //send an email once the applicaion has been submitted
    let job: { title: string; company: string } | undefined;

    try {
        job = await dbGet<{ title: string; company: string }>(
            "SELECT title, company FROM jobs WHERE id = ?",
            [application.job_id]
        );
    } catch (error) {
        throw createServiceError("Failed to fetch job details.", 500, error as Error);
    }

    if (!job) {
        throw createServiceError("Related job not found.", 404);
    }

    try {
        await emailService.sendApplicationSubmittedEmail(
            currentUser.email,
            currentUser.name,
            job.title,
            job.company
        );
    } catch (error) {
        console.error(
            "Failed to send application submitted email:",
            (error as Error).message
        );
    }


    return {
        message: "Application submitted successfully.",
    };
};

const updateApplicationStatus = async (
    uid: string,
    statusUpdate: AdminStatusUpdateInput,
    currentUser: AuthenticatedUser
): Promise<ActionResult> => {
    const nextStatus = statusUpdate.status;

    if (nextStatus !== "rejected" && nextStatus !== "shortlisted") {
        throw createServiceError("Only rejected or shortlisted are allowed here.", 400);
    }

    let application: ApplicationRow | undefined;

    try {
        application = await dbGet<ApplicationRow>("SELECT * FROM applications WHERE uid = ?", [uid]);
    } catch (error) {
        throw createServiceError("Failed to fetch application.", 500, error as Error);
    }

    if (!application) {
        throw createServiceError("Application not found.", 404);
    }

    if (application.status === "draft") {
        throw createServiceError("Draft applications must be submitted before admin review.", 400);
    }

    try {
        await dbRun(
            `
            UPDATE applications
            SET
                status = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE uid = ?
            `,
            [nextStatus, currentUser.id, uid]
        );
    } catch (error) {
        throw createServiceError("Failed to update application status.", 500, error as Error);
    }

    //send email after the admin updates the status

    let job: { title: string; company: string } | undefined;

    try {
        job = await dbGet<{ title: string; company: string }>(
            "SELECT title, company FROM jobs WHERE id = ?",
            [application.job_id]
        );
    } catch (error) {
        throw createServiceError("Failed to fetch job details.", 500, error as Error);
    }

    if (!job) {
        throw createServiceError("Related job not found.", 404);
    }


    if (application.status === "rejected" || application.status === "shortlisted") {
        try {
            await emailService.sendApplicationStatusChangedEmail(
                currentUser.email,
                currentUser.name,
                job.title,
                job.company,
                application.status
            );
        } catch (error) {
            console.error(
                "Failed to send application status update email:",
                (error as Error).message
            );
        }
    }


    return {
        message:
            nextStatus === "shortlisted"
                ? "Application approved and moved to shortlisted."
                : "Application rejected successfully.",
    };
};

const deleteApplication = async (
    uid: string,
    currentUser: AuthenticatedUser
): Promise<ActionResult> => {
    let application: ApplicationRow | undefined;

    try {
        application = await dbGet<ApplicationRow>(
            "SELECT * FROM applications WHERE uid = ? AND created_by = ?",
            [uid, currentUser.id]
        );
    } catch (error) {
        throw createServiceError("Failed to fetch application.", 500, error as Error);
    }

    if (!application) {
        throw createServiceError("Application not found.", 404);
    }

    if (application.status !== "draft") {
        throw createServiceError("Only draft applications can be deleted.", 400);
    }

    try {
        await dbRun("DELETE FROM applications WHERE uid = ?", [uid]);
    } catch (error) {
        throw createServiceError("Failed to delete application.", 500, error as Error);
    }

    return {
        message: "Application deleted successfully.",
    };
};

const applyApplicationFilters = (
    conditions: string[],
    params: string[],
    filters: ApplicationFilters
): void => {
    const {
        job_uid,
        title,
        location,
        category,
        job_type,
        work_mode,
        applicant_name,
        applicant_email,
        status,
    } = filters;

    if (job_uid) {
        conditions.push("jobs.uid = ?");
        params.push(job_uid);
    }

    if (title) {
        conditions.push("jobs.title LIKE ?");
        params.push(`%${title}%`);
    }

    if (location) {
        conditions.push("jobs.location LIKE ?");
        params.push(`%${location}%`);
    }

    if (category) {
        conditions.push("jobs.category LIKE ?");
        params.push(`%${category}%`);
    }

    if (job_type) {
        conditions.push("jobs.job_type LIKE ?");
        params.push(`%${job_type}%`);
    }

    if (work_mode) {
        conditions.push("jobs.work_mode LIKE ?");
        params.push(`%${work_mode}%`);
    }

    if (applicant_name) {
        conditions.push("users.name LIKE ?");
        params.push(`%${applicant_name}%`);
    }

    if (applicant_email) {
        conditions.push("users.email LIKE ?");
        params.push(`%${applicant_email}%`);
    }

    if (status) {
        conditions.push("applications.status = ?");
        params.push(status);
    }
};

const getAllApplications = async (
    filters: ApplicationFilters = {}
): Promise<ApplicationsListResult> => {

    let query = `
        SELECT
            applications.uid,
            applications.cover_letter_file_link,
            applications.cv_link,
            applications.status,
            applications.ai_score,
            applications.ai_summary,
            applications.ai_recommendation,
            applications.created_at,
            applications.updated_at,
            jobs.uid AS job_uid,
            jobs.title,
            jobs.location,
            jobs.category,
            jobs.job_type,
            jobs.work_mode,
            jobs.company,
            jobs.description,
            jobs.requirements,
            users.uid AS applicant_uid,
            users.name AS applicant_name,
            users.email AS applicant_email,
            users.phone_number AS applicant_phone_number
        FROM applications
        INNER JOIN jobs ON applications.job_id = jobs.id
        INNER JOIN users ON applications.created_by = users.id
    `;

    const conditions: string[] = ["applications.status IN ('pending', 'rejected', 'shortlisted')"];
    const params: string[] = [];

    applyApplicationFilters(conditions, params, filters);

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY applications.created_at DESC";

    try {
        return await dbAll<ApplicationRecord>(query, params);
    } catch (error) {
        throw createServiceError("Failed to fetch applications.", 500, error as Error);
    }
};

const getApplicationByUid = async (
    uid: string
): Promise<ApplicationRecord | undefined> => {
    try {
        return await dbGet<ApplicationRecord>(
            `
            SELECT
                applications.uid,
                applications.cover_letter_file_link,
                applications.cv_link,
                applications.status,
                applications.ai_score,
                applications.ai_summary,
                applications.ai_recommendation,
                applications.created_at,
                applications.updated_at,
                jobs.uid AS job_uid,
                jobs.title,
                jobs.location,
                jobs.category,
                jobs.job_type,
                jobs.work_mode,
                jobs.company,
                jobs.description,
                jobs.requirements,
                users.uid AS applicant_uid,
                users.name AS applicant_name,
                users.email AS applicant_email,
                users.phone_number AS applicant_phone_number
            FROM applications
            INNER JOIN jobs ON applications.job_id = jobs.id
            INNER JOIN users ON applications.created_by = users.id
            WHERE applications.uid = ?
            `,
            [uid]
        );
    } catch (error) {
        throw createServiceError("Failed to fetch application.", 500, error as Error);
    }
};

const getMyApplications = async (
    currentUser: AuthenticatedUser,
    filters: ApplicationFilters = {}
): Promise<ApplicationsListResult> => {
    let query = `
        SELECT
            applications.uid,
            applications.cover_letter_file_link,
            applications.cv_link,
            applications.status,
            applications.ai_score,
            applications.ai_summary,
            applications.ai_recommendation,
            applications.created_at,
            applications.updated_at,
            jobs.uid AS job_uid,
            jobs.title,
            jobs.location,
            jobs.category,
            jobs.job_type,
            jobs.work_mode,
            jobs.company,
            jobs.description,
            jobs.requirements,
            users.uid AS applicant_uid,
            users.name AS applicant_name,
            users.email AS applicant_email,
            users.phone_number AS applicant_phone_number
        FROM applications
        INNER JOIN jobs ON applications.job_id = jobs.id
        INNER JOIN users ON applications.created_by = users.id
    `;

    const conditions: string[] = ["applications.created_by = ?"];
    const params: string[] = [String(currentUser.id)];

    applyApplicationFilters(conditions, params, filters);

    query += ` WHERE ${conditions.join(" AND ")}`;
    query += " ORDER BY applications.created_at DESC";

    try {
        return await dbAll<ApplicationRecord>(query, params);
    } catch (error) {
        throw createServiceError("Failed to fetch user applications.", 500, error as Error);
    }
};

const runApplicationAiScreening = async (
    uid: string,
    currentUser: { id: number }
): Promise<AiScreeningResult> => {
    const application = await getApplicationByUid(uid);

    if (!application) {
        throw createServiceError("Application not found.", 404);
    }

    if (application.status === "draft") {
        throw createServiceError("Draft applications cannot be screened.", 400);
    }

    let cvText = "";
    let coverLetterText = "";

    try {
        cvText = await extractTextFromRemoteFile(application.cv_link);
    } catch (error) {
        throw createServiceError("Failed to read CV from the provided link.", 400, error as Error);
    }

    try {
        coverLetterText = await extractTextFromLocalFile(application.cover_letter_file_link);
    } catch (error) {
        throw createServiceError("Failed to read the uploaded cover letter file.", 400, error as Error);
    }

    const aiResult = await aiScreeningService.screenApplication({
        applicantName: application.applicant_name,
        applicantEmail: application.applicant_email,
        applicantPhoneNumber: application.applicant_phone_number,
        jobTitle: application.title,
        company: application.company,
        location: application.location,
        category: application.category,
        jobType: application.job_type,
        workMode: application.work_mode,
        jobDescription: application.description,
        jobRequirements: application.requirements,
        cvText,
        coverLetterText,
    });

    try {
        await dbRun(
            `
            UPDATE applications
            SET
                ai_score = ?,
                ai_summary = ?,
                ai_recommendation = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE uid = ?
            `,
            [
                aiResult.score,
                aiResult.summary,
                aiResult.recommendation,
                currentUser.id,
                uid,
            ]
        );
    } catch (error) {
        throw createServiceError("Failed to save AI screening result.", 500, error as Error);
    }

    return {
        message: "AI screening completed successfully.",
        screening: {
            application_uid: uid,
            ai_score: aiResult.score,
            ai_summary: aiResult.summary,
            ai_recommendation: aiResult.recommendation,
        },
    };
};


export default {
    createApplication,
    updateApplication,
    submitApplication,
    getAllApplications,
    getMyApplications,
    updateApplicationStatus,
    deleteApplication,
    runApplicationAiScreening,
};
