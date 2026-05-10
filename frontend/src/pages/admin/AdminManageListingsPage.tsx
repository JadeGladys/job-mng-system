import { ReactElement, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { AppDispatch, RootState } from "../../app/store";
import AdminShell from "../../components/admin/AdminShell";
import { getJobs, Job } from "../../features/jobsSlice";
import { deleteJob } from "../../services/jobService";

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

function AdminManageListingsPage(): ReactElement {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const jobs = useSelector((state: RootState) => state.jobs.items);
    const loading = useSelector((state: RootState) => state.jobs.loading);
    const jobsError = useSelector((state: RootState) => state.jobs.error);
    const [actionError, setActionError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const loadJobs = async () => {
        setActionError("");
        await dispatch(getJobs({}));
    };

    useEffect(() => {
        void loadJobs();
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

    useEffect(() => {
        const routedMessage = location.state?.successMessage;

        if (!routedMessage) {
            return;
        }

        setSuccessMessage(routedMessage);
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, location.state, navigate]);

    useEffect(() => {
        const routedMessage = location.state?.successMessage;

        if (!routedMessage) {
            return;
        }

        setSuccessMessage(routedMessage);
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, location.state, navigate]);

    const handleDelete = async (job: Job) => {
        const confirmed = window.confirm(`Delete "${job.title}" from ${job.company}?`);

        if (!confirmed) {
            return;
        }

        setActionError("");
        setSuccessMessage("");

        try {
            await deleteJob(job.uid);
            setSuccessMessage("Job deleted successfully.");
            await dispatch(getJobs({}));
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "Failed to delete job.");
        }
    };

    const error = actionError || jobsError;

    return (
        <AdminShell
            currentSection="manage-listings"
            title="Manage Listings"
            actionLabel="Refresh jobs"
            onAction={() => {
                void loadJobs();
            }}
        >
            {(error || successMessage) && (
                <section className="admin-jobs-feedback-row">
                    {error ? <div className="jobs-error">{error}</div> : null}
                    {successMessage ? <div className="admin-jobs-success">{successMessage}</div> : null}
                </section>
            )}

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
                                                        onClick={() => navigate(`/admin/jobs/create?edit=${job.uid}`)}
                                                    >
                                                        Open editor
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
        </AdminShell>
    );
}

export default AdminManageListingsPage;
