import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API } from "./api";

const API_URL = API;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;


function validatePassword(password) {
  return passwordRegex.test(password);
}


export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Remove error while user is correcting input
    if (error) {
      setError("");
    }
  }


  function validateForm() {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name) {
      return "Please enter your name.";
    }

    if (name.length < 2) {
      return "Name must contain at least 2 characters.";
    }

    if (!email) {
      return "Please enter your email address.";
    }

    if (!emailRegex.test(email)) {
      return "Please enter a valid email address.";
    }

    if (!form.password) {
      return "Please enter a password.";
    }

    if (!validatePassword(form.password)) {
      return (
        "Password must be at least 8 characters and contain " +
        "an uppercase letter, lowercase letter, number, and special character."
      );
    }

    if (!form.confirmPassword) {
      return "Please confirm your password.";
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  }


  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });


      const data = await response.json().catch(() => ({}));


      if (!response.ok) {
        throw new Error(
          data.message || "Unable to create account."
        );
      }


      // Save login session
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));


      // New users must complete initial import first
      if (data.user?.hasCompletedInitialImport === false) {
        navigate("/import", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }

    } catch (err) {

      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the server. Make sure the StockWise backend is running on port 5000."
        );
      } else {
        setError(err.message);
      }

    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="register-page">

      <header className="register-header">

        <Link to="/login" className="register-brand">
          <strong>StockWise</strong> Next
        </Link>

        <p>
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>

      </header>


      <div className="register-divider" />


      <main className="register-layout">

        {/* LEFT SIDE */}

        <section className="register-copy">

          <p className="register-eyebrow">
            SMART INVENTORY MANAGEMENT
          </p>

          <h1>
            Start managing your{" "}
            <span>inventory smarter.</span>
          </h1>

          <p className="register-description">
            Create your StockWise account and take control of
            your stock, sales, products and inventory movement.
          </p>


          <div className="register-benefits">

            <div className="register-benefit">
              <div>✓</div>

              <p>
                <strong>Simple inventory management</strong>
                Keep your products and stock organized.
              </p>
            </div>


            <div className="register-benefit">
              <div>✓</div>

              <p>
                <strong>Track every stock movement</strong>
                Know what was added, sold or changed.
              </p>
            </div>


            <div className="register-benefit">
              <div>✓</div>

              <p>
                <strong>Make better business decisions</strong>
                Get a clear picture of your inventory.
              </p>
            </div>

          </div>

        </section>


        {/* REGISTER CARD */}

        <section className="register-card">

          <div className="register-logo">
            S
          </div>

          <p className="register-card-eyebrow">
            CREATE ACCOUNT
          </p>

          <h2>
            Join StockWise
          </h2>

          <p className="register-card-subtitle">
            Create your account to start managing your inventory.
          </p>


          {error && (
            <div className="register-error" role="alert">
              {error}
            </div>
          )}


          <form onSubmit={handleSubmit} noValidate>

            {/* NAME */}

            <label htmlFor="register-name">
              Full name
            </label>

            <input
              id="register-name"
              name="name"
              type="text"
              placeholder="Enter your name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              disabled={loading}
            />


            {/* EMAIL */}

            <label htmlFor="register-email">
              Email address
            </label>

            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={loading}
            />


            {/* PASSWORD */}

            <label htmlFor="register-password">
              Password
            </label>

            <div className="login-password-wrap">

              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
                className="login-input"
              />

              <button
                type="button"
                className="login-show-password"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>

            </div>


            <p className="register-password-note">
              8+ characters with uppercase, lowercase, number and special character.
            </p>


            {/* CONFIRM PASSWORD */}

            <label htmlFor="register-confirm-password">
              Confirm password
            </label>

            <div className="login-password-wrap">

              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Enter password again"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
                className="login-input"
              />

              <button
                type="button"
                className="login-show-password"
                onClick={() =>
                  setShowConfirmPassword(
                    (previous) => !previous
                  )
                }
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>

            </div>


            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

          </form>


          <p className="register-login">
            Already have an account?{" "}
            <Link to="/login">
              Sign in
            </Link>
          </p>

        </section>

      </main>

    </div>
  );
}