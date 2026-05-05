const bcrypt = require("bcryptjs");
const db = require("../config/database");
const initializeDatabase = require("../schema/init");

const seedAdminUser = async () => {
    initializeDatabase();

    const adminEmail = "admin@jobmng.local";
    const adminPassword = "Admin123!";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    db.get(
        "SELECT id FROM users WHERE email = ?",
        [adminEmail],
        (selectError, row) => {
            if (selectError) {
                console.error("Failed to check existing admin user:", selectError.message);
                return;
            }

            if (row) {
                console.log("Default admin user already exists.");
                return;
            }

            db.run(
                `
        INSERT INTO users (name, email, phone_number, password, role)
        VALUES (?, ?, ?, ?, ?)
        `,
                [
                    "System Admin",
                    adminEmail,
                    "0780000000",
                    hashedPassword,
                    "admin",
                ],
                (insertError) => {
                    if (insertError) {
                        console.error("Failed to seed default admin user:", insertError.message);
                    } else {
                        console.log("Default admin user seeded successfully.");
                        console.log("Email: admin@jobmng.local");
                        console.log("Password: Admin123!");
                    }
                }
            );
        }
    );
};

seedAdminUser();
