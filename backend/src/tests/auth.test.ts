import request from "supertest";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import app from "../app";
import db from "../config/database";

const createUniqueEmail = (prefix: string): string =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

const registerTestUser = async (overrides: Partial<{
    name: string;
    email: string;
    phone_number: string;
    password: string;
}> = {}) => {
    const payload = {
        name: "Test User",
        email: createUniqueEmail("user"),
        phone_number: "0780000000",
        password: "Password123!",
        ...overrides,
    };

    const response = await request(app).post("/api/auth/register").send(payload);

    return { payload, response };
};

const loginTestUser = async (email: string, password: string) =>
    request(app).post("/api/auth/login").send({ email, password });

const createAdminToken = async (): Promise<string> => {
    const adminEmail = createUniqueEmail("admin");
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

    const loginResponse = await loginTestUser(adminEmail, adminPassword);
    return loginResponse.body.token as string;
};

describe("Auth API", () => {
    // Tests successful user registration and checks that sensitive data is not returned.
    it("should register a new user", async () => {
        const { payload, response } = await registerTestUser();

        expect(response.status).toBe(201);
        expect(response.body.message).toBe("User registered successfully.");
        expect(response.body.user).toHaveProperty("uid");
        expect(response.body.user.email).toBe(payload.email);
        expect(response.body.user.role).toBe("user");
        expect(response.body.user.password).toBeUndefined();
    });

    // Tests validation when registration is attempted without all required fields.
    it("should reject registration with missing fields", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                email: "missing@example.com",
                password: "Password123!",
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
    });

    // Tests duplicate registration protection by trying to reuse the same email twice.
    it("should reject registration with an existing email", async () => {
        const email = createUniqueEmail("duplicate");

        const firstResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Duplicate User",
                email,
                phone_number: "0781234567",
                password: "Password123!",
            });

        const secondResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Duplicate User",
                email,
                phone_number: "0781234567",
                password: "Password123!",
            });

        expect(firstResponse.status).toBe(201);
        expect(secondResponse.status).toBe(409);
        expect(secondResponse.body.message).toBe("A user with this email already exists.");
    });

    // Tests successful login and confirms a token is returned for the registered user.
    it("should login successfully and return token", async () => {
        const { payload, response: registerResponse } = await registerTestUser({
            name: "Login Test User",
            phone_number: "0781111111",
        });

        const response = await loginTestUser(payload.email, payload.password);

        expect(registerResponse.status).toBe(201);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Login successful.");
        expect(response.body).toHaveProperty("token");
        expect(response.body.user.email).toBe(payload.email);
        expect(response.body.user.password).toBeUndefined();
    });

    // Tests login failure when the password is incorrect for an existing user.
    it("should reject login with wrong password", async () => {
        const { payload, response: registerResponse } = await registerTestUser({
            name: "Wrong Password User",
            phone_number: "0782222222",
        });

        const response = await loginTestUser(payload.email, "WrongPassword");

        expect(registerResponse.status).toBe(201);
        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid email or password.");
    });

    // Tests login failure when the email does not exist in the system.
    it("should reject login with an unknown email", async () => {
        const response = await loginTestUser(
            createUniqueEmail("unknown"),
            "Password123!"
        );

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid email or password.");
    });

    // Tests that the authenticated user endpoint blocks requests without a token.
    it("should reject /me without token", async () => {
        const response = await request(app).get("/api/auth/me");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Access denied. No token provided.");
    });

    // Tests that the authenticated user endpoint returns the current user when a valid token is provided.
    it("should return the authenticated user for /me with a valid token", async () => {
        const { payload, response: registerResponse } = await registerTestUser({
            name: "Me Route User",
            phone_number: "0783333333",
        });

        const loginResponse = await loginTestUser(payload.email, payload.password);
        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${loginResponse.body.token}`);

        expect(registerResponse.status).toBe(201);
        expect(loginResponse.status).toBe(200);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Authenticated user fetched successfully.");
        expect(response.body.user.email).toBe(payload.email);
    });

    // Tests that only admins can fetch the users list.
    it("should allow an admin to fetch all users", async () => {
        const adminToken = await createAdminToken();

        const response = await request(app)
            .get("/api/auth/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Users fetched successfully.");
        expect(Array.isArray(response.body.users)).toBe(true);
    });

    // Tests that normal users are blocked from the admin-only users endpoint.
    it("should reject /users for a non-admin user", async () => {
        const { payload, response: registerResponse } = await registerTestUser({
            name: "Normal User",
            phone_number: "0784444444",
        });

        const loginResponse = await loginTestUser(payload.email, payload.password);
        const response = await request(app)
            .get("/api/auth/users")
            .set("Authorization", `Bearer ${loginResponse.body.token}`);

        expect(registerResponse.status).toBe(201);
        expect(loginResponse.status).toBe(200);
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
            "Forbidden. You do not have permission to access this resource."
        );
    });

    // Tests that the admin-only users endpoint also blocks requests without a token.
    it("should reject /users without token", async () => {
        const response = await request(app).get("/api/auth/users");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Access denied. No token provided.");
    });
});
