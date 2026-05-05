const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const db = require("../config/database");

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

module.exports = {
    registerUser,
};
