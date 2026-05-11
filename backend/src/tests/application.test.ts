import request from "supertest";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import path from "path";
import app from "../app";
import db from "../config/database";

const fixtureFilePath = path.resolve(__dirname, "fixtures/cover-letter.pdf");

const createUniqueEmail = (prefix: string): string =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

const createUniqueValue = (prefix: string): string =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const loginUser = async (email: string, password: string) =>
    request(app).post("/api/auth/login").send({ email, password });

const registerUserAndGetToken = async (prefix: string): Promise<string> => {
    const email = createUniqueEmail(prefix);
    const password = "Password123!";

    await request(app).post("/api/auth/register").send({
        name: `${prefix} User`,
        email,
        phone_number: "0781111111",
        password,
    });

    const loginResponse = await loginUser(email, password);
    return loginResponse.body.token as string;
};

const createAdminToken = async (): Promise<string> => {
    const adminEmail = createUniqueEmail("applications-admin");
    const adminPassword = "Admin123!";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await new Promise<void>((resolve, reject) => {
        db.run(
            `
            INSERT INTO users (uid, name, email, phone_number, password, role)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                randomUUID(),
                "System Admin",
                adminEmail,
                "0789999999",
                hashedPassword,
                "admin",
            ],
            (error: Error | null) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            }
        );
    });

    const loginResponse = await loginUser(adminEmail, adminPassword);
    return loginResponse.body.token as string;
};

const createJobPayload = (overrides: Partial<{
    title: string;
    description: string;
    location: string;
    company: string;
    category: string;
    job_type: string;
    work_mode: string;
    requirements: string;
    deadline: string;
}> = {}) => ({
    title: createUniqueValue("Role"),
    description: "Build and maintain reliable features for the platform.",
    location: "Kigali",
    company: createUniqueValue("Company"),
    category: "Engineering",
    job_type: "Full-time",
    work_mode: "Remote",
    requirements: "TypeScript, APIs, teamwork",
    deadline: "2026-12-31",
    ...overrides,
});

const createJobAsAdmin = async (
    adminToken: string,
    overrides: Partial<Parameters<typeof createJobPayload>[0]> = {}
) => {
    const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(createJobPayload(overrides));

    return response.body.job;
};

const createDraftApplication = async (
    userToken: string,
    jobUid: string,
    overrides: Partial<{
        cv_link: string;
        includeFile: boolean;
    }> = {}
) => {
    const requestBuilder = request(app)
        .post("/api/applications")
        .set("Authorization", `Bearer ${userToken}`)
        .field("job_uid", jobUid)
        .field(
            "cv_link",
            overrides.cv_link || `https://example.com/${createUniqueValue("cv")}.pdf`
        );

    if (overrides.includeFile !== false) {
        requestBuilder.attach("cover_letter_file", fixtureFilePath);
    }

    return requestBuilder;
};

const submitApplicationAsOwner = async (userToken: string, applicationUid: string) =>
    request(app)
        .post(`/api/applications/${applicationUid}/submit`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({});

const createPendingApplication = async (userToken: string, jobUid: string) => {
    const draftResponse = await createDraftApplication(userToken, jobUid);
    const applicationUid = draftResponse.body.application.uid as string;
    const submitResponse = await submitApplicationAsOwner(userToken, applicationUid);

    return {
        draftResponse,
        submitResponse,
        applicationUid,
    };
};

describe("Application API", () => {
    // Tests successful application draft creation by an authenticated user.
    it("should create an application draft successfully", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-owner");
        const job = await createJobAsAdmin(adminToken);

        const response = await createDraftApplication(userToken, job.uid);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe("Application draft created successfully.");
        expect(response.body.application.status).toBe("draft");
        expect(response.body.application.job_uid).toBe(job.uid);
        expect(response.body.application.cover_letter_file_link).toContain("/uploads/applications/");
    });

    // Tests that draft creation rejects missing tokens and missing required submission fields.
    it("should reject application draft creation without token and with missing required fields", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-missing");
        const job = await createJobAsAdmin(adminToken);

        const unauthorizedResponse = await request(app)
            .post("/api/applications")
            .field("job_uid", job.uid)
            .field("cv_link", "https://example.com/no-token.pdf")
            .attach("cover_letter_file", fixtureFilePath);

        const missingFieldsResponse = await request(app)
            .post("/api/applications")
            .set("Authorization", `Bearer ${userToken}`)
            .field("job_uid", job.uid)
            .field("cv_link", "https://example.com/missing-file.pdf");

        expect(unauthorizedResponse.status).toBe(401);
        expect(unauthorizedResponse.body.message).toBe("Access denied. No token provided.");
        expect(missingFieldsResponse.status).toBe(400);
        expect(missingFieldsResponse.body.message).toBe(
            "Job, cover letter file, and CV link are required."
        );
    });

    // Tests that draft creation rejects unknown jobs and duplicate applications for the same job.
    it("should reject application draft creation for unknown jobs and duplicate applications", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-duplicate");
        const job = await createJobAsAdmin(adminToken);

        const unknownJobResponse = await createDraftApplication(
            userToken,
            randomUUID()
        );

        const firstResponse = await createDraftApplication(userToken, job.uid);
        const duplicateResponse = await createDraftApplication(userToken, job.uid);

        expect(unknownJobResponse.status).toBe(404);
        expect(unknownJobResponse.body.message).toBe("Job not found.");
        expect(firstResponse.status).toBe(201);
        expect(duplicateResponse.status).toBe(409);
        expect(duplicateResponse.body.message).toBe(
            "You already have an application for this job."
        );
    });

    // Tests that users can fetch only their own applications and apply one or multiple filters successfully.
    it("should fetch my applications successfully with one filter and multiple filters", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-filters");
        const otherUserToken = await registerUserAndGetToken("application-other-user");

        const matchingJob = await createJobAsAdmin(adminToken, {
            title: createUniqueValue("Platform Engineer"),
            location: "Musanze",
            category: "Engineering",
            job_type: "Contract",
            work_mode: "Hybrid",
        });

        const otherJob = await createJobAsAdmin(adminToken, {
            title: createUniqueValue("Designer"),
            location: "Kigali",
            category: "Design",
            job_type: "Part-time",
            work_mode: "Remote",
        });

        await createDraftApplication(userToken, matchingJob.uid);
        await createDraftApplication(otherUserToken, otherJob.uid);

        const singleFilterResponse = await request(app)
            .get("/api/applications/me")
            .set("Authorization", `Bearer ${userToken}`)
            .query({ title: "Platform Engineer" });

        const multiFilterResponse = await request(app)
            .get("/api/applications/me")
            .set("Authorization", `Bearer ${userToken}`)
            .query({
                title: "Platform Engineer",
                location: "Musanze",
                category: "Engineering",
                job_type: "Contract",
                work_mode: "Hybrid",
                status: "draft",
            });

        expect(singleFilterResponse.status).toBe(200);
        expect(singleFilterResponse.body.message).toBe("User applications fetched successfully.");
        expect(singleFilterResponse.body.applications).toHaveLength(1);
        expect(singleFilterResponse.body.applications[0].job_uid).toBe(matchingJob.uid);

        expect(multiFilterResponse.status).toBe(200);
        expect(multiFilterResponse.body.applications).toHaveLength(1);
        expect(multiFilterResponse.body.applications[0].job_uid).toBe(matchingJob.uid);
    });

    // Tests that my applications returns an empty list when no records match the current filters.
    it("should return an empty array when no personal applications match", async () => {
        const userToken = await registerUserAndGetToken("application-empty");

        const response = await request(app)
            .get("/api/applications/me")
            .set("Authorization", `Bearer ${userToken}`)
            .query({ title: createUniqueValue("No Match") });

        expect(response.status).toBe(200);
        expect(response.body.applications).toEqual([]);
    });

    // Tests that admins can fetch submitted applications and use one or multiple filters while drafts stay excluded.
    it("should allow admins to fetch submitted applications with filters while excluding drafts", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-admin-filter");

        const submittedJob = await createJobAsAdmin(adminToken, {
            title: createUniqueValue("QA Analyst"),
            location: "Kigali",
            category: "Engineering",
            job_type: "Contract",
            work_mode: "On-site",
        });

        const draftJob = await createJobAsAdmin(adminToken, {
            title: createUniqueValue("Draft Only Role"),
            category: "Support",
        });

        await createPendingApplication(userToken, submittedJob.uid);
        await createDraftApplication(userToken, draftJob.uid);

        const allSubmittedResponse = await request(app)
            .get("/api/applications")
            .set("Authorization", `Bearer ${adminToken}`);

        const filteredResponse = await request(app)
            .get("/api/applications")
            .set("Authorization", `Bearer ${adminToken}`)
            .query({
                title: "QA Analyst",
                location: "Kigali",
                category: "Engineering",
                job_type: "Contract",
                work_mode: "On-site",
                status: "pending",
            });

        expect(allSubmittedResponse.status).toBe(200);
        expect(allSubmittedResponse.body.message).toBe("Applications fetched successfully.");
        expect(
            allSubmittedResponse.body.applications.some(
                (application: { job_uid: string; status: string }) =>
                    application.job_uid === submittedJob.uid && application.status === "pending"
            )
        ).toBe(true);
        expect(
            allSubmittedResponse.body.applications.some(
                (application: { job_uid: string }) => application.job_uid === draftJob.uid
            )
        ).toBe(false);

        expect(filteredResponse.status).toBe(200);
        expect(filteredResponse.body.applications).toHaveLength(1);
        expect(filteredResponse.body.applications[0].job_uid).toBe(submittedJob.uid);
    });

    // Tests that the admin applications endpoint rejects missing tokens, non-admin access, and unmatched filters.
    it("should reject admin applications access without token or as non-admin and return empty results when nothing matches", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-admin-guard");

        const noTokenResponse = await request(app).get("/api/applications");
        const nonAdminResponse = await request(app)
            .get("/api/applications")
            .set("Authorization", `Bearer ${userToken}`);
        const emptyResponse = await request(app)
            .get("/api/applications")
            .set("Authorization", `Bearer ${adminToken}`)
            .query({ title: createUniqueValue("No Submitted Match") });

        expect(noTokenResponse.status).toBe(401);
        expect(noTokenResponse.body.message).toBe("Access denied. No token provided.");
        expect(nonAdminResponse.status).toBe(403);
        expect(nonAdminResponse.body.message).toBe(
            "Forbidden. You do not have permission to access this resource."
        );
        expect(emptyResponse.status).toBe(200);
        expect(emptyResponse.body.applications).toEqual([]);
    });

    // Tests successful draft updates and rejects missing tokens plus empty update payloads.
    it("should update a draft successfully and reject missing tokens or empty updates", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-update");
        const job = await createJobAsAdmin(adminToken);
        const createResponse = await createDraftApplication(userToken, job.uid);
        const applicationUid = createResponse.body.application.uid as string;

        const unauthorizedResponse = await request(app)
            .patch(`/api/applications/${applicationUid}`)
            .field("cv_link", "https://example.com/no-token-update.pdf");

        const emptyUpdateResponse = await request(app)
            .patch(`/api/applications/${applicationUid}`)
            .set("Authorization", `Bearer ${userToken}`)
            .send({});

        const successResponse = await request(app)
            .patch(`/api/applications/${applicationUid}`)
            .set("Authorization", `Bearer ${userToken}`)
            .field("cv_link", "https://example.com/updated-cv.pdf");

        expect(unauthorizedResponse.status).toBe(401);
        expect(unauthorizedResponse.body.message).toBe("Access denied. No token provided.");
        expect(emptyUpdateResponse.status).toBe(400);
        expect(emptyUpdateResponse.body.message).toBe(
            "At least a cover letter file or CV link is required for update."
        );
        expect(successResponse.status).toBe(200);
        expect(successResponse.body.message).toBe("Application updated successfully.");
    });

    // Tests that draft updates reject non-owners, unknown applications, and already submitted applications.
    it("should reject draft updates for non-owners, unknown applications, and non-draft applications", async () => {
        const adminToken = await createAdminToken();
        const ownerToken = await registerUserAndGetToken("application-update-owner");
        const otherUserToken = await registerUserAndGetToken("application-update-other");
        const draftJob = await createJobAsAdmin(adminToken);
        const submittedJob = await createJobAsAdmin(adminToken);

        const createResponse = await createDraftApplication(ownerToken, draftJob.uid);
        const applicationUid = createResponse.body.application.uid as string;
        const pendingApplication = await createPendingApplication(ownerToken, submittedJob.uid);

        const nonOwnerResponse = await request(app)
            .patch(`/api/applications/${applicationUid}`)
            .set("Authorization", `Bearer ${otherUserToken}`)
            .field("cv_link", "https://example.com/non-owner-update.pdf");

        const unknownResponse = await request(app)
            .patch(`/api/applications/${randomUUID()}`)
            .set("Authorization", `Bearer ${ownerToken}`)
            .field("cv_link", "https://example.com/unknown-update.pdf");

        const nonDraftResponse = await request(app)
            .patch(`/api/applications/${pendingApplication.applicationUid}`)
            .set("Authorization", `Bearer ${ownerToken}`)
            .field("cv_link", "https://example.com/already-submitted-update.pdf");

        expect(nonOwnerResponse.status).toBe(404);
        expect(nonOwnerResponse.body.message).toBe("Application not found.");
        expect(unknownResponse.status).toBe(404);
        expect(unknownResponse.body.message).toBe("Application not found.");
        expect(nonDraftResponse.status).toBe(400);
        expect(nonDraftResponse.body.message).toBe("Only draft applications can be updated.");
    });

    // Tests successful draft submission and rejects missing tokens plus unknown application identifiers.
    it("should submit a draft successfully and reject missing tokens or unknown applications", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-submit");
        const job = await createJobAsAdmin(adminToken);
        const createResponse = await createDraftApplication(userToken, job.uid);
        const applicationUid = createResponse.body.application.uid as string;

        const unauthorizedResponse = await request(app)
            .post(`/api/applications/${applicationUid}/submit`);

        const unknownResponse = await request(app)
            .post(`/api/applications/${randomUUID()}/submit`)
            .set("Authorization", `Bearer ${userToken}`)
            .send({});

        const successResponse = await submitApplicationAsOwner(userToken, applicationUid);

        expect(unauthorizedResponse.status).toBe(401);
        expect(unauthorizedResponse.body.message).toBe("Access denied. No token provided.");
        expect(unknownResponse.status).toBe(404);
        expect(unknownResponse.body.message).toBe("Application not found.");
        expect(successResponse.status).toBe(200);
        expect(successResponse.body.message).toBe("Application submitted successfully.");
    });

    // Tests that draft submission rejects non-owners and applications that are already submitted.
    it("should reject draft submission for non-owners and non-draft applications", async () => {
        const adminToken = await createAdminToken();
        const ownerToken = await registerUserAndGetToken("application-submit-owner");
        const otherUserToken = await registerUserAndGetToken("application-submit-other");
        const job = await createJobAsAdmin(adminToken);
        const createResponse = await createDraftApplication(ownerToken, job.uid);
        const applicationUid = createResponse.body.application.uid as string;

        const nonOwnerResponse = await request(app)
            .post(`/api/applications/${applicationUid}/submit`)
            .set("Authorization", `Bearer ${otherUserToken}`)
            .send({});

        const firstSubmitResponse = await submitApplicationAsOwner(ownerToken, applicationUid);
        const secondSubmitResponse = await submitApplicationAsOwner(ownerToken, applicationUid);

        expect(nonOwnerResponse.status).toBe(404);
        expect(nonOwnerResponse.body.message).toBe("Application not found.");
        expect(firstSubmitResponse.status).toBe(200);
        expect(secondSubmitResponse.status).toBe(400);
        expect(secondSubmitResponse.body.message).toBe(
            "Only draft applications can be submitted."
        );
    });

    // Tests successful draft deletion and rejects missing tokens plus unknown application identifiers.
    it("should delete a draft successfully and reject missing tokens or unknown applications", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-delete");
        const job = await createJobAsAdmin(adminToken);
        const createResponse = await createDraftApplication(userToken, job.uid);
        const applicationUid = createResponse.body.application.uid as string;

        const unauthorizedResponse = await request(app).delete(
            `/api/applications/${applicationUid}`
        );

        const unknownResponse = await request(app)
            .delete(`/api/applications/${randomUUID()}`)
            .set("Authorization", `Bearer ${userToken}`);

        const successResponse = await request(app)
            .delete(`/api/applications/${applicationUid}`)
            .set("Authorization", `Bearer ${userToken}`);

        expect(unauthorizedResponse.status).toBe(401);
        expect(unauthorizedResponse.body.message).toBe("Access denied. No token provided.");
        expect(unknownResponse.status).toBe(404);
        expect(unknownResponse.body.message).toBe("Application not found.");
        expect(successResponse.status).toBe(200);
        expect(successResponse.body.message).toBe("Application deleted successfully.");
    });

    // Tests that draft deletion rejects non-owners and applications that are already submitted.
    it("should reject draft deletion for non-owners and non-draft applications", async () => {
        const adminToken = await createAdminToken();
        const ownerToken = await registerUserAndGetToken("application-delete-owner");
        const otherUserToken = await registerUserAndGetToken("application-delete-other");
        const firstJob = await createJobAsAdmin(adminToken);
        const secondJob = await createJobAsAdmin(adminToken);

        const ownerDraft = await createDraftApplication(ownerToken, firstJob.uid);
        const pendingApplication = await createPendingApplication(ownerToken, secondJob.uid);

        const nonOwnerResponse = await request(app)
            .delete(`/api/applications/${ownerDraft.body.application.uid}`)
            .set("Authorization", `Bearer ${otherUserToken}`);

        const nonDraftResponse = await request(app)
            .delete(`/api/applications/${pendingApplication.applicationUid}`)
            .set("Authorization", `Bearer ${ownerToken}`);

        expect(nonOwnerResponse.status).toBe(404);
        expect(nonOwnerResponse.body.message).toBe("Application not found.");
        expect(nonDraftResponse.status).toBe(400);
        expect(nonDraftResponse.body.message).toBe("Only draft applications can be deleted.");
    });

    // Tests successful admin status updates and rejects missing tokens plus invalid statuses.
    it("should update application status successfully as admin and reject missing tokens or invalid statuses", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-status");
        const job = await createJobAsAdmin(adminToken);
        const pendingApplication = await createPendingApplication(userToken, job.uid);

        const unauthorizedResponse = await request(app)
            .patch(`/api/applications/${pendingApplication.applicationUid}/status`)
            .send({ status: "shortlisted" });

        const invalidStatusResponse = await request(app)
            .patch(`/api/applications/${pendingApplication.applicationUid}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "pending" });

        const successResponse = await request(app)
            .patch(`/api/applications/${pendingApplication.applicationUid}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "shortlisted" });

        expect(unauthorizedResponse.status).toBe(401);
        expect(unauthorizedResponse.body.message).toBe("Access denied. No token provided.");
        expect(invalidStatusResponse.status).toBe(400);
        expect(invalidStatusResponse.body.message).toBe(
            "Only rejected or shortlisted are allowed here."
        );
        expect(successResponse.status).toBe(200);
        expect(successResponse.body.message).toBe(
            "Application approved and moved to shortlisted."
        );
    });

    // Tests that admin status updates reject non-admin users, unknown applications, and draft applications.
    it("should reject admin status updates for non-admin users, unknown applications, and drafts", async () => {
        const adminToken = await createAdminToken();
        const userToken = await registerUserAndGetToken("application-status-user");
        const draftJob = await createJobAsAdmin(adminToken);
        const submittedJob = await createJobAsAdmin(adminToken);
        const draftResponse = await createDraftApplication(userToken, draftJob.uid);
        const pendingApplication = await createPendingApplication(userToken, submittedJob.uid);

        const nonAdminResponse = await request(app)
            .patch(`/api/applications/${pendingApplication.applicationUid}/status`)
            .set("Authorization", `Bearer ${userToken}`)
            .send({ status: "rejected" });

        const unknownResponse = await request(app)
            .patch(`/api/applications/${randomUUID()}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "rejected" });

        const draftResponseStatus = await request(app)
            .patch(`/api/applications/${draftResponse.body.application.uid}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "rejected" });

        expect(nonAdminResponse.status).toBe(403);
        expect(nonAdminResponse.body.message).toBe(
            "Forbidden. You do not have permission to access this resource."
        );
        expect(unknownResponse.status).toBe(404);
        expect(unknownResponse.body.message).toBe("Application not found.");
        expect(draftResponseStatus.status).toBe(400);
        expect(draftResponseStatus.body.message).toBe(
            "Draft applications must be submitted before admin review."
        );
    });
});
