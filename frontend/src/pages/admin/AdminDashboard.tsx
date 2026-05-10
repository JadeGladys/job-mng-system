import { ReactElement, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../app/store";
import AdminShell from "../../components/admin/AdminShell";
import AdminTrendChart from "../../components/admin/AdminTrendChart";
import { loadAdminApplications } from "../../features/applicationsSlice";
import { getJobs, Job } from "../../features/jobsSlice";

type TrendPoint = {
    label: string;
    count: number;
};

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

const buildMonthlyTrend = (values: Array<string | undefined>): TrendPoint[] => {
    const formatter = new Intl.DateTimeFormat("en", { month: "short" });
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

        return {
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
            label: formatter.format(date),
            count: 0,
        };
    });

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    values.forEach((value) => {
        if (!value) {
            return;
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return;
        }

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const bucket = bucketMap.get(key);

        if (bucket) {
            bucket.count += 1;
        }
    });

    return buckets;
};

function AdminDashboard(): ReactElement {
    const dispatch = useDispatch<AppDispatch>();
    const jobs = useSelector((state: RootState) => state.jobs.items);
    const jobsLoading = useSelector((state: RootState) => state.jobs.loading);
    const jobsError = useSelector((state: RootState) => state.jobs.error);
    const adminApplications = useSelector((state: RootState) => state.applications.adminItems);
    const applicationsLoading = useSelector((state: RootState) => state.applications.adminLoading);
    const applicationsError = useSelector((state: RootState) => state.applications.adminError);

    useEffect(() => {
        void dispatch(getJobs({}));
        void dispatch(loadAdminApplications({}));
    }, [dispatch]);

    const liveJobPosts = jobs.length;
    const applicationsReceived = adminApplications.length;
    const aiScreeningsCompleted = adminApplications.filter(
        (application) =>
            application.ai_score !== null ||
            application.ai_summary !== null ||
            application.ai_recommendation !== null
    ).length;

    const closingSoon = useMemo(
        () =>
            jobs.filter((job) => {
                if (!job.deadline) {
                    return false;
                }

                const deadline = new Date(job.deadline);
                const today = new Date();
                const daysUntilDeadline =
                    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

                return daysUntilDeadline >= 0 && daysUntilDeadline <= 30;
            }).length,
        [jobs]
    );

    const jobPostingTrend = useMemo(
        () => buildMonthlyTrend(jobs.map((job) => job.created_at)),
        [jobs]
    );

    const applicationTrend = useMemo(
        () => buildMonthlyTrend(adminApplications.map((application) => application.created_at)),
        [adminApplications]
    );

    const recentJobs = useMemo(
        () =>
            [...jobs]
                .sort((left, right) => {
                    const leftDate = new Date(left.created_at || 0).getTime();
                    const rightDate = new Date(right.created_at || 0).getTime();

                    return rightDate - leftDate;
                })
                .slice(0, 5),
        [jobs]
    );

    const dashboardStats = [
        {
            label: "Live job posts",
            value: liveJobPosts,
            detail: "Current active roles visible on the jobs board.",
        },
        {
            label: "Closing within 30 days",
            value: closingSoon,
            detail: "Roles whose deadlines are coming up soon.",
        },
        {
            label: "Applications received",
            value: applicationsReceived,
            detail: "All applications currently in the system.",
        },
        {
            label: "Job postings",
            value: liveJobPosts,
            detail: "Total postings available for charted activity below.",
        },
        {
            label: "AI screenings completed",
            value: aiScreeningsCompleted,
            detail: "Applications that already have AI review output.",
        },
    ];

    const dashboardError = jobsError || applicationsError;
    const dashboardLoading = jobsLoading || applicationsLoading;

    return (
        <AdminShell
            currentSection="dashboard"
            title="Dashboard"
            actionLabel="Refresh dashboard"
            onAction={() => {
                void dispatch(getJobs({}));
                void dispatch(loadAdminApplications({}));
            }}
        >
            {dashboardError ? (
                <section className="admin-jobs-feedback-row">
                    <div className="jobs-error">{dashboardError}</div>
                </section>
            ) : null}

            <section className="admin-jobs-overview-grid">
                <AdminTrendChart
                    title="Job postings"
                    value={liveJobPosts}
                    subtitle="Frequency of job posts created over the last six months."
                    data={jobPostingTrend}
                    tone="purple"
                />

                <AdminTrendChart
                    title="Applications received"
                    value={applicationsReceived}
                    subtitle="Frequency of applications arriving over the last six months."
                    data={applicationTrend}
                    tone="green"
                />
            </section>

            <section className="admin-jobs-stats-grid">
                {dashboardStats.map((item) => (
                    <article key={item.label} className="admin-jobs-stat-card">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <p>{item.detail}</p>
                    </article>
                ))}
            </section>

            <section className="admin-jobs-single-panel">
                <article className="admin-jobs-overview-card">
                    <div className="admin-jobs-section-header">
                        <div>
                            <h2>Recently published roles</h2>
                            <p>The newest job posts, sorted by their creation date.</p>
                        </div>
                    </div>

                    {dashboardLoading ? (
                        <div className="jobs-empty-state">Loading dashboard activity...</div>
                    ) : recentJobs.length === 0 ? (
                        <div className="jobs-empty-state">
                            No jobs have been published yet. Recent roles will appear here first.
                        </div>
                    ) : (
                        <div className="admin-jobs-mini-list">
                            {recentJobs.map((job: Job) => (
                                <article key={job.uid} className="admin-jobs-mini-card">
                                    <div className="admin-jobs-mini-copy">
                                        <strong>{job.title}</strong>
                                        <span>
                                            {job.company} · {job.location} · Published {formatDate(job.created_at)}
                                        </span>
                                    </div>
                                    <span className="admin-jobs-mini-pill">{job.job_type}</span>
                                </article>
                            ))}
                        </div>
                    )}
                </article>
            </section>
        </AdminShell>
    );
}

export default AdminDashboard;
