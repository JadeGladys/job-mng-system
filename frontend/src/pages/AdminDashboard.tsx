import { ChangeEvent, FormEvent, ReactElement, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    createJob,
    deleteJob,
    JobPayload,
    updateJob,
} from "../services/jobService";
import { logout } from "../features/authSlice";
import { getJobs, Job } from "../features/jobsSlice";
import { AppDispatch, RootState } from "../app/store";

const categoryOptions = ["IT", "Commerce", "Education", "Marketing", "Design"];
const jobTypeOptions = ["Full-time", "Part-time", "Internship", "Contract"];
const workModeOptions = ["Remote", "Hybrid", "Onsite"];

type AdminView = "overview" | "create" | "manage" | "settings";

type SectionConfig = Record<
    AdminView,
    {
        label: string;
        eyebrow: string;
        actionLabel: string;
    }
>;

type AdminSectionHeaderProps = {
    eyebrow: string;
    actionLabel: string;
    onAction: () => void;
};

const emptyForm: JobPayload = {
    title: "",
    description: "",
    location: "",
    company: "",
    category: "IT",
    job_type: "Full-time",
    work_mode: "Hybrid",
    requirements: "",
    deadline: "",
};

const sectionConfig: SectionConfig = {
    overview: {
        label: "Overview",
        eyebrow: "Admin dashboard",
        actionLabel: "Refresh jobs",
    },
    create: {
        label: "Create job post",
        eyebrow: "Job publishing",
        actionLabel: "Clear form",
    },
    manage: {
        label: "Managed listings",
        eyebrow: "Inventory view",
        actionLabel: "Refresh jobs",
    },
    settings: {
        label: "Settings",
        eyebrow: "Workspace settings",
        actionLabel: "Refresh jobs",
    },
};

