import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory = path.resolve(__dirname, "../../uploads/applications");

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, uploadDirectory);
    },
    filename: (_req, file, callback) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const extension = path.extname(file.originalname);
        const safeName = file.fieldname.replace(/\s+/g, "-").toLowerCase();

        callback(null, `${safeName}-${uniqueSuffix}${extension}`);
    },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
        callback(new Error("Only PDF, DOC, and DOCX files are allowed."));
        return;
    }

    callback(null, true);
};

const uploadApplicationFiles = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter,
}).fields([
    { name: "cover_letter_file", maxCount: 1 },
]);

export default uploadApplicationFiles;
