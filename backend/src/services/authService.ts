import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import db from "../config/database";
import emailService from "./emailService";

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

type UpdateUserInput = {
    name?: string;
    email?: string;
    phone_number?: string;
    password?: string;
    role?: string;
};

type UserRecord = ServiceUser & {
    created_at?: string;
    updated_at?: string;
};

type UsersListResult = UserRecord[];

export type UsersFilters = {
    name?: string;
    email?: string;
    role?: string;
};

type LoginUserInput = {
    email: string;
    password: string;
};

type ExistingUserRow = {
    id: number;
};

type ExistingUserByUidRow = {
    id: number;
    uid: string;
    email: string;
    password: string;
    role: string;
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

    try {
        await emailService.sendWelcomeEmail(normalizedEmail, trimmedName);
    } catch (error) {
        console.error("Failed to send welcome email:", (error as Error).message);
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

const getAllUsers = async (filters: UsersFilters = {}): Promise<UsersListResult> => {
    const { name, email, role } = filters;

    let query = `
        SELECT
            uid,
            name,
            email,
            phone_number,
            role,
            created_at,
            updated_at
        FROM users
    `;

    const conditions: string[] = [];
    const params: string[] = [];

    if (name) {
        conditions.push("name LIKE ?");
        params.push(`%${name}%`);
    }

    if (email) {
        conditions.push("email LIKE ?");
        params.push(`%${email}%`);
    }

    if (role) {
        conditions.push("role LIKE ?");
        params.push(`%${role}%`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY created_at DESC";

    try {
        return await dbAll<UserRecord>(query, params);
    } catch (error) {
        throw createServiceError("Failed to fetch users.", 500, error as Error);
    }
};

const updateUser = async (
    userUid: string,
    updates: UpdateUserInput
): Promise<{ message: string }> => {
    if (!userUid?.trim()) {
        throw createServiceError("User uid is required.", 400);
    }

    let existingUser: ExistingUserByUidRow | undefined;

    try {
        existingUser = await dbGet<ExistingUserByUidRow>(
            "SELECT id, uid, email, password, role FROM users WHERE uid = ?",
            [userUid.trim()]
        );
    } catch (error) {
        throw createServiceError("Failed to fetch user.", 500, error as Error);
    }

    if (!existingUser) {
        throw createServiceError("User not found.", 404);
    }

    const updateFields: string[] = [];
    const params: string[] = [];

    if (updates.name !== undefined) {
        const trimmedName = updates.name.trim();

        if (!trimmedName) {
            throw createServiceError("Name cannot be empty.", 400);
        }

        updateFields.push("name = ?");
        params.push(trimmedName);
    }

    if (updates.email !== undefined) {
        const normalizedEmail = updates.email.trim().toLowerCase();

        if (!normalizedEmail) {
            throw createServiceError("Email cannot be empty.", 400);
        }

        let conflictingUser: ExistingUserRow | undefined;

        try {
            conflictingUser = await dbGet<ExistingUserRow>(
                "SELECT id FROM users WHERE email = ? AND uid != ?",
                [normalizedEmail, existingUser.uid]
            );
        } catch (error) {
            throw createServiceError("Failed to validate email.", 500, error as Error);
        }

        if (conflictingUser) {
            throw createServiceError("A user with this email already exists.", 409);
        }

        updateFields.push("email = ?");
        params.push(normalizedEmail);
    }

    if (updates.phone_number !== undefined) {
        const trimmedPhoneNumber = updates.phone_number.trim();

        if (!trimmedPhoneNumber) {
            throw createServiceError("Phone number cannot be empty.", 400);
        }

        updateFields.push("phone_number = ?");
        params.push(trimmedPhoneNumber);
    }

    if (updates.password !== undefined) {
        const trimmedPassword = updates.password.trim();

        if (!trimmedPassword) {
            throw createServiceError("Password cannot be empty.", 400);
        }

        let hashedPassword: string;

        try {
            hashedPassword = await bcrypt.hash(trimmedPassword, 10);
        } catch (error) {
            throw createServiceError("Failed to hash password.", 500, error as Error);
        }

        updateFields.push("password = ?");
        params.push(hashedPassword);
    }

    if (updates.role !== undefined) {
        const normalizedRole = updates.role.trim().toLowerCase();

        if (!["user", "admin"].includes(normalizedRole)) {
            throw createServiceError("Role must be either user or admin.", 400);
        }

        updateFields.push("role = ?");
        params.push(normalizedRole);
    }

    if (updateFields.length === 0) {
        throw createServiceError("No valid user updates were provided.", 400);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(existingUser.uid);

    try {
        await dbRun(
            `
            UPDATE users
            SET ${updateFields.join(", ")}
            WHERE uid = ?
            `,
            params
        );
    } catch (error) {
        throw createServiceError("Failed to update user.", 500, error as Error);
    }

    return {
        message: "User updated successfully.",
    };
};

const deleteUser = async (
    userUid: string,
    currentUser: { uid: string }
): Promise<{ message: string }> => {
    if (!userUid?.trim()) {
        throw createServiceError("User uid is required.", 400);
    }

    if (currentUser.uid !== userUid.trim()) {
        throw createServiceError("You can only delete your own account.", 403);
    }

    let existingUser: ExistingUserByUidRow | undefined;

    try {
        existingUser = await dbGet<ExistingUserByUidRow>(
            "SELECT id, uid, email, password, role FROM users WHERE uid = ?",
            [userUid.trim()]
        );
    } catch (error) {
        throw createServiceError("Failed to fetch user.", 500, error as Error);
    }

    if (!existingUser) {
        throw createServiceError("User not found.", 404);
    }

    try {
        await dbRun("DELETE FROM users WHERE uid = ?", [existingUser.uid]);
    } catch (error) {
        throw createServiceError("Failed to delete user.", 500, error as Error);
    }

    return {
        message: "User deleted successfully.",
    };
};


export default {
    registerUser,
    loginUser,
    getAllUsers,
    updateUser,
    deleteUser,
};
