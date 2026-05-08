import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import db from "../config/database";

type ServiceError = Error & {
    status?: number;
    originalError?: Error;
};

type ServiceUser = {
    uid: string;
    name: string;
    email: string;
    phone_number: string;
    role: string;
};

type RegisterUserInput = {
    name: string;
    email: string;
    phone_number: string;
    password: string;
};

type LoginUserInput = {
    email: string;
    password: string;
};

type ExistingUserRow = {
    id: number;
};

type DatabaseUserRow = {
    id: number;
    uid: string;
    name: string;
    email: string;
    phone_number: string;
    password: string;
    role: string;
};

type RegisterUserResult = {
    message: string;
    user: ServiceUser;
};

type LoginUserResult = {
    message: string;
    token: string;
    user: ServiceUser;
};

type DbRunResult = {
    lastID: number;
    changes: number;
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

const registerUser = async ({
    name,
    email,
    phone_number,
    password,
}: RegisterUserInput): Promise<RegisterUserResult> => {
    if (!name || !email || !phone_number || !password) {
        throw createServiceError("Name, email, phone number, and password are required.", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedPhoneNumber = phone_number.trim();
    const userUid = randomUUID();

    let existingUser: ExistingUserRow | undefined;

    try {
        existingUser = await dbGet<ExistingUserRow>(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail]
        );
    } catch (error) {
        throw createServiceError("Failed to check existing user.", 500, error as Error);
    }

    if (existingUser) {
        throw createServiceError("A user with this email already exists.", 409);
    }

    let hashedPassword: string;

    try {
        hashedPassword = await bcrypt.hash(password, 10);
    } catch (error) {
        throw createServiceError("Failed to hash password.", 500, error as Error);
    }

    try {
        await dbRun(
            `
            INSERT INTO users (uid, name, email, phone_number, password, role)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [userUid, trimmedName, normalizedEmail, trimmedPhoneNumber, hashedPassword, "user"]
        );
    } catch (error) {
        throw createServiceError("Failed to register user.", 500, error as Error);
    }

    return {
        message: "User registered successfully.",
        user: {
            uid: userUid,
            name: trimmedName,
            email: normalizedEmail,
            phone_number: trimmedPhoneNumber,
            role: "user",
        },
    };
};

const loginUser = async ({
    email,
    password,
}: LoginUserInput): Promise<LoginUserResult> => {
    if (!email || !password) {
        throw createServiceError("Email and password are required.", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user: DatabaseUserRow | undefined;

    try {
        user = await dbGet<DatabaseUserRow>("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
    } catch (error) {
        throw createServiceError("Failed to log in user.", 500, error as Error);
    }

    if (!user) {
        throw createServiceError("Invalid email or password.", 401);
    }

    let isPasswordValid: boolean;

    try {
        isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (error) {
        throw createServiceError("Failed to verify credentials.", 500, error as Error);
    }

    if (!isPasswordValid) {
        throw createServiceError("Invalid email or password.", 401);
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error("JWT_SECRET is not defined.");
    }

    const token = jwt.sign(
        {
            id: user.id,
            uid: user.uid,
            email: user.email,
            role: user.role,
        },
        jwtSecret,
        { expiresIn: "1d" }
    );

    return {
        message: "Login successful.",
        token,
        user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            role: user.role,
        },
    };
};

export default {
    registerUser,
    loginUser,
};
