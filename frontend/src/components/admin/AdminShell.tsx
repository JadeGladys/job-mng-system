import { ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../features/authSlice";
import { AppDispatch, RootState } from "../../app/store";

export type AdminSection =
    | "dashboard"
    | "create-job"
    | "manage-listings"
    | "manage-users"
    | "manage-applications"
    | "settings";

type AdminShellProps = {
    currentSection: AdminSection;
    title: string;
    actionLabel?: string;
    onAction?: () => void;
    children: ReactNode;
};

type AdminNavItem = {
    key: AdminSection;
    label: string;
    enabled: boolean;
};

const navItems: AdminNavItem[] = [
    {
        key: "dashboard",
        label: "Dashboard",
        enabled: true,
    },
    {
        key: "create-job",
        label: "Create job post",
        enabled: true,
    },
    {
        key: "manage-listings",
        label: "Manage listings",
        enabled: true,
    },
    {
        key: "manage-users",
        label: "Manage users",
        enabled: true,
    },
    {
        key: "manage-applications",
        label: "Manage applications",
        enabled: true,
    },
    {
        key: "settings",
        label: "Settings",
        enabled: false,
    },
];

function AdminShell({
    currentSection,
    title,
    actionLabel,
    onAction,
    children,
}: AdminShellProps) {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const currentUser = useSelector((state: RootState) => state.auth.user);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/auth");
    };

    const navigateToSection = (section: AdminSection) => {
        if (section === "dashboard") {
            navigate("/admin");
            return;
        }

        if (section === "create-job") {
            navigate("/admin/jobs/create");
            return;
        }

        if (section === "manage-listings") {
            navigate("/admin/jobs/manage");
            return;
        }

        if (section === "manage-users") {
            navigate("/admin/users");
            return;
        }

        if (section === "manage-applications") {
            navigate("/admin/applications");
        }
    };

    return (
        <div className="admin-jobs-page">
            <aside className="admin-jobs-sidebar">
                <div className="admin-jobs-sidebar-top">
                    <div className="admin-jobs-brand">
                        <span className="admin-jobs-brand-mark" />
                        <div>
                            <strong>Job MNG System</strong>
                        </div>
                    </div>

                    <div className="admin-jobs-sidebar-section admin-jobs-sidebar-section-spaced">
                        <span className="admin-jobs-sidebar-label">Workspace</span>

                        {navItems.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className={`admin-jobs-nav-link ${currentSection === item.key ? "is-active" : ""}`}
                                onClick={() => {
                                    if (item.enabled) {
                                        navigateToSection(item.key);
                                    }
                                }}
                                disabled={!item.enabled}
                            >
                                <strong>{item.label}</strong>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="admin-jobs-sidebar-footer">
                    <div className="admin-jobs-user-chip">
                        <span className="admin-jobs-user-avatar">
                            {(currentUser?.name || "A").slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                            <strong>{currentUser?.name || "Admin user"}</strong>
                            <span>{currentUser?.email || "admin@jobmng.local"}</span>
                        </div>
                    </div>

                    <button type="button" className="admin-jobs-logout-button" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="admin-jobs-main">
                <header className="admin-jobs-header">
                    <div className="admin-jobs-header-copy">
                        <h1>{title}</h1>
                    </div>

                    <div className="admin-jobs-header-actions">
                        <div className="admin-jobs-header-user">
                            <strong>{currentUser?.name || "Admin"}</strong>
                        </div>

                        {actionLabel && onAction ? (
                            <button type="button" className="admin-jobs-ghost-button" onClick={onAction}>
                                {actionLabel}
                            </button>
                        ) : null}
                    </div>
                </header>

                {children}
            </main>
        </div>
    );
}

export default AdminShell;
