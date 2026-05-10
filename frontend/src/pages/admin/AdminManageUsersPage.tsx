import { ReactElement, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../app/store";
import AdminShell from "../../components/admin/AdminShell";
import { clearUserFilters, loadUsers, setUserFilters } from "../../features/usersSlice";
import { AdminUserRecord } from "../../services/authService";

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

function AdminManageUsersPage(): ReactElement {
    const dispatch = useDispatch<AppDispatch>();
    const users = useSelector((state: RootState) => state.users.items);
    const filters = useSelector((state: RootState) => state.users.filters);
    const loading = useSelector((state: RootState) => state.users.loading);
    const error = useSelector((state: RootState) => state.users.error);

    useEffect(() => {
        void dispatch(loadUsers(filters));
    }, [dispatch, filters]);

    const totalUsers = users.length;
    const adminCount = users.filter((user) => user.role === "admin").length;
    const regularUsersCount = users.filter((user) => user.role === "user").length;

    const stats = [
        {
            label: "Total users",
            value: totalUsers,
            detail: "All users currently returned by the active filters.",
        },
        {
            label: "Admins",
            value: adminCount,
            detail: "Users with elevated access to the admin workspace.",
        },
        {
            label: "Regular users",
            value: regularUsersCount,
            detail: "Applicants and non-admin accounts in the current view.",
        },
    ];

    const latestUsers = useMemo(
        () =>
            [...users]
                .sort((left, right) => {
                    const leftDate = new Date(left.created_at || 0).getTime();
                    const rightDate = new Date(right.created_at || 0).getTime();

                    return rightDate - leftDate;
                })
                .slice(0, 4),
        [users]
    );

    return (
        <AdminShell
            currentSection="manage-users"
            title="Manage Users"
            actionLabel="Clear filters"
            onAction={() => dispatch(clearUserFilters())}
        >
            {error ? (
                <section className="admin-jobs-feedback-row">
                    <div className="jobs-error">{error}</div>
                </section>
            ) : null}

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
                            <h2>Search and filter</h2>
                            <p>Keep the controls simple for now: name, email, and role.</p>
                        </div>
                    </div>

                    <div className="admin-jobs-form admin-jobs-user-filters">
                        <div className="admin-jobs-form-grid">
                            <label className="admin-jobs-field">
                                <span>Name</span>
                                <input
                                    type="text"
                                    value={filters.name || ""}
                                    placeholder="Search by full name"
                                    onChange={(event) =>
                                        dispatch(
                                            setUserFilters({
                                                ...filters,
                                                name: event.target.value,
                                            })
                                        )
                                    }
                                />
                            </label>

                            <label className="admin-jobs-field">
                                <span>Email</span>
                                <input
                                    type="text"
                                    value={filters.email || ""}
                                    placeholder="Search by email"
                                    onChange={(event) =>
                                        dispatch(
                                            setUserFilters({
                                                ...filters,
                                                email: event.target.value,
                                            })
                                        )
                                    }
                                />
                            </label>

                            <label className="admin-jobs-field">
                                <span>Role</span>
                                <select
                                    value={filters.role || ""}
                                    onChange={(event) =>
                                        dispatch(
                                            setUserFilters({
                                                ...filters,
                                                role: event.target.value,
                                            })
                                        )
                                    }
                                >
                                    <option value="">All roles</option>
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </article>

                <article className="admin-jobs-overview-card">
                    <div className="admin-jobs-section-header">
                        <div>
                            <h2>Recently joined</h2>
                            <p>A quick snapshot of the newest user records in the current view.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="jobs-empty-state">Loading recent users...</div>
                    ) : latestUsers.length === 0 ? (
                        <div className="jobs-empty-state">
                            No users match the current filters yet.
                        </div>
                    ) : (
                        <div className="admin-jobs-mini-list">
                            {latestUsers.map((user: AdminUserRecord) => (
                                <article key={user.uid} className="admin-jobs-mini-card">
                                    <div className="admin-jobs-mini-copy">
                                        <strong>{user.name}</strong>
                                        <span>
                                            {user.email} · Joined {formatDate(user.created_at)}
                                        </span>
                                    </div>
                                    <span className="admin-jobs-mini-pill">{user.role}</span>
                                </article>
                            ))}
                        </div>
                    )}
                </article>
            </section>

            <section className="admin-jobs-single-panel">
                <article className="admin-jobs-table-card">
                    <div className="admin-jobs-section-header">
                        <div>
                            <h2>Registered users</h2>
                            <p>Read-only user management for now. Update and delete actions will come later.</p>
                        </div>
                        <span className="admin-jobs-count-chip">{users.length} users</span>
                    </div>

                    {loading ? (
                        <div className="jobs-empty-state">Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="jobs-empty-state">
                            No users match the current filters.
                        </div>
                    ) : (
                        <div className="admin-jobs-table-wrap">
                            <table className="admin-jobs-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.uid}>
                                            <td>
                                                <div className="admin-jobs-role-cell">
                                                    <strong>{user.name}</strong>
                                                    <span>{user.uid}</span>
                                                </div>
                                            </td>
                                            <td>{user.email}</td>
                                            <td>{user.phone_number || "No phone number"}</td>
                                            <td>
                                                <span className="admin-jobs-mini-pill">{user.role}</span>
                                            </td>
                                            <td>{formatDate(user.created_at)}</td>
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

export default AdminManageUsersPage;
