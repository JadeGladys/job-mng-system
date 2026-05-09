import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AppDispatch, RootState } from "../app/store";
import UserTaskbar from "../components/UserTaskbar";
import {
    clearApplicationFilters,
    clearApplicationFeedback,
    loadMyApplications,
    setApplicationFilters,
    submitDraft,
    updateDraft,
} from "../features/applicationsSlice";
import { ApplicationRecord } from "../services/applicationService";
import {
    formatWorkModeLabel,
    mergeOptionValues,
    mergeWorkModeValues,
} from "../utils/jobOptions";

type DraftModalState = {
    application: ApplicationRecord;
    cvLink: string;
    coverLetterFile: File | null;
    error: string;
    success: string;
    loading: boolean;
};

const isSubmittedStatus = (status: ApplicationRecord["status"]): boolean =>
    status === "pending" || status === "rejected" || status === "shortlisted";

function MyApplicationsPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const applications = useSelector((state: RootState) => state.applications.items);
    const filters = useSelector((state: RootState) => state.applications.filters);
    const loading = useSelector((state: RootState) => state.applications.loading);
    const error = useSelector((state: RootState) => state.applications.error);
    const actionMessage = useSelector((state: RootState) => state.applications.actionMessage);
    const [draftModal, setDraftModal] = useState<DraftModalState | null>(null);

    useEffect(() => {
        void dispatch(loadMyApplications(filters));
    }, [dispatch, filters]);

    useEffect(() => {
        if (!actionMessage) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            dispatch(clearApplicationFeedback());
        }, 3200);

        return () => window.clearTimeout(timeoutId);
    }, [actionMessage, dispatch]);

    const draftApplications = useMemo(
        () => applications.filter((application) => application.status === "draft"),
        [applications]
    );

    const submittedApplications = useMemo(
        () => applications.filter((application) => isSubmittedStatus(application.status)),
        [applications]
    );

    const categoryOptions = useMemo(
        () =>
            mergeOptionValues(
                [
                    ...applications.map((application) => application.category),
                    filters.category || "",
                ].filter(Boolean)
            ),
        [applications, filters.category]
    );

    const jobTypeOptions = useMemo(
        () =>
            mergeOptionValues(
                [
                    ...applications.map((application) => application.job_type),
                    filters.job_type || "",
                ].filter(Boolean)
            ),
        [applications, filters.job_type]
    );

    const workModeOptions = useMemo(
        () =>
            mergeWorkModeValues(
                [
                    ...applications.map((application) => application.work_mode),
                    filters.work_mode || "",
                ].filter(Boolean)
            ),
        [applications, filters.work_mode]
    );

    const openDraftModal = (application: ApplicationRecord) => {
        dispatch(clearApplicationFeedback());
        setDraftModal({
            application,
            cvLink: application.cv_link,
            coverLetterFile: null,
            error: "",
            success: "",
            loading: false,
        });
    };

    const closeDraftModal = () => {
        setDraftModal(null);
    };

    const handleDraftFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] ?? null;

        setDraftModal((current) =>
            current
                ? {
                    ...current,
                    coverLetterFile: nextFile,
                    error: "",
                    success: "",
                }
                : current
        );
    };

    const handleUpdateDraft = async () => {
        if (!draftModal) {
            return;
        }

        const trimmedCvLink = draftModal.cvLink.trim();
        const cvLinkChanged = trimmedCvLink !== draftModal.application.cv_link;
        const hasNewFile = Boolean(draftModal.coverLetterFile);

        if (!trimmedCvLink && !hasNewFile) {
            setDraftModal((current) =>
                current
                    ? {
                        ...current,
                        error: "Add a CV link or choose a new cover letter file before updating.",
                    }
                    : current
            );
            return;
        }

        if (!cvLinkChanged && !hasNewFile) {
            setDraftModal((current) =>
                current
                    ? {
                        ...current,
                        error: "Change the CV link or replace the cover letter file before updating.",
                    }
                    : current
            );
            return;
        }

        const payload = new FormData();

        if (trimmedCvLink && cvLinkChanged) {
            payload.append("cv_link", trimmedCvLink);
        }

        if (hasNewFile && draftModal.coverLetterFile) {
            payload.append("cover_letter_file", draftModal.coverLetterFile);
        }

        setDraftModal((current) =>
            current
                ? {
                    ...current,
                    loading: true,
                    error: "",
                    success: "",
                }
                : current
        );

        try {
            const result = await dispatch(
                updateDraft({
                    applicationUid: draftModal.application.uid,
                    formData: payload,
                })
            ).unwrap();
            await dispatch(loadMyApplications(filters)).unwrap();
            setDraftModal((current) =>
                current
                    ? {
                        ...current,
                        loading: false,
                        success: result.message,
                        error: "",
                        coverLetterFile: null,
                        application: {
                            ...current.application,
                            cv_link: trimmedCvLink || current.application.cv_link,
                        },
                    }
                    : current
            );
        } catch (updateError) {
            setDraftModal((current) =>
                current
                    ? {
                        ...current,
                        loading: false,
                        error:
                            updateError instanceof Error
                                ? updateError.message
                                : "Failed to update draft.",
                    }
                    : current
            );
        }
    };

    const handleSubmitDraft = async () => {
        if (!draftModal) {
            return;
        }

        const trimmedCvLink = draftModal.cvLink.trim();

        if (!trimmedCvLink) {
            setDraftModal((current) =>
                current
                    ? {
                        ...current,
                        error: "A CV link is required before submission.",
                    }
                    : current
            );
            return;
        }

        const payload = new FormData();
        payload.append("cv_link", trimmedCvLink);

        if (draftModal.coverLetterFile) {
            payload.append("cover_letter_file", draftModal.coverLetterFile);
        }

        setDraftModal((current) =>
            current
                ? {
                    ...current,
                    loading: true,
                    error: "",
                    success: "",
                }
                : current
        );

        try {
            const result = await dispatch(
                submitDraft({
                    applicationUid: draftModal.application.uid,
                    formData: payload,
                })
            ).unwrap();
            await dispatch(loadMyApplications(filters)).unwrap();
            setDraftModal((current) =>
                current
                    ? {
                        ...current,
                        loading: false,
                        success: result.message,
                        error: "",
                    }
                    : current
            );
            closeDraftModal();
        } catch (submitError) {
            setDraftModal((current) =>
                current
                    ? {
                        ...current,
                        loading: false,
                        error:
                            submitError instanceof Error
                                ? submitError.message
                                : "Failed to submit draft.",
                    }
                    : current
            );
        }
    };

    return (
        <div className="jobs-page jobs-applications-page">
            <UserTaskbar currentPath="applications" />

            <header className="jobs-topbar jobs-topbar-detail">
                <div className="jobs-brand">
                    <div>
                        <strong>My Applications</strong>
                    </div>
                </div>

                <button type="button" className="jobs-taskbar-link" onClick={() => navigate("/")}>
                    Browse jobs
                </button>
            </header>

            <section className="my-applications-shell">
                <div className="my-applications-toolbar">
                    <div className="my-application-section-header">
                        <div>
                            <h2>Filter applications</h2>
                        </div>
                        <button
                            type="button"
                            className="jobs-clear-button"
                            onClick={() => dispatch(clearApplicationFilters())}
                        >
                            Clear all
                        </button>
                    </div>

                    <div className="my-applications-filter-grid">
                        <label className="job-application-field">
                            <span>Job title</span>
                            <input
                                type="text"
                                value={filters.title || ""}
                                placeholder="Search by role title"
                                onChange={(event) =>
                                    dispatch(
                                        setApplicationFilters({
                                            ...filters,
                                            title: event.target.value,
                                        })
                                    )
                                }
                            />
                        </label>

                        <label className="job-application-field">
                            <span>Status</span>
                            <select
                                value={filters.status || ""}
                                onChange={(event) =>
                                    dispatch(
                                        setApplicationFilters({
                                            ...filters,
                                            status: event.target.value,
                                        })
                                    )
                                }
                            >
                                <option value="">All statuses</option>
                                <option value="draft">Draft</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                                <option value="shortlisted">Shortlisted</option>
                            </select>
                        </label>

                        <label className="job-application-field">
                            <span>Category</span>
                            <select
                                value={filters.category || ""}
                                onChange={(event) =>
                                    dispatch(
                                        setApplicationFilters({
                                            ...filters,
                                            category: event.target.value,
                                        })
                                    )
                                }
                            >
                                <option value="">All categories</option>
                                {categoryOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="job-application-field">
                            <span>Job type</span>
                            <select
                                value={filters.job_type || ""}
                                onChange={(event) =>
                                    dispatch(
                                        setApplicationFilters({
                                            ...filters,
                                            job_type: event.target.value,
                                        })
                                    )
                                }
                            >
                                <option value="">All job types</option>
                                {jobTypeOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="job-application-field">
                            <span>Work mode</span>
                            <select
                                value={filters.work_mode || ""}
                                onChange={(event) =>
                                    dispatch(
                                        setApplicationFilters({
                                            ...filters,
                                            work_mode: event.target.value,
                                        })
                                    )
                                }
                            >
                                <option value="">All work modes</option>
                                {workModeOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {formatWorkModeLabel(option)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                {error ? <div className="jobs-error">{error}</div> : null}
                {actionMessage ? <p className="job-application-success">{actionMessage}</p> : null}

                {loading ? (
                    <div className="jobs-empty-state">Loading your applications...</div>
                ) : (
                    <>
                        <section className="my-application-section">
                            <div className="my-application-section-header">
                                <div>
                                    <h2>Drafts</h2>
                                </div>
                                <span className="my-application-section-count">{draftApplications.length}</span>
                            </div>

                            {draftApplications.length === 0 ? (
                                <div className="jobs-empty-state">
                                    You do not have any draft applications right now.
                                </div>
                            ) : (
                                <div className="my-applications-grid">
                                    {draftApplications.map((application) => (
                                        <article key={application.uid} className="my-application-card">
                                            <div className="my-application-header">
                                                <div>
                                                    <span className="job-card-company">{application.company}</span>
                                                    <h2>{application.title}</h2>
                                                </div>
                                                <span className={`my-application-status is-${application.status}`}>
                                                    {application.status}
                                                </span>
                                            </div>

                                            <div className="job-card-meta">
                                                <span>{application.location}</span>
                                                <span>{application.category}</span>
                                                <span>{application.job_type}</span>
                                                <span>{application.work_mode}</span>
                                            </div>

                                            <p className="job-card-description">
                                                {application.description.length > 180
                                                    ? `${application.description.slice(0, 180)}...`
                                                    : application.description}
                                            </p>

                                            <div className="my-application-footer">
                                                <div>
                                                    <span>Current CV link</span>
                                                    <a
                                                        href={application.cv_link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="jobs-inline-link"
                                                    >
                                                        {application.cv_link}
                                                    </a>
                                                </div>

                                                <div className="my-application-actions">
                                                    <button
                                                        type="button"
                                                        className="jobs-secondary-button"
                                                        onClick={() => openDraftModal(application)}
                                                    >
                                                        Update
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="jobs-taskbar-link"
                                                        onClick={() => navigate(`/jobs/${application.job_uid}`)}
                                                    >
                                                        View role
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="my-application-section">
                            <div className="my-application-section-header">
                                <div>
                                    <h2>Submitted</h2>
                                </div>
                                <span className="my-application-section-count">{submittedApplications.length}</span>
                            </div>

                            {submittedApplications.length === 0 ? (
                                <div className="jobs-empty-state">
                                    You have not submitted any applications yet.
                                </div>
                            ) : (
                                <div className="my-applications-grid">
                                    {submittedApplications.map((application) => (
                                        <article key={application.uid} className="my-application-card">
                                            <div className="my-application-header">
                                                <div>
                                                    <span className="job-card-company">{application.company}</span>
                                                    <h2>{application.title}</h2>
                                                </div>
                                                <span className={`my-application-status is-${application.status}`}>
                                                    {application.status}
                                                </span>
                                            </div>

                                            <div className="job-card-meta">
                                                <span>{application.location}</span>
                                                <span>{application.category}</span>
                                                <span>{application.job_type}</span>
                                                <span>{application.work_mode}</span>
                                            </div>

                                            <p className="job-card-description">
                                                {application.description.length > 180
                                                    ? `${application.description.slice(0, 180)}...`
                                                    : application.description}
                                            </p>

                                            <div className="my-application-footer">
                                                <div>
                                                    <span>Current CV link</span>
                                                    <a
                                                        href={application.cv_link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="jobs-inline-link"
                                                    >
                                                        {application.cv_link}
                                                    </a>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="jobs-secondary-button"
                                                    onClick={() => navigate(`/jobs/${application.job_uid}`)}
                                                >
                                                    View role
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </section>

            {draftModal ? (
                <div className="job-preview-backdrop my-application-modal-backdrop" onClick={closeDraftModal}>
                    <div
                        className="job-preview-panel my-application-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="my-application-modal-header">
                            <div>
                                <span className="job-card-company">{draftModal.application.company}</span>
                                <h2>Update draft</h2>
                                <p>{draftModal.application.title}</p>
                            </div>

                            <button
                                type="button"
                                className="jobs-profile-button my-application-modal-close"
                                onClick={closeDraftModal}
                            >
                                Close
                            </button>
                        </div>

                        <div className="job-card-meta">
                            <span>{draftModal.application.location}</span>
                            <span>{draftModal.application.category}</span>
                            <span>{draftModal.application.job_type}</span>
                            <span>{draftModal.application.work_mode}</span>
                        </div>

                        <label className="job-application-field">
                            <span>CV link</span>
                            <input
                                type="url"
                                value={draftModal.cvLink}
                                placeholder="https://your-cv-link.com"
                                onChange={(event) =>
                                    setDraftModal((current) =>
                                        current
                                            ? {
                                                ...current,
                                                cvLink: event.target.value,
                                                error: "",
                                                success: "",
                                            }
                                            : current
                                    )
                                }
                            />
                        </label>

                        <label className="job-application-field">
                            <span>Replace cover letter file</span>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleDraftFileChange}
                            />
                        </label>

                        <div className="my-application-modal-note">
                            <span>Current cover letter</span>
                            <a
                                href={draftModal.application.cover_letter_file_link}
                                target="_blank"
                                rel="noreferrer"
                                className="jobs-inline-link"
                            >
                                Open current file
                            </a>
                        </div>

                        {draftModal.coverLetterFile ? (
                            <p className="job-application-note">
                                Selected replacement: <strong>{draftModal.coverLetterFile.name}</strong>
                            </p>
                        ) : null}

                        {draftModal.error ? <p className="jobs-error">{draftModal.error}</p> : null}
                        {draftModal.success ? (
                            <p className="job-application-success">{draftModal.success}</p>
                        ) : null}

                        <div className="job-application-actions">
                            <button
                                type="button"
                                className="jobs-secondary-button job-application-draft"
                                onClick={handleUpdateDraft}
                                disabled={draftModal.loading}
                            >
                                {draftModal.loading ? "Saving..." : "Update draft"}
                            </button>

                            <button
                                type="button"
                                className="jobs-primary-button"
                                onClick={handleSubmitDraft}
                                disabled={draftModal.loading}
                            >
                                {draftModal.loading ? "Submitting..." : "Submit application"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default MyApplicationsPage;
