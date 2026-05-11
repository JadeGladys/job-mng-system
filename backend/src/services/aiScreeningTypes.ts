export type AiRecommendation = "reject" | "review" | "shortlist";

export type ScreenApplicationInput = {
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

export type ScreenApplicationOutput = {
    score: number;
    summary: string;
    recommendation: AiRecommendation;
};
