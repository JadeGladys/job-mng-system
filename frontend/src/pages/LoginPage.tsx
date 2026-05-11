import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { LoginCredentials, loginUser } from "../services/authService";
import AuthShell from "../components/AuthShell";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../features/authSlice";
import { AppDispatch } from "../app/store";

type LoginPageProps = {
    onSwitchMode: () => void;
};

function LoginPage({ onSwitchMode }: LoginPageProps) {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

    const [formData, setFormData] = useState<LoginCredentials>({
        email: "",
        password: "",
    });
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value,
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage("");
        setError("");
        setLoading(true);

        try {
            const data = await loginUser(formData);

            dispatch(
                setCredentials({
                    token: data.token,
                    user: data.user,
                })
            );

            setMessage(data.message);
            setFormData({
                email: "",
                password: "",
            });
            if (data.user.role === "admin") {
                navigate("/admin");
            } else {
                navigate("/");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Welcome back"
            title="Sign in"
            message={message}
            error={error}
            footerText="Don't have an account?"
            footerActionLabel="Create one"
            onFooterAction={onSwitchMode}
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                    <span>Email address</span>
                    <input
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                    />
                </label>

                <label className="auth-field">
                    <span>Password</span>
                    <input
                        type="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                    />
                </label>

                <button className="auth-submit-button" type="submit" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>
        </AuthShell>
    );
}

export default LoginPage;
