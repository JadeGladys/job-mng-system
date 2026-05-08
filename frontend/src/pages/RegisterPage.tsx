import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { RegisterUserData, registerUser } from "../services/authService";
import AuthShell from "../components/AuthShell";

type RegisterPageProps = {
    onSwitchMode: () => void;
};

function RegisterPage({ onSwitchMode }: RegisterPageProps) {
    const [formData, setFormData] = useState<RegisterUserData>({
        name: "",
        email: "",
        phone_number: "",
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
            const data = await registerUser(formData);
            setMessage(data.message);
            setFormData({
                name: "",
                email: "",
                phone_number: "",
                password: "",
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Get started"
            title="Create an account"
            message={message}
            error={error}
            footerText="Already have an account?"
            footerActionLabel="Sign in"
            onFooterAction={onSwitchMode}
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                    <span>Full name</span>
                    <input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                    />
                </label>

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
                    <span>Phone number</span>
                    <input
                        type="text"
                        name="phone_number"
                        placeholder="Enter your phone number"
                        value={formData.phone_number}
                        onChange={handleChange}
                    />
                </label>

                <label className="auth-field">
                    <span>Password</span>
                    <input
                        type="password"
                        name="password"
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={handleChange}
                    />
                </label>

                <button className="auth-submit-button" type="submit" disabled={loading}>
                    {loading ? "Creating account..." : "Create account"}
                </button>
            </form>
        </AuthShell>
    );
}

export default RegisterPage;
