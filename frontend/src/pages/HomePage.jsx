import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    clearFilters as clearJobFilters,
    clearSelectedJob,
    getJobs,
    setFilters,
    setSelectedJob,
} from "../features/jobsSlice";


const workModeOptions = ["Remote", "Hybrid", "Onsite"];
const jobTypeOptions = ["Full-time", "Part-time", "Internship", "Contract"];
const categoryOptions = ["IT", "Commerce", "Education", "Marketing", "Design"];

function HomePage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const storedFilters = useSelector((state) => state.jobs.filters);
    const jobs = useSelector((state) => state.jobs.items);
    const loading = useSelector((state) => state.jobs.loading);
    const error = useSelector((state) => state.jobs.error);
    const selectedJob = useSelector((state) => state.jobs.selectedJob);
    const [heroFilters, setHeroFilters] = useState(storedFilters);

    const signedInUser = useSelector((state) => state.auth.user);
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

    useEffect(() => {
        dispatch(getJobs(storedFilters));
    }, [dispatch, storedFilters]);

    useEffect(() => {
        setHeroFilters(storedFilters);
    }, [storedFilters]);

    const highlightedTags = useMemo(() => {
        return [
            storedFilters.job_type,
            storedFilters.category,
            storedFilters.work_mode,
            storedFilters.location,
            storedFilters.title ? `${storedFilters.title} roles` : "",
        ].filter(Boolean);
    }, [storedFilters]);

    const handleHeroChange = (event) => {
        const { name, value } = event.target;
        setHeroFilters((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleSearch = (event) => {
        event.preventDefault();
        dispatch(setFilters(heroFilters));
    };


    const applySingleFilter = (field, value) => {
        const nextFilters = {
            ...heroFilters,
            [field]: heroFilters[field] === value ? "" : value,
        };

        setHeroFilters(nextFilters);
        dispatch(setFilters(nextFilters));
    };


    const clearFilters = () => {
        const cleared = {
            title: "",
            location: "",
            category: "",
            job_type: "",
            work_mode: "",
        };

        setHeroFilters(cleared);
        dispatch(clearJobFilters());
        dispatch(clearSelectedJob());
    };


    const getInitials = (name) => {
        if (!name) {
            return "U";
        }

        return name
            .trim()
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("");
    };

    const handleJobSelection = (job) => {
        if (!signedInUser) {
            navigate("/auth");
            return;
        }

        dispatch(setSelectedJob(job));
    };


    return (
        <div className="jobs-page">
            <header className="jobs-topbar">
                <div className="jobs-brand">
                    <span className="jobs-brand-mark" />
                    <div>
                        <strong>Job MNG System</strong>
                        <span>Find roles built for how you work best.</span>
                    </div>
                </div>

                <nav className="jobs-nav">
                    {isAuthenticated && signedInUser ? (
                        <button
                            type="button"
                            className="jobs-profile-button"
                            onClick={() =>
                                navigate(signedInUser.role === "admin" ? "/admin" : "/dashboard")
                            }
                        >
                            <span className="jobs-profile-avatar">{getInitials(signedInUser.name)}</span>
                            <span className="jobs-profile-name">{signedInUser.name}</span>
                        </button>
                    ) : (
                        <button type="button" className="jobs-nav-link" onClick={() => navigate("/auth")}>
                            Sign in
                        </button>
                    )}
                </nav>
            </header>

            <section className="jobs-hero">
                <div className="jobs-hero-copy">
                    <span className="jobs-section-label">Curated opportunities</span>
                </div>

                <form className="jobs-searchbar" onSubmit={handleSearch}>
                    <input
                        type="text"
                        name="title"
                        placeholder="Search by role title"
                        value={heroFilters.title}
                        onChange={handleHeroChange}
                    />

                    <input
                        type="text"
                        name="location"
                        placeholder="Location"
                        value={heroFilters.location}
                        onChange={handleHeroChange}
                    />

                    <select name="category" value={heroFilters.category} onChange={handleHeroChange}>
                        <option value="">Any category</option>
                        {categoryOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>

                    <button type="submit" className="jobs-primary-button">
                        Search jobs
                    </button>
                </form>

                <div className="jobs-tags">
                    {(highlightedTags.length > 0 ? highlightedTags : ["Remote", "Full-time", "IT"]).map(
                        (tag) => (
                            <span key={tag} className="jobs-tag">
                                {tag}
                            </span>
                        )
                    )}
                </div>
            </section>

            <section className="jobs-content">
                <aside className="jobs-sidebar">
                    <div className="jobs-sidebar-header">
                        <h2>Filters</h2>
                        <button type="button" className="jobs-clear-button" onClick={clearFilters}>
                            Clear all
                        </button>
                    </div>

                    <div className="jobs-filter-group">
                        <h3>Work mode</h3>
                        {workModeOptions.map((option) => (
                            <label key={option} className="jobs-filter-option">
                                <input
                                    type="checkbox"
                                    checked={heroFilters.work_mode === option}
                                    onChange={() => applySingleFilter("work_mode", option)}
                                />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>

                    <div className="jobs-filter-group">
                        <h3>Job type</h3>
                        {jobTypeOptions.map((option) => (
                            <label key={option} className="jobs-filter-option">
                                <input
                                    type="checkbox"
                                    checked={heroFilters.job_type === option}
                                    onChange={() => applySingleFilter("job_type", option)}
                                />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>

                    <div className="jobs-filter-group">
                        <h3>Category</h3>
                        {categoryOptions.map((option) => (
                            <label key={option} className="jobs-filter-option">
                                <input
                                    type="checkbox"
                                    checked={heroFilters.category === option}
                                    onChange={() => applySingleFilter("category", option)}
                                />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>
                </aside>

                <div className="jobs-results">
                    <div className="jobs-results-header">
                        <div>
                            <h2>Available jobs</h2>
                            <p>{loading ? "Refreshing listings..." : `${jobs.length} roles available right now`}</p>
                        </div>
                        {!isAuthenticated && (
                            <button type="button" className="jobs-secondary-button" onClick={() => navigate("/auth")}>
                                Sign in
                            </button>
                        )}
                    </div>

                    {error ? <p className="jobs-error">{error}</p> : null}

                    {loading ? (
                        <div className="jobs-empty-state">Loading public job listings...</div>
                    ) : jobs.length === 0 ? (
                        <div className="jobs-empty-state">
                            No jobs matched your search yet. Try adjusting the filters above.
                        </div>
                    ) : (
                        <div className="jobs-list">
                            {jobs.map((job) => (
                                <article
                                    key={job.uid}
                                    className={`job-card ${signedInUser ? "job-card-clickable" : ""}`}
                                    onClick={() => handleJobSelection(job)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            handleJobSelection(job);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="job-card-header">
                                        <div>
                                            <span className="job-card-company">{job.company}</span>
                                            <h3>{job.title}</h3>
                                        </div>
                                        <span className="job-card-badge">{job.job_type}</span>
                                    </div>

                                    <div className="job-card-meta">
                                        <span>{job.location}</span>
                                        <span>{job.category}</span>
                                        <span>{job.work_mode}</span>
                                    </div>

                                    <p className="job-card-description">
                                        {job.description.length > 160
                                            ? `${job.description.slice(0, 160)}...`
                                            : job.description}
                                    </p>

                                    <div className="job-card-footer">
                                        <div className="job-card-pill-group">
                                            <span className="job-card-pill">
                                                {job.requirements.length > 72
                                                    ? `${job.requirements.slice(0, 72)}...`
                                                    : job.requirements}
                                            </span>
                                            <span className="job-card-pill">Deadline: {job.deadline}</span>
                                        </div>

                                        <span className="jobs-inline-link">
                                            {signedInUser ? "View full role" : "Sign in to view full role"}
                                        </span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {signedInUser && selectedJob ? (
                <div className="job-preview-backdrop" onClick={() => dispatch(clearSelectedJob())}>
                    <aside
                        className="job-preview-panel"
                        onClick={(event) => event.stopPropagation()}
                        aria-label="Selected job details"
                    >
                        <div className="job-preview-header">
                            <button
                                type="button"
                                className="job-preview-close"
                                onClick={() => dispatch(clearSelectedJob())}
                                aria-label="Close job details"
                            >
                                ×
                            </button>

                            <span className="job-card-company job-preview-company">{selectedJob.company}</span>
                        </div>

                        <h2>{selectedJob.title}</h2>

                        <div className="job-card-meta">
                            <span>{selectedJob.location}</span>
                            <span>{selectedJob.category}</span>
                            <span>{selectedJob.job_type}</span>
                            <span>{selectedJob.work_mode}</span>
                        </div>

                        <div className="job-preview-section">
                            <h3>Role overview</h3>
                            <p>{selectedJob.description}</p>
                        </div>

                        <div className="job-preview-section">
                            <h3>Requirements</h3>
                            <p>{selectedJob.requirements}</p>
                        </div>

                        <div className="job-preview-grid">
                            <div>
                                <span>Deadline</span>
                                <strong>{selectedJob.deadline}</strong>
                            </div>
                            <div>
                                <span>Work mode</span>
                                <strong>{selectedJob.work_mode}</strong>
                            </div>
                        </div>

                        <button type="button" className="jobs-primary-button job-preview-cta">
                            Apply
                        </button>
                    </aside>
                </div>
            ) : null}
        </div>
    );
}

export default HomePage;
