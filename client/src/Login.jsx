import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API } from "./api";

const API_URL = API;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  async function handleSubmit(event) {
    event.preventDefault();

    setError("");


    // -----------------------------
    // Email validation
    // -----------------------------

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }


    // -----------------------------
    // Password validation
    // -----------------------------

    if (!password) {
      setError("Please enter your password.");
      return;
    }


    setLoading(true);


    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });


      const data = await response.json().catch(() => ({}));


      // -----------------------------
      // Backend error
      // -----------------------------

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to login."
        );
      }


      // -----------------------------
      // Save authentication
      // -----------------------------

      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );


      // -----------------------------
      // Redirect
      // -----------------------------

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
    <div className="login-page">

      {/* HEADER */}

      <header className="login-header">

        <Link to="/login" className="login-brand">
          <strong>StockWise</strong> Next
        </Link>

        <p className="login-header-account">
          New to StockWise?{" "}
          <Link to="/register">
            Create account
          </Link>
        </p>

      </header>


      <div className="login-divider" />


      {/* CONTENT */}

      <main className="login-content">

        {/* LEFT SIDE */}

        <section className="login-copy">

          <p className="login-eyebrow">
            SMART INVENTORY MANAGEMENT
          </p>

          <h1>
            Your stock.{" "}
            <span>Your business.</span>{" "}
            Your next move.
          </h1>

          <p className="login-description">
            StockWise gives you a simpler way to manage
            inventory, track stock movement and make smarter
            business decisions.
          </p>


          <div className="login-benefits">

            <div className="login-benefit">

              <div className="benefit-check">
                ✓
              </div>

              <div>
                <strong>
                  Stay on top of your stock
                </strong>

                <p>
                  Know exactly what you have available.
                </p>
              </div>

            </div>


            <div className="login-benefit">

              <div className="benefit-check">
                ✓
              </div>

              <div>
                <strong>
                  Track every movement
                </strong>

                <p>
                  Follow sales, additions and inventory changes.
                </p>
              </div>

            </div>


            <div className="login-benefit">

              <div className="benefit-check">
                ✓
              </div>

              <div>
                <strong>
                  Make smarter decisions
                </strong>

                <p>
                  Use your inventory data to plan your next move.
                </p>
              </div>

            </div>

          </div>


          <p className="login-tagline">
            A simpler, smarter way to manage inventory.
          </p>

        </section>


        {/* LOGIN CARD */}

        <section className="login-card">

          <div className="login-logo">
            S
          </div>

          <p className="login-card-eyebrow">
            WELCOME BACK
          </p>

          <h2>
            Sign in to StockWise
          </h2>

          <p className="login-card-subtitle">
            Enter your account details to continue.
          </p>


          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}


          <form onSubmit={handleSubmit} noValidate>

            {/* EMAIL */}

            <label
              htmlFor="login-email"
              className="login-label"
            >
              Email address
            </label>

            <input
              id="login-email"
              className="login-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);

                if (error) {
                  setError("");
                }
              }}
              autoComplete="email"
              disabled={loading}
            />


            {/* PASSWORD */}

            <label
              htmlFor="login-password"
              className="login-label"
            >
              Password
            </label>

            <div className="login-password-wrap">

              <input
                id="login-password"
                className="login-input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);

                  if (error) {
                    setError("");
                  }
                }}
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="button"
                className="login-show-password"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous
                  )
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>


          <p className="login-secure">
            <span>✓</span>
            Your login is securely protected.
          </p>


          <div className="login-card-divider" />


          <p className="login-create">
            Don't have an account?{" "}
            <Link to="/register">
              Create one
            </Link>
          </p>

        </section>

      </main>

    </div>
  );
}