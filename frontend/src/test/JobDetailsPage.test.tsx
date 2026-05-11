import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobDetailsPage from "../pages/JobDetailsPage";
import authReducer, { AuthUser } from "../features/authSlice";
import jobsReducer, { Job } from "../features/jobsSlice";
import { fetchJobs } from "../services/jobService";
import {
    createApplicationDraft,
    submitApplication,
} from "../services/applicationService";

const mockedNavigate = jest.fn();

jest.mock("../services/applicationService", () => ({
    createApplicationDraft: jest.fn(),
    submitApplication: jest.fn(),
    fetchMyApplications: jest.fn(),
    fetchAllApplications: jest.fn(),
    updateApplicationDraft: jest.fn(),
    updateAdminApplicationStatus: jest.fn(),
}));

jest.mock("../services/jobService", () => ({
    fetchJobs: jest.fn(),
}));

jest.mock("../components/UserTaskbar", () => () => <div>UserTaskbar</div>);

jest.mock("react-router-dom", () => {
    const actual = jest.requireActual("react-router-dom");

    return {
        ...actual,
        useNavigate: () => mockedNavigate,
    };
});

const mockedCreateApplicationDraft = createApplicationDraft as jest.MockedFunction<
    typeof createApplicationDraft
>;
const mockedSubmitApplication = submitApplication as jest.MockedFunction<
    typeof submitApplication
>;
const mockedFetchJobs = fetchJobs as jest.MockedFunction<typeof fetchJobs>;

const createJob = (overrides: Partial<Job> = {}): Job => ({
    uid: "job-1",
    title: "DevOps Engineer",
    description: "Build reliable deployment and infrastructure workflows.",
    location: "Kigali",
    company: "CloudAxis",
    category: "Engineering",
    job_type: "Full-time",
    work_mode: "Remote",
    requirements: "CI/CD, Docker, teamwork",
    deadline: "2026-12-31",
    ...overrides,
});

const createAuthUser = (role = "user"): AuthUser => ({
    uid: role === "admin" ? "admin-1" : "user-1",
    name: role === "admin" ? "System Admin" : "Normal User",
    email: role === "admin" ? "admin@example.com" : "user@example.com",
    phone_number: "0780000000",
    role,
});

const applicationsTestReducer = (
    state = {
        items: [],
        adminItems: [],
        filters: {},
        adminFilters: {},
        loading: false,
        adminLoading: false,
        error: "",
        adminError: "",
        actionLoading: false,
        actionError: "",
        actionMessage: "",
        adminActionLoading: false,
        adminActionError: "",
        adminActionMessage: "",
    }
) => state;

type RenderOptions = {
    job?: Job;
    authState?: {
        token: string | null;
        user: AuthUser | null;
        isAuthenticated: boolean;
    };
};

