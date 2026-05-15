import nodemailer from "nodemailer";
import {
    buildApplicationStatusChangedEmail,
    buildApplicationSubmittedEmail,
    buildWelcomeEmail,
} from "./emailTemplates";

const getEmailConfig = () => {
    const smtpHost = process.env.SMTP_HOST || "";
    const smtpPort = Number(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPass = process.env.SMTP_PASS || "";
    const emailFrom = process.env.EMAIL_FROM || smtpUser;
    const secure = process.env.SMTP_SECURE === "true";

    return {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        secure,
        emailFrom,
    };
};

const sendEmail = async (
    to: string,
    subject: string,
    html: string
): Promise<void> => {
    const { smtpHost, smtpPort, smtpUser, smtpPass, secure, emailFrom } = getEmailConfig();

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.warn("Email skipped: SMTP configuration is incomplete.");
        return;
    }

    if (!emailFrom) {
        console.warn("Email skipped: EMAIL_FROM is missing.");
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    await transporter.sendMail({
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
