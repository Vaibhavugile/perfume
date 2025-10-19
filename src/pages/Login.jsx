// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/login.css";

/**
 * Login / Signup page
 * - mode: 'login' or 'signup'
 * - supports Google popup sign-in via useAuth().signInWithGoogle()
 * - redirects to `location.state.from` if present after successful auth
 */
export default function Login() {
  const { signInWithEmail, signInWithGoogle, signupWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state && location.state.from) || "/";

  const [mode, setMode] = useState("login"); // 'login' or 'signup'
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        if (!form.name.trim()) throw new Error("Please enter your name");
        await signupWithEmail(form.email.trim(), form.password, form.name.trim());
      } else {
        await signInWithEmail(form.email.trim(), form.password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page container">
      <div className="login-card">
        <div className="login-left">
          <div className="brand">
            <h2>{mode === "signup" ? "Create account" : "Welcome back"}</h2>
            <p className="muted">Sign in to continue — checkout faster and view orders.</p>
          </div>

          <button
            className="btn google"
            onClick={onGoogle}
            disabled={loading}
            aria-label="Continue with Google"
          >
            {/* inline Google SVG to avoid external asset */}
            <svg className="icon" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.5-34.2-4.3-50.5H272v95.6h147.1c-6.3 34-25.3 62.9-54 82.1v68.2h87.2c51-47 80.2-116.1 80.2-195.4z"/>
              <path fill="#34A853" d="M272 544.3c73.7 0 135.6-24.4 180.8-66.1l-87.2-68.2c-24.2 16.2-55.5 25.9-93.6 25.9-71.9 0-132.8-48.5-154.6-113.7H28.9v71.4C73.9 483.7 166 544.3 272 544.3z"/>
              <path fill="#FBBC05" d="M117.4 324.2c-10.8-32.7-10.8-67.9 0-100.6V152.2H28.9c-40.1 79.6-40.1 173.5 0 253.1l88.5-81.1z"/>
              <path fill="#EA4335" d="M272 109.9c39.9-.6 78.5 14.6 107.8 41.9l80.8-80.8C407 26.5 344.9 0 272 0 166 0 73.9 60.6 28.9 152.2l88.5 71.4C139.2 158.4 200.1 109.9 272 109.9z"/>
            </svg>

            <span>Continue with Google</span>
          </button>

          <div className="or">or</div>

          <form onSubmit={onSubmit} className="auth-form" noValidate>
            {mode === "signup" && (
              <label>
                <div className="label">Full name</div>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
            )}

            <label>
              <div className="label">Email</div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>

            <label>
              <div className="label">Password</div>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={6}
              />
            </label>

            {error && <div className="error" role="alert">{error}</div>}

            <div className="auth-actions">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setMode(mode === "signup" ? "login" : "signup");
                  setError("");
                }}
              >
                {mode === "signup" ? "Have an account? Sign in" : "Create account"}
              </button>
            </div>
          </form>

          <div className="small muted" style={{ marginTop: 10 }}>
            By continuing you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </div>
        </div>

        <div className="login-right">
          <div className="promo">
            <h3>Fast checkout & saved orders</h3>
            <p className="muted small">
              Create an account or sign in to save your details, track orders, and checkout faster.
            </p>

            <div className="chips" style={{ marginTop: 16 }}>
              <div className="chip">Secure login</div>
              <div className="chip">Google sign-in</div>
              <div className="chip">View orders</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