const renderJobDetailsPage = ({
    job = createJob(),
    authState = {
        token: "user-token",
        user: createAuthUser("user"),
        isAuthenticated: true,
    },
}: RenderOptions = {}) => {
    const store = configureStore({
        reducer: {
            auth: authReducer,
            jobs: jobsReducer,
            applications: applicationsTestReducer,
        },
        preloadedState: {
            auth: authState,
            jobs: {
                items: [job],
                loading: false,
                error: "",
                filters: {
                    title: "",
                    location: "",
                    category: "",
                    job_type: "",
                    work_mode: "",
                },
                selectedJob: null,
            },
            applications: {
                items: [],
                adminItems: [],
                filters: {},
                adminFilters: {},
                loading: false,
                adminLoading: false,
                error: "",
                adminError: "",
                actionLoading: false,
                actionError: "",
                actionMessage: "",
                adminActionLoading: false,
                adminActionError: "",
                adminActionMessage: "",
            },
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/jobs/${job.uid}`]}>
                <Routes>
                    <Route path="/jobs/:uid" element={<JobDetailsPage />} />
                    <Route path="/auth" element={<div>Auth page</div>} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
};

const uploadCoverLetter = async () => {
    const file = new File(["cover letter content"], "cover-letter.pdf", {
        type: "application/pdf",
    });

    await userEvent.upload(
        screen.getByLabelText("Cover letter file"),
        file
    );

    return file;
};

describe("JobDetailsPage application form", () => {
    beforeEach(() => {
        mockedNavigate.mockReset();
        mockedCreateApplicationDraft.mockReset();
        mockedSubmitApplication.mockReset();
        mockedFetchJobs.mockReset();
        mockedFetchJobs.mockResolvedValue({
            message: "Jobs fetched successfully.",
            jobs: [],
        });
        localStorage.clear();
    });

    // Tests that the application form renders the selected job details and inputs.
    it("renders the job details application form", () => {
        renderJobDetailsPage();

        expect(screen.getByText("DevOps Engineer")).toBeInTheDocument();
        expect(screen.getByText("CloudAxis")).toBeInTheDocument();
        expect(screen.getByText("Apply for this role")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("https://your-cv-link.com")).toBeInTheDocument();
        expect(screen.getByLabelText("Cover letter file")).toBeInTheDocument();
    });

    // Tests that authenticated users can create a draft with a CV link and uploaded file.
    it("creates an application draft successfully", async () => {
        mockedCreateApplicationDraft.mockResolvedValue({
            message: "Application draft created successfully.",
            application: {
                uid: "application-1",
                job_uid: "job-1",
                cover_letter_file_link: "/uploads/applications/cover-letter.pdf",
                cv_link: "https://example.com/cv.pdf",
                status: "draft",
            },
        });

        renderJobDetailsPage();

        await userEvent.type(
            screen.getByPlaceholderText("https://your-cv-link.com"),
            "https://example.com/cv.pdf"
        );
        const file = await uploadCoverLetter();
        const form = screen
            .getByRole("button", { name: "Create draft" })
            .closest("form") as HTMLFormElement;

        fireEvent.submit(form);

        await waitFor(() => {
            expect(mockedCreateApplicationDraft).toHaveBeenCalledTimes(1);
        });

        const formData = mockedCreateApplicationDraft.mock.calls[0][0];

        expect(formData.get("job_uid")).toBe("job-1");
        expect(formData.get("cv_link")).toBe("https://example.com/cv.pdf");
        expect(formData.get("cover_letter_file")).toBe(file);
        expect(
            await screen.findByText("Application draft created successfully.")
        ).toBeInTheDocument();
    });

    // Tests that authenticated users can apply immediately by creating a draft and then submitting it.
    it("submits an application successfully when apply now is clicked", async () => {
        mockedCreateApplicationDraft.mockResolvedValue({
            message: "Application draft created successfully.",
            application: {
                uid: "application-42",
                job_uid: "job-1",
                cover_letter_file_link: "/uploads/applications/cover-letter.pdf",
                cv_link: "https://example.com/cv.pdf",
                status: "draft",
            },
        });
        mockedSubmitApplication.mockResolvedValue({
            message: "Application submitted successfully.",
        });

        renderJobDetailsPage();

        await userEvent.type(
            screen.getByPlaceholderText("https://your-cv-link.com"),
            "https://example.com/cv.pdf"
        );
        const file = await uploadCoverLetter();

        await userEvent.click(screen.getByRole("button", { name: "Apply now" }));

        await waitFor(() => {
            expect(mockedCreateApplicationDraft).toHaveBeenCalledTimes(1);
            expect(mockedSubmitApplication).toHaveBeenCalledTimes(1);
        });

        expect(mockedSubmitApplication).toHaveBeenCalledWith(
            "application-42",
            expect.any(FormData)
        );

        const submitFormData = mockedSubmitApplication.mock.calls[0][1];
        expect(submitFormData.get("cv_link")).toBe("https://example.com/cv.pdf");
        expect(submitFormData.get("cover_letter_file")).toBe(file);
        expect(
            await screen.findByText("Application submitted successfully.")
        ).toBeInTheDocument();
    });

    // Tests that unauthenticated users are redirected to the auth page when they try to create a draft.
    it("redirects unauthenticated users to /auth when they try to create a draft", async () => {
        renderJobDetailsPage({
            authState: {
                token: null,
                user: null,
                isAuthenticated: false,
            },
        });

        await userEvent.type(
            screen.getByPlaceholderText("https://your-cv-link.com"),
            "https://example.com/cv.pdf"
        );
        await uploadCoverLetter();
        const form = screen
            .getByRole("button", { name: "Create draft" })
            .closest("form") as HTMLFormElement;

        fireEvent.submit(form);

        expect(mockedNavigate).toHaveBeenCalledWith("/auth");
        expect(mockedCreateApplicationDraft).not.toHaveBeenCalled();
    });

    // Tests that admins are blocked from using the application form and see the regular-user warning.
    it("shows the admin-only warning and disables form actions for admin users", () => {
        renderJobDetailsPage({
            authState: {
                token: "admin-token",
                user: createAuthUser("admin"),
                isAuthenticated: true,
            },
        });

        expect(
            screen.getByText("Applications are only available to regular users.")
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Create draft" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Apply now" })).toBeDisabled();
    });
});
