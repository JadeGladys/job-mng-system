import { Resend } from "resend";
import {
    buildApplicationStatusChangedEmail,
    buildApplicationSubmittedEmail,
    buildWelcomeEmail,
} from "./emailTemplates";

const getEmailConfig = () => {
    const resendApiKey = process.env.RESEND_API_KEY || "";
    const emailFrom = process.env.EMAIL_FROM || "";

    return {
        resendApiKey,
        emailFrom,
        resend: resendApiKey ? new Resend(resendApiKey) : null,
    };
};

const sendEmail = async (
    to: string,
    subject: string,
    html: string
): Promise<void> => {
    const { resend, emailFrom } = getEmailConfig();

    if (!resend) {
        console.warn("Email skipped: RESEND_API_KEY is missing.");
        return;
    }

    if (!emailFrom) {
        console.warn("Email skipped: EMAIL_FROM is missing.");
        return;
    }

    await resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
    });
};

const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
    const template = buildWelcomeEmail(name);
    await sendEmail(to, template.subject, template.html);
};

const sendApplicationSubmittedEmail = async (
    to: string,
    applicantName: string,
    jobTitle: string,
    company: string
): Promise<void> => {
    const template = buildApplicationSubmittedEmail(
        applicantName,
        jobTitle,
        company
    );
    await sendEmail(to, template.subject, template.html);
};

const sendApplicationStatusChangedEmail = async (
    to: string,
    applicantName: string,
    jobTitle: string,
    company: string,
    status: "rejected" | "shortlisted"
): Promise<void> => {
    const template = buildApplicationStatusChangedEmail(
        applicantName,
        jobTitle,
        company,
        status
    );
    await sendEmail(to, template.subject, template.html);
};

export default {
    sendEmail,
    sendWelcomeEmail,
    sendApplicationSubmittedEmail,
    sendApplicationStatusChangedEmail,
};
