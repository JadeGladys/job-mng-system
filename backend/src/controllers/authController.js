const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

// User registration
const registerUser = async (req, res) => {
    const { name, email, phone_number, password } = req.body;

    if (!name || !email || !phone_number || !password) {
        return res.status(400).json({
            message: "Name, email, phone number, and password are required.",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userUid = randomUUID();

    db.get(
        "SELECT id FROM users WHERE email = ?",
        [normalizedEmail],
        async (selectError, existingUser) => {
            if (selectError) {
                return res.status(500).json({
                    message: "Failed to check existing user.",
                    error: selectError.message,
                });
            }

            if (existingUser) {
                return res.status(409).json({
                    message: "A user with this email already exists.",
                });
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);

                db.run(
                    `
          INSERT INTO users (uid, name, email, phone_number, password, role)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
                    [userUid, name.trim(), normalizedEmail, phone_number.trim(), hashedPassword, "user"],
                    function (insertError) {
                        if (insertError) {
                            return res.status(500).json({
                                message: "Failed to register user.",
                                error: insertError.message,
                            });
                        }

                        return res.status(201).json({
                            message: "User registered successfully.",
                            user: {
                                uid: userUid,
                                name: name.trim(),
                                email: normalizedEmail,
                                phone_number: phone_number.trim(),
                                role: "user",
                            },
                        });
                    }
                );
            } catch (hashError) {
                return res.status(500).json({
                    message: "Failed to hash password.",
                    error: hashError.message,
                });
            }
        }
    );
};

// User login
const loginUser = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required.",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [normalizedEmail],
        async (selectError, user) => {
            if (selectError) {
                return res.status(500).json({
                    message: "Failed to log in user.",
                    error: selectError.message,
                });
            }

            if (!user) {
                return res.status(401).json({
                    message: "Invalid email or password.",
                });
            }

            try {
                const isPasswordValid = await bcrypt.compare(password, user.password);

                if (!isPasswordValid) {
                    return res.status(401).json({
                        message: "Invalid email or password.",
                    });
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

                return res.status(200).json({
                    message: "Login successful.",
                    token,
                    user: {
                        uid: user.uid,
                        name: user.name,
                        email: user.email,
                        phone_number: user.phone_number,
                        role: user.role,
                    },
                });
            } catch (compareError) {
                return res.status(500).json({
                    message: "Failed to verify credentials.",
                    error: compareError.message,
                });
            }
        }
    );
};

module.exports = {
    registerUser,
    loginUser,
};
