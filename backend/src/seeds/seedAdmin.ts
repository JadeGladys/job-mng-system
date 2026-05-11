import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "../config/database";
import initializeDatabase from "../schema/init";

type ExistingAdminRow = {
    id: number;
};

export const ensureDefaultAdminUser = async (): Promise<void> => {
    initializeDatabase();

    const adminEmail = "admin@jobmng.local";
    const adminPassword = "Admin123!";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    db.get(
        "SELECT id FROM users WHERE email = ?",
        [adminEmail],
        (selectError: Error | null, row: ExistingAdminRow | undefined) => {
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
                INSERT INTO users (uid, name, email, phone_number, password, role)
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    randomUUID(),
                    "System Admin",
                    adminEmail,
                    "0780000000",
                    hashedPassword,
                    "admin",
                ],
                (insertError: Error | null) => {
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

void ensureDefaultAdminUser();