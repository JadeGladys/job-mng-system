type AiRecommendation = "reject" | "review" | "shortlist";

type ScreenApplicationInput = {
    applicantName: string;
    applicantEmail: string;
    applicantPhoneNumber: string;
    jobTitle: string;
    company: string;
    location: string;
    category: string;
    jobType: string;
    workMode: string;
    jobDescription: string;
    jobRequirements: string;
    cvText: string;
    coverLetterText: string;
};

type ScreenApplicationOutput = {
    score: number;
    summary: string;
    recommendation: AiRecommendation;
};

type OpenAiMessage = {
    role: "system" | "user";
    content: string;
};

type OpenAiChatCompletionResponse = {
    choices?: Array<{
        message?: {
            content?: string | null;
        };
    }>;
    error?: {
        message?: string;
    };
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const MAX_TEXT_LENGTH = 12000;

const trimForPrompt = (value: string): string =>
    value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);

const clampScore = (value: unknown): number => {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
};

const normalizeRecommendation = (value: unknown): AiRecommendation => {
    if (value === "reject" || value === "review" || value === "shortlist") {
        return value;
    }

    return "review";
};

const extractJsonBlock = (value: string): string => {
    const trimmedValue = value.trim();

    if (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) {
        return trimmedValue;
    }

    const startIndex = trimmedValue.indexOf("{");
    const endIndex = trimmedValue.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        throw new Error("AI response did not contain valid JSON.");
    }

    return trimmedValue.slice(startIndex, endIndex + 1);
};

const parseScreeningResponse = (content: string): ScreenApplicationOutput => {
    let parsedValue: {
        score?: unknown;
        summary?: unknown;
        recommendation?: unknown;
    };

    try {
        parsedValue = JSON.parse(extractJsonBlock(content));
    } catch (error) {
        throw new Error(
            `AI response could not be parsed as screening JSON. ${(error as Error).message}`
        );
    }

    const summary =
        typeof parsedValue.summary === "string" ? parsedValue.summary.trim() : "";

    if (!summary) {
        throw new Error("AI response did not include a valid summary.");
    }

    return {
        score: clampScore(parsedValue.score),
        summary,
        recommendation: normalizeRecommendation(parsedValue.recommendation),
    };
};

const buildMessages = (input: ScreenApplicationInput): OpenAiMessage[] => [
    {
        role: "system",
        content: [
            "You are an applicant screening assistant for a job management system.",
            "Evaluate the applicant against the job description and requirements.",
            "Return JSON only with this exact shape:",
            '{ "score": number, "summary": string, "recommendation": "reject" | "review" | "shortlist" }',
            "The summary must include three short sections in plain text:",
            "Summary:",
            "Strengths:",
            "Concerns:",
            "The score must be between 0 and 100.",
            "Do not include markdown code fences."
        ].join(" ")
    },
    {
        role: "user",
        content: [
            `Applicant name: ${input.applicantName}`,
            `Applicant email: ${input.applicantEmail}`,
            `Applicant phone number: ${input.applicantPhoneNumber || "Not provided"}`,
            `Job title: ${input.jobTitle}`,
            `Company: ${input.company}`,
            `Location: ${input.location}`,
            `Category: ${input.category}`,
            `Job type: ${input.jobType}`,
            `Work mode: ${input.workMode}`,
            "",
            `Job description: ${trimForPrompt(input.jobDescription)}`,
            "",
            `Job requirements: ${trimForPrompt(input.jobRequirements)}`,
            "",
            `CV text: ${trimForPrompt(input.cvText)}`,
            "",
            `Cover letter text: ${trimForPrompt(input.coverLetterText)}`
        ].join("\n")
    }
];

const screenApplication = async (
    input: ScreenApplicationInput
): Promise<ScreenApplicationOutput> => {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is missing. Add it to the backend environment.");
    }

    const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: buildMessages(input),
        }),
    });

    const data = (await response.json()) as OpenAiChatCompletionResponse;

    if (!response.ok) {
        throw new Error(
            data.error?.message || "AI screening request failed."
        );
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("AI screening response was empty.");
    }

    return parseScreeningResponse(content);
};

export default {
    screenApplication,
};
