import { MouseEvent, ReactElement, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../app/store";
import AdminShell from "../../components/admin/AdminShell";
import {
    clearAdminApplicationFeedback,
    clearAdminApplicationFilters,
    loadAdminApplications,
    setAdminApplicationFilters,
    updateAdminStatus,
} from "../../features/applicationsSlice";
import { ApplicationRecord } from "../../services/applicationService";
import {
    formatWorkModeLabel,
    mergeOptionValues,
    mergeWorkModeValues,
} from "../../utils/jobOptions";

const formatDate = (value?: string): string => {
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

const backendBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");

const resolveAssetUrl = (path: string): string => {
    if (!path || path.startsWith("http")) {
        return path;
    }

    return backendBaseUrl ? `${backendBaseUrl}${path}` : path;
};

const isSubmittedApplication = (application: ApplicationRecord): boolean =>
    application.status === "pending" ||
    application.status === "rejected" ||
    application.status === "shortlisted";

function AdminManageApplicationsPage(): ReactElement {
    const dispatch = useDispatch<AppDispatch>();
    const applications = useSelector((state: RootState) => state.applications.adminItems);
    const filters = useSelector((state: RootState) => state.applications.adminFilters);
    const loading = useSelector((state: RootState) => state.applications.adminLoading);
    const error = useSelector((state: RootState) => state.applications.adminError);
    const adminActionLoading = useSelector(
        (state: RootState) => state.applications.adminActionLoading
    );
    const adminActionError = useSelector(
        (state: RootState) => state.applications.adminActionError
    );
    const adminActionMessage = useSelector(
        (state: RootState) => state.applications.adminActionMessage
    );
    const [selectedApplicationUid, setSelectedApplicationUid] = useState<string | null>(null);
    const [statusTargetUid, setStatusTargetUid] = useState<string | null>(null);

    useEffect(() => {
        void dispatch(loadAdminApplications(filters));
    }, [dispatch, filters]);

    useEffect(() => {
        if (!adminActionMessage) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            dispatch(clearAdminApplicationFeedback());
        }, 3200);

        return () => window.clearTimeout(timeoutId);
    }, [adminActionMessage, dispatch]);

    const submittedApplications = useMemo(
        () => applications.filter((application) => isSubmittedApplication(application)),
        [applications]
    );

    const titleOptions = useMemo(
        () =>
            mergeOptionValues(
                [
                    ...submittedApplications.map((application) => application.title),
                    filters.title || "",
                ].filter(Boolean)
            ),
        [submittedApplications, filters.title]
    );

    const categoryOptions = useMemo(
        () =>
            mergeOptionValues(
                [
                    ...submittedApplications.map((application) => application.category),
                    filters.category || "",
                ].filter(Boolean)
            ),
        [submittedApplications, filters.category]
    );

    const workModeOptions = useMemo(
        () =>
            mergeWorkModeValues(
                [
                    ...submittedApplications.map((application) => application.work_mode),
                    filters.work_mode || "",
                ].filter(Boolean)
            ),
        [submittedApplications, filters.work_mode]
    );

    const selectedApplication = useMemo(
        () =>
            selectedApplicationUid
                ? submittedApplications.find(
                    (application) => application.uid === selectedApplicationUid
                ) || null
                : null,
        [selectedApplicationUid, submittedApplications]
    );

    const aiPanelApplication = selectedApplication;

    const handleStatusUpdate = async (
        event: MouseEvent<HTMLButtonElement>,
        applicationUid: string,
        status: "rejected" | "shortlisted"
    ) => {
        event.stopPropagation();
        setStatusTargetUid(applicationUid);

        try {
            await dispatch(updateAdminStatus({ applicationUid, status })).unwrap();
        } finally {
            setStatusTargetUid(null);
        }
    };

    return (
        <AdminShell
            currentSection="manage-applications"
            title="Manage Applications"
            actionLabel="Clear filters"
            onAction={() => dispatch(clearAdminApplicationFilters())}
        >
            {(error || adminActionError || adminActionMessage) && (
                <section className="admin-jobs-feedback-row">
                    {error ? <div className="jobs-error">{error}</div> : null}
                    {adminActionError ? <div className="jobs-error">{adminActionError}</div> : null}
                    {adminActionMessage ? (
                        <div className="admin-jobs-success">{adminActionMessage}</div>
                    ) : null}
                </section>
            )}

            <section className="admin-jobs-single-panel">
                <article className="admin-jobs-form-card admin-applications-filter-card">
                    <div className="admin-jobs-section-header">
                        <div>
                            <h2>Filter submitted applications</h2>
                        </div>
                        <span className="admin-jobs-count-chip">
                            {submittedApplications.length} submitted
                        </span>
                    </div>

                    <div className="admin-jobs-form admin-applications-filter-grid">
                        <label className="admin-jobs-field">
                            <span>Applicant</span>
                            <input
                                type="text"
                                value={filters.applicant_name || ""}
                                placeholder="Search by applicant name"
                                onChange={(event) =>
                                    dispatch(
                                        setAdminApplicationFilters({
                                            ...filters,
                                            applicant_name: event.target.value,
                                        })
                                    )
                                }
                            />
                        </label>

                        <label className="admin-jobs-field">
                            <span>Role</span>
                            <select
                                value={filters.title || ""}
                                onChange={(event) =>
                                    dispatch(
                                        setAdminApplicationFilters({
                                            ...filters,
                                            title: event.target.value,
                                        })
                                    )
                                }
                            >
                                <option value="">All roles</option>
                                {titleOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="admin-jobs-field">
                            <span>Status</span>
                            <select
                                value={filters.status || ""}
                                onChange={(event) =>
                                    dispatch(
                                        setAdminApplicationFilters({
                                            ...filters,
                                            status: event.target.value,
                                        })
                                    )
                                }
                            >
                                <option value="">All submitted statuses</option>
                                <option value="pending">Pending</option>
                                <option value="shortlisted">Shortlisted</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </label>

                        <label className="admin-jobs-field">
                            <span>Category</span>
                            <select
                                value={filters.category || ""}
                                onChange={(event) =>
                                    dispatch(
                                        setAdminApplicationFilters({
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

                        <label className="admin-jobs-field">
                            <span>Work mode</span>
                            <select
                                value={filters.work_mode || ""}
                                onChange={(event) =>
                                    dispatch(
                                        setAdminApplicationFilters({
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
                </article>
            </section>

            <section className="admin-applications-layout">
                <article className="admin-jobs-overview-card admin-applications-queue-card">
                    <div className="admin-jobs-section-header">
                        <div>
                            <h2>Submitted review queue</h2>
                        </div>
                    </div>

                    {loading ? (
                        <div className="jobs-empty-state">Loading submitted applications...</div>
                    ) : submittedApplications.length === 0 ? (
                        <div className="jobs-empty-state">
                            No submitted applications match the current filters yet.
                        </div>
                    ) : (
                        <div className="admin-applications-list">
                            {submittedApplications.map((application) => {
                                const isStatusUpdating =
                                    adminActionLoading && statusTargetUid === application.uid;

                                return (
                                    <article
                                        key={application.uid}
                                        className="admin-applications-card"
                                        onClick={() => setSelectedApplicationUid(application.uid)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                setSelectedApplicationUid(application.uid);
                                            }
                                        }}
                                    >
                                        <div className="admin-applications-card-header">
                                            <div>
                                                <span className="admin-applications-company">
                                                    {application.company}
                                                </span>
                                                <h3>{application.title}</h3>
                                            </div>
                                            <span
                                                className={`admin-application-status-pill is-${application.status}`}
                                            >
                                                {application.status}
                                            </span>
                                        </div>

                                        <div className="admin-applications-card-meta">
                                            <span>{application.applicant_name}</span>
                                            <span>{application.location}</span>
                                            <span>{application.category}</span>
                                            <span>{formatWorkModeLabel(application.work_mode)}</span>
                                        </div>

                                        <p className="admin-applications-card-copy">
                                            Submitted {formatDate(application.created_at)} · {application.applicant_email}
                                        </p>

                                        <div className="admin-jobs-row-actions">
                                            <button
                                                type="button"
                                                className="admin-jobs-inline-button is-success"
                                                onClick={(event) =>
                                                    void handleStatusUpdate(
                                                        event,
                                                        application.uid,
                                                        "shortlisted"
                                                    )
                                                }
                                                disabled={isStatusUpdating}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-jobs-inline-button is-danger"
                                                onClick={(event) =>
                                                    void handleStatusUpdate(
                                                        event,
                                                        application.uid,
                                                        "rejected"
                                                    )
                                                }
                                                disabled={isStatusUpdating}
                                            >
                                                Reject
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-jobs-inline-button is-info"
                                                onClick={(event) => event.stopPropagation()}
                                                disabled
                                                title="AI screening will be enabled in a later task."
                                            >
                                                AI screening
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </article>

                <article className="admin-jobs-overview-card admin-ai-panel-card">
                    <div className="admin-jobs-section-header">
                        <div>
                            <h2>AI screening window</h2>
                        </div>
                    </div>

                    {aiPanelApplication ? (
                        <div className="admin-ai-panel-content">
                            <div className="admin-ai-panel-header">
                                <div>
                                    <strong>{aiPanelApplication.applicant_name}</strong>
                                    <span>
                                        {aiPanelApplication.title} · {aiPanelApplication.company}
                                    </span>
                                </div>
                                <span
                                    className={`admin-application-status-pill is-${aiPanelApplication.status}`}
                                >
                                    {aiPanelApplication.status}
                                </span>
                            </div>

                            {aiPanelApplication.ai_summary ? (
                                <>
                                    <div className="admin-ai-score-card">
                                        <span>Screening score</span>
                                        <strong>{aiPanelApplication.ai_score || 0}/100</strong>
                                    </div>

                                    <div className="admin-ai-copy-block">
                                        <strong>Summary</strong>
                                        <p>{aiPanelApplication.ai_summary}</p>
                                    </div>

                                    <div className="admin-ai-copy-block">
                                        <strong>Recommendation</strong>
                                        <p>
                                            {aiPanelApplication.ai_recommendation ||
                                                "No recommendation has been stored yet."}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="jobs-empty-state">
                                    The AI screening workflow is reserved for a later task. This panel
                                    will show screening output here once that work is added.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="jobs-empty-state">
                            Pick an application from the review queue to preview where AI screening
                            results will appear.
                        </div>
                    )}
                </article>
            </section>

            {selectedApplication ? (
                <div
                    className="admin-application-modal-backdrop"
                    onClick={() => setSelectedApplicationUid(null)}
                >
                    <article
                        className="admin-application-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="admin-application-modal-header">
                            <div>
                                <span className="admin-applications-company">
                                    {selectedApplication.company}
                                </span>
                                <h2>{selectedApplication.title}</h2>
                                <p>
                                    {selectedApplication.location} · {selectedApplication.category} ·{" "}
                                    {formatWorkModeLabel(selectedApplication.work_mode)}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="admin-jobs-ghost-button"
                                onClick={() => setSelectedApplicationUid(null)}
                            >
                                Close
                            </button>
                        </div>

                        <div className="admin-application-modal-grid">
                            <section className="admin-application-modal-section">
                                <h3>Applicant information</h3>
                                <div className="admin-application-detail-list">
                                    <div>
                                        <span>Name</span>
                                        <strong>{selectedApplication.applicant_name}</strong>
                                    </div>
                                    <div>
                                        <span>Email</span>
                                        <strong>{selectedApplication.applicant_email}</strong>
                                    </div>
                                    <div>
                                        <span>Phone</span>
                                        <strong>
                                            {selectedApplication.applicant_phone_number || "No phone number"}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Status</span>
                                        <strong>{selectedApplication.status}</strong>
                                    </div>
                                </div>
                            </section>

                            <section className="admin-application-modal-section">
                                <h3>Submission files</h3>
                                <div className="admin-application-link-stack">
                                    <a
                                        href={selectedApplication.cv_link}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open CV link
                                    </a>
                                    <a
                                        href={resolveAssetUrl(selectedApplication.cover_letter_file_link)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open cover letter
                                    </a>
                                </div>
                            </section>

                            <section className="admin-application-modal-section admin-application-modal-section-wide">
                                <h3>Role context</h3>
                                <p>{selectedApplication.description}</p>
                            </section>

                            <section className="admin-application-modal-section admin-application-modal-section-wide">
                                <h3>Requirements</h3>
                                <p>{selectedApplication.requirements}</p>
                            </section>

                            <section className="admin-application-modal-section admin-application-modal-section-wide">
                                <h3>AI summary</h3>
                                {selectedApplication.ai_summary ? (
                                    <div className="admin-ai-copy-block">
                                        <strong>
                                            Score {selectedApplication.ai_score || 0}/100
                                        </strong>
                                        <p>{selectedApplication.ai_summary}</p>
                                        <p>{selectedApplication.ai_recommendation}</p>
                                    </div>
                                ) : (
                                    <p>No AI screening has been run for this application yet.</p>
                                )}
                            </section>
                        </div>
                    </article>
                </div>
            ) : null}
        </AdminShell>
    );
}

export default AdminManageApplicationsPage;
