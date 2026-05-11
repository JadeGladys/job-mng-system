import path from "path";
import sqlite3 from "sqlite3";

const sqlite = sqlite3.verbose();

const dbPath = path.resolve(
    __dirname,
    "../../",
    process.env.DATABASE_URL || "./job-mng-system.sqlite"
);

const db = new sqlite.Database(dbPath, (err: Error | null) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

export default db;
