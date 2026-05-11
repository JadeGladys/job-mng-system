import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const normalizeWhitespace = (value: string): string =>
    value.replace(/\s+/g, " ").trim();

const stripHtml = (value: string): string =>
    normalizeWhitespace(value.replace(/<[^>]*>/g, " "));

const getExtensionFromValue = (value: string): string => {
    try {
        const parsedUrl = new URL(value);
        return path.extname(parsedUrl.pathname).toLowerCase();
    } catch {
        return path.extname(value).toLowerCase();
    }
};

const isPlainTextLike = (contentType: string, extension: string): boolean =>
    contentType.startsWith("text/") ||
    ["", ".txt", ".md", ".csv", ".json"].includes(extension);

const isHtmlLike = (contentType: string, extension: string): boolean =>
    contentType.includes("text/html") || [".html", ".htm"].includes(extension);

const extractTextFromBuffer = async (
    buffer: Buffer,
    sourceLabel: string,
    extension: string,
    contentType = ""
): Promise<string> => {
    const normalizedContentType = contentType.toLowerCase();

    if (extension === ".pdf" || normalizedContentType.includes("application/pdf")) {
        const parser = new PDFParse({ data: buffer });

        try {
            const result = await parser.getText();
            return normalizeWhitespace(result.text || "");
        } finally {
            await parser.destroy();
        }
    }

    if (
        extension === ".docx" ||
        normalizedContentType.includes(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    ) {
        const result = await mammoth.extractRawText({ buffer });
        return normalizeWhitespace(result.value || "");
    }

    if (extension === ".doc" || normalizedContentType.includes("application/msword")) {
        throw new Error(
            `${sourceLabel} uses the old .doc format, which is not supported yet. Please use PDF or DOCX.`
        );
    }

    if (isHtmlLike(normalizedContentType, extension)) {
        return stripHtml(buffer.toString("utf-8"));
    }

    if (isPlainTextLike(normalizedContentType, extension) || extension === "") {
        return normalizeWhitespace(buffer.toString("utf-8"));
    }

    throw new Error(`Unsupported file type for ${sourceLabel}.`);
};

export const extractTextFromRemoteFile = async (fileUrl: string): Promise<string> => {
    const trimmedUrl = fileUrl.trim();

    if (!trimmedUrl) {
        throw new Error("CV link is missing.");
    }

    let response: Response;

    try {
        response = await fetch(trimmedUrl);
    } catch (error) {
        throw new Error(
            `Unable to reach the remote CV link. ${(error as Error).message}`
        );
    }

    if (!response.ok) {
        throw new Error(`Remote CV link returned status ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") || "";
    const extension = getExtensionFromValue(trimmedUrl);
    const arrayBuffer = await response.arrayBuffer();

    const text = await extractTextFromBuffer(
        Buffer.from(arrayBuffer),
        "remote CV file",
        extension,
        contentType
    );

    if (!text) {
        throw new Error("No readable text could be extracted from the CV link.");
    }

    return text;
};

export const extractTextFromLocalFile = async (
    storedFilePath: string
): Promise<string> => {
    const trimmedPath = storedFilePath.trim();

    if (!trimmedPath) {
        throw new Error("Cover letter file path is missing.");
    }

    const relativePath = trimmedPath.replace(/^\/+/, "");
    const absolutePath = path.resolve(__dirname, "..", "..", relativePath);
    const extension = path.extname(relativePath).toLowerCase();

    let fileBuffer: Buffer;

    try {
        fileBuffer = await fs.readFile(absolutePath);
    } catch (error) {
        throw new Error(
            `Unable to read the uploaded cover letter file. ${(error as Error).message}`
        );
    }

    const text = await extractTextFromBuffer(
        fileBuffer,
        "uploaded cover letter file",
        extension
    );

    if (!text) {
        throw new Error("No readable text could be extracted from the cover letter file.");
    }

    return text;
};
