import request from "supertest";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import app from "../app";
import db from "../config/database";

const createUniqueEmail = (prefix: string): string =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

const createUniqueJobValue = (prefix: string): string =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const loginUser = async (email: string, password: string) =>
    request(app).post("/api/auth/login").send({ email, password });

const createAdminToken = async (): Promise<string> => {
    const adminEmail = createUniqueEmail("job-admin");
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

const createUserToken = async (): Promise<string> => {
    const password = "Password123!";
    const email = createUniqueEmail("job-user");

    await request(app).post("/api/auth/register").send({
        name: "Normal User",
        email,
        phone_number: "0781111111",
        password,
    });

    const loginResponse = await loginUser(email, password);
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
    title: createUniqueJobValue("Role"),
    description: "Build and maintain reliable features for the platform.",
    location: "Kigali",
    company: createUniqueJobValue("Company"),
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
    const payload = createJobPayload(overrides);
    const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(payload);

    return { payload, response };
};

describe("Job API", () => {
    // Tests successful job creation by an admin user.
    it("should create a job successfully as admin", async () => {
        const adminToken = await createAdminToken();
        const { payload, response } = await createJobAsAdmin(adminToken);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe("Job created successfully.");
        expect(response.body.job).toHaveProperty("uid");
        expect(response.body.job.title).toBe(payload.title);
        expect(response.body.job.company).toBe(payload.company);
    });

    // Tests that creating a job without a token is rejected.
    it("should reject create job without token", async () => {
        const response = await request(app)
            .post("/api/jobs")
            .send(createJobPayload());

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Access denied. No token provided.");
    });

    // Tests that creating a job as a non-admin user is rejected.
    it("should reject create job as non-admin", async () => {
        const userToken = await createUserToken();

        const response = await request(app)
            .post("/api/jobs")
            .set("Authorization", `Bearer ${userToken}`)
            .send(createJobPayload());

        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
            "Forbidden. You do not have permission to access this resource."
        );
    });

    // Tests validation when required job fields are missing during creation.
    it("should reject create job with missing required fields", async () => {
        const adminToken = await createAdminToken();

        const response = await request(app)
            .post("/api/jobs")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Incomplete Role",
                company: "Incomplete Company",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("All job fields are required.");
    });

    // Tests duplicate protection when creating a second job with the same title and company.
    it("should reject duplicate job with the same title and company", async () => {
        const adminToken = await createAdminToken();
        const title = createUniqueJobValue("Duplicate Role");
        const company = createUniqueJobValue("Duplicate Company");

        const firstResponse = await request(app)
            .post("/api/jobs")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(createJobPayload({ title, company }));

        const secondResponse = await request(app)
            .post("/api/jobs")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(createJobPayload({ title, company }));

        expect(firstResponse.status).toBe(201);
        expect(secondResponse.status).toBe(409);
        expect(secondResponse.body.message).toBe(
            "A job with the same title and company already exists."
        );
    });

    // Tests that the jobs endpoint returns available jobs successfully.
    it("should fetch all jobs successfully", async () => {
        const response = await request(app).get("/api/jobs");

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Jobs fetched successfully.");
        expect(Array.isArray(response.body.jobs)).toBe(true);
    });

    // Tests that job filters work for both single-filter and multi-filter requests.
    it("should fetch jobs successfully with one filter and multiple filters", async () => {
        const adminToken = await createAdminToken();
        const title = createUniqueJobValue("Filtered Role");

        await createJobAsAdmin(adminToken, {
            title,
            location: "Musanze",
            category: "Design",
            job_type: "Contract",
            work_mode: "Hybrid",
        });

        const singleFilterResponse = await request(app)
            .get("/api/jobs")
            .query({ title });

        const multiFilterResponse = await request(app)
            .get("/api/jobs")
            .query({
                title,
                location: "Musanze",
                category: "Design",
                job_type: "Contract",
                work_mode: "Hybrid",
            });

        expect(singleFilterResponse.status).toBe(200);
        expect(singleFilterResponse.body.jobs.some((job: { title: string }) => job.title === title)).toBe(
            true
        );

        expect(multiFilterResponse.status).toBe(200);
        expect(
            multiFilterResponse.body.jobs.some(
                (job: {
                    title: string;
                    location: string;
                    category: string;
                    job_type: string;
                    work_mode: string;
                }) =>
                    job.title === title &&
                    job.location === "Musanze" &&
                    job.category === "Design" &&
                    job.job_type === "Contract" &&
                    job.work_mode === "Hybrid"
            )
        ).toBe(true);
    });

    // Tests that the jobs endpoint returns an empty list when no records match the filters.
    it("should return an empty array when no jobs match", async () => {
        const response = await request(app)
            .get("/api/jobs")
            .query({ title: createUniqueJobValue("No Match") });

        expect(response.status).toBe(200);
        expect(response.body.jobs).toEqual([]);
    });

    // Tests successful job update by an admin user.
    it("should update a job successfully as admin", async () => {
        const adminToken = await createAdminToken();
        const { response: createResponse } = await createJobAsAdmin(adminToken);
        const jobUid = createResponse.body.job.uid;

        const response = await request(app)
            .patch(`/api/jobs/${jobUid}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Updated Job Title",
                work_mode: "On-site",
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Job updated successfully.");
    });

    // Tests that updating a job without a token is rejected.
    it("should reject update job without token", async () => {
        const adminToken = await createAdminToken();
        const { response: createResponse } = await createJobAsAdmin(adminToken);
        const jobUid = createResponse.body.job.uid;

        const response = await request(app)
            .patch(`/api/jobs/${jobUid}`)
            .send({ title: "Unauthorized Update" });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Access denied. No token provided.");
    });

    // Tests that updating a job as a non-admin user is rejected.
    it("should reject update job as non-admin", async () => {
        const adminToken = await createAdminToken();
        const userToken = await createUserToken();
        const { response: createResponse } = await createJobAsAdmin(adminToken);
        const jobUid = createResponse.body.job.uid;

        const response = await request(app)
            .patch(`/api/jobs/${jobUid}`)
            .set("Authorization", `Bearer ${userToken}`)
            .send({ title: "Unauthorized Update" });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
            "Forbidden. You do not have permission to access this resource."
        );
    });

    // Tests that updating an unknown job uid returns not found.
    it("should reject update for unknown job uid", async () => {
        const adminToken = await createAdminToken();

        const response = await request(app)
            .patch(`/api/jobs/${randomUUID()}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Unknown Job Update" });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Job not found.");
    });

    // Tests validation when no valid fields are provided for update.
    it("should reject update when no valid fields are provided", async () => {
        const adminToken = await createAdminToken();
        const { response: createResponse } = await createJobAsAdmin(adminToken);
        const jobUid = createResponse.body.job.uid;

        const response = await request(app)
            .patch(`/api/jobs/${jobUid}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("At least one valid field is required for update.");
    });

    // Tests duplicate protection when an update would make one job match another job's title and company.
    it("should reject update if it would create a duplicate title and company", async () => {
        const adminToken = await createAdminToken();
        const title = createUniqueJobValue("Protected Title");
        const company = createUniqueJobValue("Protected Company");

        const { response: firstCreateResponse } = await createJobAsAdmin(adminToken, {
            title,
            company,
        });
        const { response: secondCreateResponse } = await createJobAsAdmin(adminToken);

        expect(firstCreateResponse.status).toBe(201);
        expect(secondCreateResponse.status).toBe(201);

        const response = await request(app)
            .patch(`/api/jobs/${secondCreateResponse.body.job.uid}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title,
                company,
            });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe(
            "A job with the same title and company already exists."
        );
    });

    // Tests successful job deletion by an admin user.
    it("should delete a job successfully as admin", async () => {
        const adminToken = await createAdminToken();
        const { response: createResponse } = await createJobAsAdmin(adminToken);
        const jobUid = createResponse.body.job.uid;

        const response = await request(app)
            .delete(`/api/jobs/${jobUid}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Job deleted successfully.");
    });

    // Tests that deleting a job without a token is rejected.
    it("should reject delete job without token", async () => {
        const adminToken = await createAdminToken();
        const { response: createResponse } = await createJobAsAdmin(adminToken);
        const jobUid = createResponse.body.job.uid;

        const response = await request(app).delete(`/api/jobs/${jobUid}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Access denied. No token provided.");
    });

    // Tests that deleting a job as a non-admin user is rejected.
    it("should reject delete job as non-admin", async () => {
        const adminToken = await createAdminToken();
        const userToken = await createUserToken();
        const { response: createResponse } = await createJobAsAdmin(adminToken);
        const jobUid = createResponse.body.job.uid;

        const response = await request(app)
            .delete(`/api/jobs/${jobUid}`)
            .set("Authorization", `Bearer ${userToken}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
            "Forbidden. You do not have permission to access this resource."
        );
    });

    // Tests that deleting an unknown job uid returns not found.
    it("should reject delete for unknown job uid", async () => {
        const adminToken = await createAdminToken();

        const response = await request(app)
            .delete(`/api/jobs/${randomUUID()}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Job not found.");
    });
});