const formatDate = (value?: string) => {
    if (!value) {
        return "No date";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

function AdminSectionHeader({
    eyebrow,
    actionLabel,
    onAction,
}: AdminSectionHeaderProps): ReactElement {
    return (
        <header className="admin-jobs-header">
            <div className="admin-jobs-header-intro">
                <span className="jobs-section-label">{eyebrow}</span>
            </div>

            <div className="admin-jobs-header-actions">
                <button type="button" className="admin-jobs-ghost-button" onClick={onAction}>
                    {actionLabel}
                </button>
            </div>
        </header>
    );
}

function AdminDashboard() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [activeView, setActiveView] = useState<AdminView>("overview");
    const [formData, setFormData] = useState<JobPayload>(emptyForm);
    const [actionError, setActionError] = useState("");


    const dispatch = useDispatch<AppDispatch>();

    const jobs = useSelector((state: RootState) => state.jobs.items);
    const loading = useSelector((state: RootState) => state.jobs.loading);
    const jobsError = useSelector((state: RootState) => state.jobs.error);
    const error = actionError || jobsError;

    const currentUser = useSelector((state: RootState) => state.auth.user);

    const loadJobs = async () => {
        setActionError("");
        await dispatch(getJobs({}));
    };

    useEffect(() => {
        loadJobs();
    }, [dispatch]);

    useEffect(() => {
        if (!successMessage) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setSuccessMessage("");
        }, 3200);

        return () => window.clearTimeout(timeoutId);
    }, [successMessage]);

    const stats = useMemo(() => {
        const remoteCount = jobs.filter((job) => job.work_mode === "Remote").length;
        const activeCategories = new Set(jobs.map((job) => job.category)).size;
        const closingSoon = jobs.filter((job) => {
            if (!job.deadline) {
                return false;
            }

            const deadline = new Date(job.deadline);
            const today = new Date();
            const daysUntilDeadline = (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

            return daysUntilDeadline >= 0 && daysUntilDeadline <= 30;
        }).length;

        return [
            {
                label: "Live job posts",
                value: jobs.length,
                detail: "All active opportunities currently visible on the board.",
            },
            {
                label: "Remote-friendly roles",
                value: remoteCount,
                detail: "Useful for balancing work-mode flexibility across roles.",
            },
            {
                label: "Categories covered",
                value: activeCategories,
                detail: "Shows how widely the current hiring mix is distributed.",
            },
            {
                label: "Closing within 30 days",
                value: closingSoon,
                detail: "Roles that may need attention or promotion soon.",
            },
            {
                label: "Applications received",
                value: 0,
                detail: "Will populate when the application management flow goes live.",
            },
            {
                label: "AI screenings completed",
                value: 0,
                detail: "Reserved for the AI review workflow in the upcoming epic.",
            },
        ];
    }, [jobs]);

    const recentJobs = useMemo(() => jobs.slice(0, 3), [jobs]);

    const currentSection = sectionConfig[activeView];

    const handleChange = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = event.target;

        setFormData((current) => ({
            ...current,
            [name as keyof JobPayload]: value,
        }));
    };

    const resetForm = () => {
        setEditingJob(null);
        setFormData(emptyForm);
    };

    const handleEdit = (job: Job) => {
        setEditingJob(job);
        setSuccessMessage("");
        setActionError("");
        setActiveView("create");
        setFormData({
            title: job.title ?? "",
            description: job.description ?? "",
            location: job.location ?? "",
            company: job.company ?? "",
            category: job.category ?? "IT",
            job_type: job.job_type ?? "Full-time",
            work_mode: job.work_mode ?? "Hybrid",
            requirements: job.requirements ?? "",
            deadline: job.deadline ?? "",
        });
    };

    const buildUpdatePayload = (): Partial<JobPayload> => {
        if (!editingJob) {
            return formData;
        }

        return Object.entries(formData).reduce<Partial<JobPayload>>(
            (payload, [key, value]) => {
                const typedKey = key as keyof JobPayload;

                if ((editingJob[typedKey] ?? "") !== value) {
                    payload[typedKey] = value;
                }

                return payload;
            },
            {}
        );
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setActionError("");
        setSuccessMessage("");

        try {
            if (editingJob) {
                const updatePayload = buildUpdatePayload();

                if (Object.keys(updatePayload).length === 0) {
                    setSuccessMessage("No changes were detected for this job.");
                    setSubmitting(false);
                    return;
                }

                await updateJob(editingJob.uid, updatePayload);
                setSuccessMessage("Job updated successfully.");
            } else {
                await createJob(formData);
                setSuccessMessage("Job created successfully.");
            }

            resetForm();
            await dispatch(getJobs({}));
            setActiveView("manage");
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "Failed to save job.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (job: Job) => {
        const confirmed = window.confirm(`Delete "${job.title}" from ${job.company}?`);

        if (!confirmed) {
            return;
        }

        setActionError("");
        setSuccessMessage("");

        try {
            await deleteJob(job.uid);

            if (editingJob?.uid === job.uid) {
                resetForm();
            }

            setSuccessMessage("Job deleted successfully.");
            await dispatch(getJobs({}));
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "Failed to delete job.");
        }
    };

    const handleHeaderAction = () => {
        if (activeView === "create") {
            resetForm();
            return;
        }

        loadJobs();
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate("/auth");
    };


    const renderOverview = (): ReactElement => (
        <>
            <section className="admin-jobs-stats-grid">
                {stats.map((item) => (
                    <article key={item.label} className="admin-jobs-stat-card">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <p>{item.detail}</p>
                    </article>
                ))}
            </section>

            <section className="admin-jobs-overview-grid">
                <article className="admin-jobs-overview-card">
                    <div className="admin-jobs-section-header">
                        <div>
                            <h2>What needs attention next</h2>
                            <p>Use these quick prompts to stay ahead of the next admin flows.</p>
                        </div>
                    </div>

                    <div className="admin-jobs-overview-stack">
                        <button
                            type="button"
                            className="admin-jobs-overview-action"
                            onClick={() => {
                                resetForm();
                                setActiveView("create");
                            }}
                        >
                            <strong>Create a new job post</strong>
                            <span>Open the publishing workspace and draft a fresh role.</span>
                        </button>

                        <button
                            type="button"
                            className="admin-jobs-overview-action"
                            onClick={() => setActiveView("manage")}
                        >
                            <strong>Review live listings</strong>
                            <span>Audit deadlines, work modes, and recently updated roles.</span>
                        </button>

                        <div className="admin-jobs-overview-action is-static">
                            <strong>Applications and AI panels</strong>
                            <span>These spaces are already reserved and will activate in the next epics.</span>
                        </div>
                    </div>
                </article>

                <article className="admin-jobs-overview-card">
                    <div className="admin-jobs-section-header">
                        <div>
                            <h2>Recently published roles</h2>
                            <p>A small snapshot of the latest opportunities in the system.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="jobs-empty-state">Refreshing latest roles...</div>
                    ) : recentJobs.length === 0 ? (
                        <div className="jobs-empty-state">
                            No jobs yet. The first published role will appear here.
                        </div>
                    ) : (
                        <div className="admin-jobs-mini-list">
                            {recentJobs.map((job) => (
                                <button
                                    key={job.uid}
                                    type="button"
                                    className="admin-jobs-mini-card"
                                    onClick={() => handleEdit(job)}
                                >
                                    <div className="admin-jobs-mini-copy">
                                        <strong>{job.title}</strong>
                                        <span>
                                            {job.company} · {job.location}
                                        </span>
                                    </div>
                                    <span className="admin-jobs-mini-pill">{job.job_type}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </article>
            </section>
        </>
    );

    const renderCreateView = (): ReactElement => (
        <section className="admin-jobs-single-panel">
            <article className="admin-jobs-form-card">
                <div className="admin-jobs-section-header">
                    <div>
                        <h2>{editingJob ? "Edit job post" : "Create job post"}</h2>
                        <p>
                            {editingJob
                                ? "Adjust only what changed. The API will patch the selected fields."
                                : "Fill in the role details that should appear on the public jobs board."}
                        </p>
                    </div>

                    {editingJob ? (
                        <button type="button" className="admin-jobs-ghost-button" onClick={resetForm}>
                            Cancel edit
                        </button>
                    ) : null}
                </div>

                <form className="admin-jobs-form" onSubmit={handleSubmit}>
                    <div className="admin-jobs-form-grid">
                        <label className="admin-jobs-field admin-jobs-field-wide">
                            <span>Job title</span>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Senior Frontend Developer"
                                required
                            />
                        </label>

                        <label className="admin-jobs-field">
                            <span>Company</span>
                            <input
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                placeholder="TechNova"
                                required
                            />
                        </label>

                        <label className="admin-jobs-field">
                            <span>Location</span>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="Kigali"
                                required
                            />
                        </label>

                        <label className="admin-jobs-field">
                            <span>Category</span>
                            <select name="category" value={formData.category} onChange={handleChange}>
                                {categoryOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="admin-jobs-field">
                            <span>Job type</span>
                            <select name="job_type" value={formData.job_type} onChange={handleChange}>
                                {jobTypeOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="admin-jobs-field">
                            <span>Work mode</span>
                            <select name="work_mode" value={formData.work_mode} onChange={handleChange}>
                                {workModeOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="admin-jobs-field">
                            <span>Deadline</span>
                            <input
                                type="date"
                                name="deadline"
                                value={formData.deadline}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label className="admin-jobs-field admin-jobs-field-wide">
                            <span>Role overview</span>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe what the role covers and who the team is looking for."
                                rows={5}
                                required
                            />
                        </label>

                        <label className="admin-jobs-field admin-jobs-field-wide">
                            <span>Requirements</span>
                            <textarea
                                name="requirements"
                                value={formData.requirements}
                                onChange={handleChange}
                                placeholder="List the experience, tools, and soft skills expected from applicants."
                                rows={5}
                                required
                            />
                        </label>
                    </div>

                    <div className="admin-jobs-form-actions">
                        <button type="submit" className="jobs-primary-button" disabled={submitting}>
                            {submitting
                                ? editingJob
                                    ? "Updating job..."
                                    : "Creating job..."
                                : editingJob
                                    ? "Save changes"
                                    : "Publish job"}
                        </button>
                        <button type="button" className="admin-jobs-ghost-button" onClick={resetForm}>
                            Reset form
                        </button>
                    </div>
                </form>
            </article>
        </section>
    );

    const renderManageView = (): ReactElement => (
        <section className="admin-jobs-single-panel">
            <article className="admin-jobs-table-card">
                <div className="admin-jobs-section-header">
                    <div>
                        <h2>Managed job listings</h2>
                        <p>Review, update, and retire live roles from one dashboard.</p>
                    </div>
                    <span className="admin-jobs-count-chip">{jobs.length} jobs</span>
                </div>

                {loading ? (
                    <div className="jobs-empty-state">Loading admin job inventory...</div>
                ) : jobs.length === 0 ? (
                    <div className="jobs-empty-state">
                        No jobs have been published yet. Create one to start building the board.
                    </div>
                ) : (
                    <div className="admin-jobs-table-wrap">
                        <table className="admin-jobs-table">
                            <thead>
                                <tr>
                                    <th>Role</th>
                                    <th>Mode</th>
                                    <th>Deadline</th>
                                    <th>Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job) => (
                                    <tr key={job.uid}>
                                        <td>
                                            <div className="admin-jobs-role-cell">
                                                <strong>{job.title}</strong>
                                                <span>
                                                    {job.company} · {job.location} · {job.category}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="admin-jobs-meta-stack">
                                                <span>{job.job_type}</span>
                                                <strong>{job.work_mode}</strong>
                                            </div>
                                        </td>
                                        <td>{formatDate(job.deadline)}</td>
                                        <td>{formatDate(job.updated_at)}</td>
                                        <td>
                                            <div className="admin-jobs-row-actions">
                                                <button
                                                    type="button"
                                                    className="admin-jobs-inline-button"
                                                    onClick={() => handleEdit(job)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-jobs-inline-button is-danger"
                                                    onClick={() => handleDelete(job)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </article>
        </section>
    );

    const renderSettingsView = (): ReactElement => (
        <section className="admin-jobs-settings-grid">
            <article className="admin-jobs-overview-card">
                <div className="admin-jobs-section-header">
                    <div>
                        <h2>Workspace readiness</h2>
                        <p>Settings placeholders that will power the next admin workflows.</p>
                    </div>
                </div>

                <div className="admin-jobs-settings-list">
                    <div className="admin-jobs-setting-item">
                        <strong>Application review defaults</strong>
                        <span>Placeholder for review stages, status colors, and applicant queue preferences.</span>
                    </div>
                    <div className="admin-jobs-setting-item">
                        <strong>AI screening behavior</strong>
                        <span>Reserved for model choice, scoring thresholds, and analysis visibility settings.</span>
                    </div>
                    <div className="admin-jobs-setting-item">
                        <strong>Notification preferences</strong>
                        <span>Reserved for alerts when applications land or deadlines approach.</span>
                    </div>
                </div>
            </article>

            <article className="admin-jobs-overview-card">
                <div className="admin-jobs-section-header">
                    <div>
                        <h2>Coming soon blocks</h2>
                        <p>These cards make room for the epics still ahead.</p>
                    </div>
                </div>

                <div className="admin-jobs-coming-grid">
                    <div className="admin-jobs-coming-card">
                        <span>Applications</span>
                        <strong>0 active panels</strong>
                    </div>
                    <div className="admin-jobs-coming-card">
                        <span>AI review</span>
                        <strong>0 configured flows</strong>
                    </div>
                    <div className="admin-jobs-coming-card">
                        <span>Insights</span>
                        <strong>0 summary reports</strong>
                    </div>
                    <div className="admin-jobs-coming-card">
                        <span>Automation</span>
                        <strong>0 scheduled actions</strong>
                    </div>
                </div>
            </article>
        </section>
    );

    const menuItems: { key: AdminView; label: string }[] = [
        { key: "overview", label: "Dashboard" },
        { key: "create", label: "Create job post" },
        { key: "manage", label: "Managed listings" },
    ];


    return (
        <div className="admin-jobs-page">
            <aside className="admin-jobs-sidebar">
                <div className="admin-jobs-sidebar-top">
                    <div className="admin-jobs-brand">
                        <span className="admin-jobs-brand-mark" />
                        <div>
                            <strong>Job MNG System</strong>
                            <span>Admin console</span>
                        </div>
                    </div>

                    <div className="admin-jobs-sidebar-section admin-jobs-sidebar-section-spaced">
                        <span className="admin-jobs-sidebar-label">Workspace</span>
                        {menuItems.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className={`admin-jobs-nav-link ${activeView === item.key ? "is-active" : ""}`}
                                onClick={() => setActiveView(item.key)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="admin-jobs-sidebar-footer">
                    <span className="admin-jobs-user-chip">{currentUser?.name || "Admin"}</span>
                    <button
                        type="button"
                        className={`admin-jobs-nav-link ${activeView === "settings" ? "is-active" : ""}`}
                        onClick={() => setActiveView("settings")}
                    >
                        Settings
                    </button>
                    <button type="button" className="admin-jobs-logout-button" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="admin-jobs-main">
                <AdminSectionHeader
                    eyebrow={currentSection.eyebrow}
                    actionLabel={currentSection.actionLabel}
                    onAction={handleHeaderAction}
                />

                {(error || successMessage) && (
                    <section className="admin-jobs-feedback-row">
                        {error ? <div className="jobs-error">{error}</div> : null}
                        {successMessage ? <div className="admin-jobs-success">{successMessage}</div> : null}
                    </section>
                )}

                {activeView === "overview" ? renderOverview() : null}
                {activeView === "create" ? renderCreateView() : null}
                {activeView === "manage" ? renderManageView() : null}
                {activeView === "settings" ? renderSettingsView() : null}
            </main>
        </div>
    );
}

export default AdminDashboard;
