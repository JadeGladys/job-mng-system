import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/authSlice";
import { AppDispatch, RootState } from "../app/store";

type UserTaskbarProps = {
    currentPath?: "home" | "applications" | "job";
};

const getInitials = (name?: string): string => {
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

function UserTaskbar({ currentPath = "home" }: UserTaskbarProps) {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const user = useSelector((state: RootState) => state.auth.user);
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    useEffect(() => {
        if (!menuOpen) {
            return undefined;
        }

        const handleOutsideClick = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [menuOpen]);

    const handleLogout = () => {
        dispatch(logout());
        setMenuOpen(false);
        navigate("/auth");
    };

    return (
        <div className="jobs-taskbar">
            <div className="jobs-taskbar-actions">
                <button
                    type="button"
                    className={`jobs-taskbar-link ${currentPath === "home" ? "is-active" : ""}`}
                    onClick={() => navigate("/")}
                >
                    Browse jobs
                </button>

                {isAuthenticated && user?.role === "user" ? (
                    <button
                        type="button"
                        className={`jobs-taskbar-link ${currentPath === "applications" ? "is-active" : ""}`}
                        onClick={() => navigate("/my-applications")}
                    >
                        My applications
                    </button>
                ) : null}

                {isAuthenticated && user ? (
                    <div className="jobs-profile-menu" ref={menuRef}>
                        <button
                            type="button"
                            className="jobs-profile-button"
                            onClick={() => setMenuOpen((open) => !open)}
                        >
                            <span className="jobs-profile-avatar">{getInitials(user.name)}</span>
                            <span className="jobs-profile-name">{user.name}</span>
                        </button>

                        {menuOpen ? (
                            <div className="jobs-profile-dropdown">
                                {user.role === "admin" ? (
                                    <button
                                        type="button"
                                        className="jobs-profile-dropdown-link"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            navigate("/admin");
                                        }}
                                    >
                                        Admin dashboard
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="jobs-profile-dropdown-link"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            navigate("/my-applications");
                                        }}
                                    >
                                        My applications
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="jobs-profile-dropdown-link is-danger"
                                    onClick={handleLogout}
                                >
                                    Sign out
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <button
                        type="button"
                        className="jobs-taskbar-link"
                        onClick={() => navigate("/auth")}
                    >
                        Sign in
                    </button>
                )}
            </div>
        </div>
    );
}

export default UserTaskbar;
