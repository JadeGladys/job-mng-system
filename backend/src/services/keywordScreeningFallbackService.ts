import type {
    AiRecommendation,
    ScreenApplicationInput,
    ScreenApplicationOutput,
} from "./aiScreeningTypes";

const MINIMUM_KEYWORD_LENGTH = 3;
const MAX_KEYWORDS = 16;
const FALLBACK_REJECTION_THRESHOLD = 35;
const FALLBACK_SHORTLIST_THRESHOLD = 70;
const MAX_TEXT_LENGTH = 12000;

const STOP_WORDS = new Set([
    "about",
    "able",
    "across",
    "after",
    "also",
    "among",
    "and",
    "are",
    "because",
    "been",
    "before",
    "being",
    "build",
    "built",
    "candidate",
    "candidates",
    "clear",
    "collaborate",
    "company",
    "create",
    "data",
    "deliver",
    "drive",
    "each",
    "ensure",
    "experience",
    "from",
    "have",
    "help",
    "into",
    "join",
    "knowledge",
    "looking",
    "more",
    "must",
    "need",
    "our",
    "role",
    "skills",
    "strong",
    "team",
    "that",
    "their",
    "them",
    "they",
    "this",
    "through",
    "using",
    "will",
    "with",
    "work",
    "worked",
    "working",
    "years",
]);

const trimForPrompt = (value: string): string =>
    value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);

const clampScore = (value: number): number =>
    Math.min(100, Math.max(0, Math.round(value)));

const escapeRegExp = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toKeywordTokens = (value: string): string[] =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9+#.\-/\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(
            (token) =>
                token.length >= MINIMUM_KEYWORD_LENGTH && !STOP_WORDS.has(token)
        );

const dedupeKeywords = (keywords: string[]): string[] => [...new Set(keywords)];

const buildKeywordCandidates = (input: ScreenApplicationInput): string[] => {
    const combinedJobText = [
        input.jobTitle,
        input.company,
        input.location,
        input.category,
        input.jobType,
        input.workMode,
        input.jobDescription,
        input.jobRequirements,
    ].join(" ");

    return dedupeKeywords(toKeywordTokens(combinedJobText)).slice(0, MAX_KEYWORDS);
};

const hasKeywordMatch = (keyword: string, haystack: string): boolean => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
    return pattern.test(haystack);
};

const buildFallbackRecommendation = (score: number): AiRecommendation => {
    if (score >= FALLBACK_SHORTLIST_THRESHOLD) {
        return "shortlist";
    }

    if (score <= FALLBACK_REJECTION_THRESHOLD) {
        return "reject";
    }

    return "review";
};

const buildFallbackSummary = (
    matchedKeywords: string[],
    missingKeywords: string[],
    score: number,
    recommendation: AiRecommendation,
    reason: string
): string => {
    const matchedText =
        matchedKeywords.length > 0
            ? matchedKeywords.join(", ")
            : "No strong keyword matches were found";
    const missingText =
        missingKeywords.length > 0
            ? missingKeywords.join(", ")
            : "No major keyword gaps were identified from the current fallback check";

    return [
        "Summary:",
        `Fallback keyword screening was used because the primary AI screening flow was unavailable (${reason}). The applicant matched ${matchedKeywords.length} key requirement keywords and received a score of ${score}/100 with a ${recommendation} recommendation.`,
        "",
        "Strengths:",
        matchedText,
        "",
        "Concerns:",
        missingText,
    ].join("\n");
};

const screenApplication = (
    input: ScreenApplicationInput,
    reason: string
): ScreenApplicationOutput => {
    const applicantText = trimForPrompt(
        `${input.cvText} ${input.coverLetterText}`
    ).toLowerCase();
    const keywordCandidates = buildKeywordCandidates(input);

    if (keywordCandidates.length === 0) {
        return {
            score: 50,
            summary: [
                "Summary:",
                `Fallback keyword screening was used because the primary AI screening flow was unavailable (${reason}). No stable keyword set could be extracted from the job details, so the application was marked for manual review.`,
                "",
                "Strengths:",
                "The submitted documents were available for manual screening.",
                "",
                "Concerns:",
                "Automatic fallback screening could not extract enough meaningful job keywords.",
            ].join("\n"),
            recommendation: "review",
        };
    }

    const matchedKeywords = keywordCandidates.filter((keyword) =>
        hasKeywordMatch(keyword, applicantText)
    );
    const missingKeywords = keywordCandidates.filter(
        (keyword) => !matchedKeywords.includes(keyword)
    );
    const score = clampScore(
        (matchedKeywords.length / keywordCandidates.length) * 100
    );
    const recommendation = buildFallbackRecommendation(score);

    return {
        score,
        summary: buildFallbackSummary(
            matchedKeywords,
            missingKeywords,
            score,
            recommendation,
            reason
        ),
        recommendation,
    };
};

export default {
    screenApplication,
};
