import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "../pages/HomePage";
import authReducer, { AuthUser } from "../features/authSlice";
import jobsReducer, { Job, JobFilters } from "../features/jobsSlice";
import { fetchJobs } from "../services/jobService";

const mockedNavigate = jest.fn();

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

const mockedFetchJobs = fetchJobs as jest.MockedFunction<typeof fetchJobs>;

type RenderOptions = {
    authState?: {
        token: string | null;
        user: AuthUser | null;
        isAuthenticated: boolean;
    };
    jobsState?: {
        items: Job[];
        loading: boolean;
        error: string;
        filters: JobFilters;
        selectedJob: Job | null;
    };
};

const createJob = (overrides: Partial<Job> = {}): Job => ({
    uid: "job-1",
    title: "Frontend Engineer",
    description: "Build polished user experiences for the product.",
    location: "Kigali",
    company: "CloudAxis",
    category: "Engineering",
    job_type: "Full-time",
    work_mode: "Remote",
    requirements: "React, TypeScript, teamwork",
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

const defaultFilters: JobFilters = {
    title: "",
    location: "",
    category: "",
    job_type: "",
    work_mode: "",
};

const renderHomePage = ({
    authState = {
        token: null,
        user: null,
        isAuthenticated: false,
    },
    jobsState = {
        items: [],
        loading: false,
        error: "",
        filters: defaultFilters,
        selectedJob: null,
    },
}: RenderOptions = {}) => {
    const store = configureStore({
        reducer: {
            auth: authReducer,
            jobs: jobsReducer,
        },
        preloadedState: {
            auth: authState,
            jobs: jobsState,
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        </Provider>
    );
};

describe("HomePage job listing", () => {
    beforeEach(() => {
        mockedNavigate.mockReset();
        mockedFetchJobs.mockReset();
        localStorage.clear();
    });

    // Tests that fetched jobs render as public job cards with their main metadata.
    it("renders fetched job cards successfully", async () => {
        const job = createJob();

        mockedFetchJobs.mockResolvedValue({
            message: "Jobs fetched successfully.",
            jobs: [job],
        });

        renderHomePage();

        const title = await screen.findByText("Frontend Engineer");
        const jobCard = title.closest("article");

        expect(jobCard).not.toBeNull();
        expect(screen.getByText("CloudAxis")).toBeInTheDocument();
        expect(within(jobCard as HTMLElement).getByText("Kigali")).toBeInTheDocument();
        expect(within(jobCard as HTMLElement).getByText("Engineering")).toBeInTheDocument();
        expect(within(jobCard as HTMLElement).getByText("Remote")).toBeInTheDocument();
    });

    // Tests that the public jobs page shows a loading state while job data is still being fetched.
    it("shows loading state while jobs are being fetched", async () => {
        mockedFetchJobs.mockImplementation(
            () =>
                new Promise(() => {
                    return undefined;
                })
        );

        renderHomePage();

        expect(screen.getByText("Loading public job listings...")).toBeInTheDocument();
        expect(screen.getByText("Refreshing listings...")).toBeInTheDocument();
    });

    // Tests that the empty state is shown when the jobs endpoint returns no listings.
    it("shows empty state when no jobs are returned", async () => {
        mockedFetchJobs.mockResolvedValue({
            message: "Jobs fetched successfully.",
            jobs: [],
        });

        renderHomePage();

        expect(
            await screen.findByText("No jobs matched your search yet. Try adjusting the filters above.")
        ).toBeInTheDocument();
    });

    // Tests that a rejected jobs fetch surfaces the user-facing error message.
    it("shows an error state when fetching jobs fails", async () => {
        mockedFetchJobs.mockRejectedValue(new Error("Jobs API is unavailable."));

        renderHomePage();

        expect(await screen.findByText("Jobs API is unavailable.")).toBeInTheDocument();
    });

    // Tests that search and category filters trigger a filtered jobs refresh through Redux.
    it("applies search filters and re-renders the filtered job list", async () => {
        const initialJob = createJob({
            uid: "job-1",
            title: "Frontend Engineer",
            company: "CloudAxis",
            category: "Engineering",
        });
        const filteredJob = createJob({
            uid: "job-2",
            title: "Product Designer",
            company: "Proto",
            category: "Design",
            location: "Musanze",
        });

        mockedFetchJobs.mockImplementation(async (filters: Partial<JobFilters> = {}) => {
            if (filters.title === "Product Designer" && filters.category === "Design") {
                return {
                    message: "Jobs fetched successfully.",
                    jobs: [filteredJob],
                };
            }

            return {
                message: "Jobs fetched successfully.",
                jobs: [initialJob, filteredJob],
            };
        });

        renderHomePage();

        expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
        expect(screen.getByText("Product Designer")).toBeInTheDocument();

        await userEvent.clear(screen.getByPlaceholderText("Search by role title"));
        await userEvent.type(screen.getByPlaceholderText("Search by role title"), "Product Designer");
        await userEvent.selectOptions(screen.getByDisplayValue("Any category"), "Design");
        await userEvent.click(screen.getByRole("button", { name: "Search jobs" }));

        await waitFor(() => {
            expect(screen.getByText("Product Designer")).toBeInTheDocument();
            expect(screen.queryByText("Frontend Engineer")).not.toBeInTheDocument();
        });
    });

    // Tests that unauthenticated users are sent to the auth page when they select a job card.
    it("redirects unauthenticated users to /auth when selecting a job", async () => {
        const job = createJob();

        mockedFetchJobs.mockResolvedValue({
            message: "Jobs fetched successfully.",
            jobs: [job],
        });

        renderHomePage();

        await userEvent.click(await screen.findByText("Frontend Engineer"));

        expect(mockedNavigate).toHaveBeenCalledWith("/auth");
    });

    // Tests that authenticated users navigate to the selected job details route.
    it("navigates authenticated users to the selected job details page", async () => {
        const job = createJob({ uid: "job-42" });

        mockedFetchJobs.mockResolvedValue({
            message: "Jobs fetched successfully.",
            jobs: [job],
        });

        renderHomePage({
            authState: {
                token: "user-token",
                user: createAuthUser("user"),
                isAuthenticated: true,
            },
        });

        await userEvent.click(await screen.findByText("Frontend Engineer"));

        expect(mockedNavigate).toHaveBeenCalledWith("/jobs/job-42");
    });
});
