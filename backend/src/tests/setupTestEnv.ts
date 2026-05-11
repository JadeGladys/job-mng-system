import fs from "fs";
import path from "path";

const testDatabasePath = path.resolve(__dirname, "../../job-mng-system.test.sqlite");

if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "./job-mng-system.test.sqlite";
}

if (!process.env.JMS_TEST_DB_INITIALIZED) {
    if (fs.existsSync(testDatabasePath)) {
        fs.unlinkSync(testDatabasePath);
    }

    process.env.JMS_TEST_DB_INITIALIZED = "true";
}
