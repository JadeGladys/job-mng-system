export type EmailTemplate = {
    subject: string;
    html: string;
};

const wrapEmailLayout = (title: string, body: string): string => `
    <div style="font-family: Arial, sans-serif; background: #f6f8fb; padding: 24px; color: #10213d;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #d9e3f0;">
            <h1 style="margin-top: 0; color: #18345f;">${title}</h1>
            <div style="font-size: 15px; line-height: 1.6;">
                ${body}
            </div>
            <hr style="border: none; border-top: 1px solid #e5ecf5; margin: 24px 0;" />
            <p style="margin: 0; font-size: 13px; color: #62748c;">
                Job MNG System
            </p>
        </div>
    </div>
`;

export const buildWelcomeEmail = (name: string): EmailTemplate => ({
    subject: "Welcome to Job MNG System",
    html: wrapEmailLayout(
        "Welcome to Job MNG System",
        `
            <p>Hello ${name},</p>
            <p>Your account has been created successfully.</p>
            <p>You can now browse jobs, save drafts, and submit applications through the platform.</p>
        `
    ),
});

export const buildApplicationSubmittedEmail = (
    applicantName: string,
    jobTitle: string,
    company: string
): EmailTemplate => ({
    subject: "Application submitted successfully",
    html: wrapEmailLayout(
        "Application Submitted",
        `
            <p>Hello ${applicantName},</p>
            <p>Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been submitted successfully.</p>
            <p>We will notify you when your application status changes.</p>
        `
    ),
});

export const buildApplicationStatusChangedEmail = (
    applicantName: string,
    jobTitle: string,
    company: string,
    status: "rejected" | "shortlisted"
): EmailTemplate => {
    if (status === "shortlisted") {
        return {
            subject: `Congratulations! You have been shortlisted`,
            html: wrapEmailLayout(
                "Congratulations!",
                `
                        <p>Hello ${applicantName},</p>
                        <p>Congratulations! Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been <strong>shortlisted</strong>.</p>
                        <p>The hiring team may contact you with the next steps soon.</p>
                    `
            ),
        };
    }

    return {
        subject: "Application update",
        html: wrapEmailLayout(
            "Application Update",
            `
                <p>Hello ${applicantName},</p>
                <p>Unfortunately, your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> was not successful this time.</p>
                <p>Thank you for your interest, and we encourage you to apply again for future opportunities.</p>
            `
        ),
    };

};
