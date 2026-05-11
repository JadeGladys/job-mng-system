import { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  message: string;
  error: string;
  footerText: string;
  footerActionLabel: string;
  onFooterAction: () => void;
};

function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  message,
  error,
  footerText,
  footerActionLabel,
  onFooterAction,
}: AuthShellProps) {
  return (
    <div className="auth-page">
      <section className="auth-panel auth-panel-form">
        <div className="auth-card">
          <span className="auth-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>

          <div className="auth-form-content">{children}</div>

          {message ? <p className="auth-feedback auth-feedback-success">{message}</p> : null}
          {error ? <p className="auth-feedback auth-feedback-error">{error}</p> : null}

          <p className="auth-footer">
            {footerText}{" "}
            <button type="button" className="auth-link-button" onClick={onFooterAction}>
              {footerActionLabel}
            </button>
          </p>
        </div>
      </section>

      <aside className="auth-panel auth-panel-visual">
        <div className="auth-visual-art">
          <div className="auth-orb auth-orb-large" />
          <div className="auth-orb auth-orb-small" />
        </div>
      </aside>
    </div>
  );
}

export default AuthShell;
