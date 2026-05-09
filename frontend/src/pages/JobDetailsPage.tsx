import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import UserTaskbar from "../components/UserTaskbar";
import { AppDispatch, RootState } from "../app/store";
import { getJobs } from "../features/jobsSlice";
import { createDraft, submitDraft } from "../features/applicationsSlice";

const formatDate = (value?: string): string => {
    if (!value) {
        return "No deadline";
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

function JobDetailsPage() {
    const { uid } = useParams<{ uid: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const jobs = useSelector((state: RootState) => state.jobs.items);
    const loading = useSelector((state: RootState) => state.jobs.loading);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const [cvLink, setCvLink] = useState("");
    const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (jobs.length === 0) {
            dispatch(getJobs({}));
        }
    }, [dispatch, jobs.length]);

    const job = jobs.find((item) => item.uid === uid);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setCoverLetterFile(event.target.files?.[0] ?? null);
    };

    const buildApplicationPayload = (): FormData => {
        const formData = new FormData();

        if (uid) {
            formData.append("job_uid", uid);
        }

        formData.append("cv_link", cvLink);

        if (coverLetterFile) {
            formData.append("cover_letter_file", coverLetterFile);
        }

        return formData;
    };

    const handleDraft = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!isAuthenticated) {
            navigate("/auth");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const result = await dispatch(createDraft(buildApplicationPayload())).unwrap();
            setSuccessMessage(result.message);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create draft.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleApply = async () => {
        if (!isAuthenticated) {
            navigate("/auth");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const draft = await dispatch(createDraft(buildApplicationPayload())).unwrap();
            const submitPayload = new FormData();

            submitPayload.append("cv_link", cvLink);

            if (coverLetterFile) {
                submitPayload.append("cover_letter_file", coverLetterFile);
            }

            const result = await dispatch(
                submitDraft({
                    applicationUid: draft.application.uid,
                    formData: submitPayload,
                })
            ).unwrap();
            setSuccessMessage(result.message);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to submit application.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !job) {
        return <div className="jobs-page">Loading job details...</div>;
    }

    if (!job) {
        return (
            <div className="jobs-page">
                <UserTaskbar currentPath="job" />
                <div className="jobs-empty-state">
                    This job could not be found. It may have been removed or the link is outdated.
                </div>
            </div>
        );
    }

    return (
        <div className="jobs-page jobs-detail-page">
            <UserTaskbar currentPath="job" />

            <header className="jobs-topbar jobs-topbar-detail">
                <div className="jobs-brand">
                    <span className="jobs-brand-mark" />
                    <div>
                        <strong>Job MNG System</strong>
                        <span>Role details and application workspace.</span>
                    </div>
                </div>

                <button type="button" className="jobs-taskbar-link" onClick={() => navigate("/")}>
                    Back to jobs
                </button>
            </header>

            <section className="job-detail-layout">
                <article className="job-detail-main">
                    <div className="job-detail-hero-card">
                        <span className="job-card-company">{job.company}</span>
                        <h1>{job.title}</h1>
                        <p className="job-detail-intro">
                            Review the role, confirm the fit, and either save your progress as a draft
                            or submit a full application from the panel on the right.
                        </p>

                        <div className="job-card-meta">
                            <span>{job.location}</span>
                            <span>{job.category}</span>
                            <span>{job.job_type}</span>
                            <span>{job.work_mode}</span>
                        </div>
                    </div>

                    <div className="job-detail-body-card">
                        <div className="job-detail-section">
                            <h2>Role overview</h2>
                            <p>{job.description}</p>
                        </div>

                        <div className="job-detail-section">
                            <h2>Requirements</h2>
                            <p>{job.requirements}</p>
                        </div>
                    </div>
                </article>

                <aside className="job-detail-sidebar">
                    <div className="job-detail-summary-card">
                        <h2>Summary</h2>
                        <div className="job-detail-summary-list">
                            <div>
                                <span>Location</span>
                                <strong>{job.location}</strong>
                            </div>
                            <div>
                                <span>Category</span>
                                <strong>{job.category}</strong>
                            </div>
                            <div>
                                <span>Contract</span>
                                <strong>{job.job_type}</strong>
                            </div>
                            <div>
                                <span>Work mode</span>
                                <strong>{job.work_mode}</strong>
                            </div>
                            <div>
                                <span>Deadline</span>
                                <strong>{formatDate(job.deadline)}</strong>
                            </div>
                        </div>
                    </div>

                    <form className="job-application-card" onSubmit={handleDraft}>
                        <h2>Apply for this role</h2>
                        <p>
                            Upload your cover letter, add your CV link, then either save a draft or
                            submit right away.
                        </p>

                        <label className="job-application-field">
                            <span>CV link</span>
                            <input
                                type="url"
                                placeholder="https://your-cv-link.com"
                                value={cvLink}
                                onChange={(event) => setCvLink(event.target.value)}
                                required
                            />
                        </label>

                        <label className="job-application-field">
                            <span>Cover letter file</span>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                                required
                            />
                        </label>

                        {coverLetterFile ? (
                            <p className="job-application-note">
                                Selected file: <strong>{coverLetterFile.name}</strong>
                            </p>
                        ) : null}

                        {currentUser?.role === "admin" ? (
                            <p className="jobs-error">
                                Applications are only available to regular users.
                            </p>
                        ) : null}

                        {errorMessage ? <p className="jobs-error">{errorMessage}</p> : null}
                        {successMessage ? <p className="job-application-success">{successMessage}</p> : null}

                        <div className="job-application-actions">
                            <button
                                type="submit"
                                className="jobs-secondary-button job-application-draft"
                                disabled={submitting || currentUser?.role === "admin"}
                            >
                                {submitting ? "Saving..." : "Create draft"}
                            </button>

                            <button
                                type="button"
                                className="jobs-primary-button"
                                disabled={submitting || currentUser?.role === "admin"}
                                onClick={handleApply}
                            >
                                {submitting ? "Submitting..." : "Apply now"}
                            </button>
                        </div>
                    </form>
                </aside>
            </section>
        </div>
    );
}

export default JobDetailsPage;
