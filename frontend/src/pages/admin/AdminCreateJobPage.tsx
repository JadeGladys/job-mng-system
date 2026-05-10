import { ChangeEvent, FormEvent, ReactElement, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../app/store";
import AdminShell from "../../components/admin/AdminShell";
import { getJobs, Job } from "../../features/jobsSlice";
import { createJob, JobPayload, updateJob } from "../../services/jobService";
import {
    buildCategoryOptions,
    buildJobTypeOptions,
    buildWorkModeOptions,
    DEFAULT_CATEGORY_OPTIONS,
    DEFAULT_JOB_TYPE_OPTIONS,
    DEFAULT_WORK_MODE_OPTIONS,
    formatWorkModeLabel,
} from "../../utils/jobOptions";

const emptyForm = (): JobPayload => ({
    title: "",
    description: "",
    location: "",
    company: "",
    category: DEFAULT_CATEGORY_OPTIONS[0],
    job_type: DEFAULT_JOB_TYPE_OPTIONS[0],
    work_mode: DEFAULT_WORK_MODE_OPTIONS[1],
    requirements: "",
    deadline: "",
});

function AdminCreateJobPage(): ReactElement {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useDispatch<AppDispatch>();
    const jobs = useSelector((state: RootState) => state.jobs.items);
    const loading = useSelector((state: RootState) => state.jobs.loading);
    const jobsError = useSelector((state: RootState) => state.jobs.error);
    const [formData, setFormData] = useState<JobPayload>(emptyForm);
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        void dispatch(getJobs({}));
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

    const categoryOptions = useMemo(() => buildCategoryOptions(jobs), [jobs]);
    const jobTypeOptions = useMemo(() => buildJobTypeOptions(jobs), [jobs]);
    const workModeOptions = useMemo(() => buildWorkModeOptions(jobs), [jobs]);
    const editingUid = searchParams.get("edit");

    useEffect(() => {
        if (!editingUid) {
            setEditingJob(null);
            return;
        }

        const matchedJob = jobs.find((job) => job.uid === editingUid);

        if (!matchedJob) {
            return;
        }

        setEditingJob(matchedJob);
        setFormData({
            title: matchedJob.title ?? "",
            description: matchedJob.description ?? "",
            location: matchedJob.location ?? "",
            company: matchedJob.company ?? "",
            category: matchedJob.category ?? categoryOptions[0] ?? DEFAULT_CATEGORY_OPTIONS[0],
            job_type: matchedJob.job_type ?? jobTypeOptions[0] ?? DEFAULT_JOB_TYPE_OPTIONS[0],
            work_mode: matchedJob.work_mode ?? workModeOptions[0] ?? DEFAULT_WORK_MODE_OPTIONS[0],
            requirements: matchedJob.requirements ?? "",
            deadline: matchedJob.deadline ?? "",
        });
        setActionError("");
        setSuccessMessage("");
    }, [
        categoryOptions,
        editingUid,
        jobTypeOptions,
        jobs,
        workModeOptions,
    ]);

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
        setSearchParams({});
        setFormData({
            ...emptyForm(),
            category: categoryOptions[0] ?? DEFAULT_CATEGORY_OPTIONS[0],
            job_type: jobTypeOptions[0] ?? DEFAULT_JOB_TYPE_OPTIONS[0],
            work_mode: workModeOptions[0] ?? DEFAULT_WORK_MODE_OPTIONS[0],
        });
        setActionError("");
        setSuccessMessage("");
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
                navigate("/admin/jobs/manage", {
                    state: {
                        successMessage: "Job updated successfully.",
                    },
                });
                return;
            } else {
                await createJob(formData);
                setSuccessMessage("Job created successfully.");
            }

            resetForm();
            await dispatch(getJobs({}));
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "Failed to create job.");
        } finally {
            setSubmitting(false);
        }
    };

    const error = actionError || jobsError;

    return (
        <AdminShell
            currentSection="create-job"
            title={editingJob ? "Edit Job Post" : "Create Job Post"}
            actionLabel={editingJob ? "Cancel edit" : "Clear form"}
            onAction={resetForm}
        >
            {(error || successMessage) && (
                <section className="admin-jobs-feedback-row">
                    {error ? <div className="jobs-error">{error}</div> : null}
                    {successMessage ? <div className="admin-jobs-success">{successMessage}</div> : null}
                </section>
            )}

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
                        <span className="admin-jobs-count-chip">{jobs.length} existing jobs</span>
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
                                            {formatWorkModeLabel(option)}
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
                                {editingJob ? "Cancel edit" : "Reset form"}
                            </button>
                        </div>
                    </form>

                    {loading ? (
                        <div className="jobs-empty-state admin-jobs-inline-state">
                            Refreshing existing jobs for the latest options...
                        </div>
                    ) : null}
                </article>
            </section>
        </AdminShell>
    );
}

export default AdminCreateJobPage;
