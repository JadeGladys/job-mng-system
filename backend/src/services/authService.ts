const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

const createServiceError = (message, status, originalError) => {
    const error = new Error(message);
    error.status = status;

    if (originalError) {
        error.originalError = originalError;
    }

    return error;
};

const dbGet = (query, params = []) =>
    new Promise((resolve, reject) => {
        db.get(query, params, (error, row) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(row);
        });
    });

const dbRun = (query, params = []) =>
    new Promise((resolve, reject) => {
        db.run(query, params, function onRun(error) {
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

const registerUser = async ({ name, email, phone_number, password }) => {
    if (!name || !email || !phone_number || !password) {
        throw createServiceError("Name, email, phone number, and password are required.", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedPhoneNumber = phone_number.trim();
    const userUid = randomUUID();

    let existingUser;

    try {
        existingUser = await dbGet("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    } catch (error) {
        throw createServiceError("Failed to check existing user.", 500, error);
    }

    if (existingUser) {
        throw createServiceError("A user with this email already exists.", 409);
    }

    let hashedPassword;

    try {
        hashedPassword = await bcrypt.hash(password, 10);
    } catch (error) {
        throw createServiceError("Failed to hash password.", 500, error);
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
        throw createServiceError("Failed to register user.", 500, error);
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

const loginUser = async ({ email, password }) => {
    if (!email || !password) {
        throw createServiceError("Email and password are required.", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user;

    try {
        user = await dbGet("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
    } catch (error) {
        throw createServiceError("Failed to log in user.", 500, error);
    }

    if (!user) {
        throw createServiceError("Invalid email or password.", 401);
    }

    let isPasswordValid;

    try {
        isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (error) {
        throw createServiceError("Failed to verify credentials.", 500, error);
    }

    if (!isPasswordValid) {
        throw createServiceError("Invalid email or password.", 401);
    }

    const token = jwt.sign(
        {
            id: user.id,
            uid: user.uid,
            email: user.email,
            role: user.role,
        },
        process.env.JWT_SECRET,
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

module.exports = {
    registerUser,
    loginUser,
};
