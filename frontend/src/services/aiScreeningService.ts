import apiClient, { getApiErrorMessage } from "./apiClient";

export type AiScreeningResult = {
    application_uid: string;
    ai_score: number;
    ai_summary: string;
    ai_recommendation: "reject" | "review" | "shortlist";
};

export type AiScreeningResponse = {
    message: string;
    screening: AiScreeningResult;
};

export const runAiScreening = async (
    applicationUid: string
): Promise<AiScreeningResponse> => {
    try {
        const response = await apiClient.post<AiScreeningResponse>(
            `/applications/${applicationUid}/ai-screen`
        );

        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to run AI screening."));
    }
};
