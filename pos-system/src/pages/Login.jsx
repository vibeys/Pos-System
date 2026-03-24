import { useState } from "react";
import { Eye, EyeOff, Shield, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      alert("Please enter your username and password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select("username, password, role")
        .eq("username", cleanUsername)
        .eq("password", cleanPassword)
        .maybeSingle();

      if (error || !data) {
        alert("Invalid username or password.");
        return;
      }

      const role = String(data.role || "").toLowerCase();

      if (role === "cashier") {
        navigate("/cashier", { replace: true });
      } else if (role === "manager") {
        navigate("/manager", { replace: true });
      } else if (role === "owner") {
        navigate("/owner", { replace: true });
      } else {
        alert("Role not recognized.");
      }
    } catch (err) {
      console.error(err);
      alert("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="left">
          <div className="left-content">
            <p className="eyebrow">Restaurant POS System</p>
            <h1>Jaburat</h1>
            <p className="tagline">
              Built for your team to move faster and your business to run smarter.
            </p>

            <div className="trust">
              <div>
                <Lock size={15} />
                Secure staff login
              </div>
              <div>
                <Shield size={15} />
                Role-based access
              </div>
            </div>

            <p className="roles">For Cashier • Manager • Owner</p>
          </div>
        </div>

        <div className="right">
          <div className="form-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your LuxeDine system.</p>
          </div>

          <form onSubmit={handleLogin}>
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />

            <label>Password</label>
            <div className="password-box">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="footer-note">Authorized personnel only.</p>
        </div>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: Inter, "Segoe UI", sans-serif;
        }

        :root {
          --bg: #f5f2ee;
          --text: #141414;
          --muted: #6f6b66;
          --line: #e7e1da;
          --accent: #8b6b3f;
          --accent-dark: #6f532d;
          --soft: #faf7f2;
        }

        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            radial-gradient(circle at top left, rgba(139, 107, 63, 0.12), transparent 30%),
            radial-gradient(circle at bottom right, rgba(20, 20, 20, 0.08), transparent 28%),
            var(--bg);
        }

        .card {
          width: min(1100px, 100%);
          min-height: 620px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-radius: 30px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 30px 70px rgba(20, 20, 20, 0.14);
          transition: transform 0.35s ease, box-shadow 0.35s ease;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 36px 90px rgba(20, 20, 20, 0.18);
        }

        .left {
          position: relative;
          padding: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: #fff;
          background:
            linear-gradient(145deg, rgba(20, 20, 20, 0.92), rgba(45, 37, 28, 0.92)),
            url("https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80") center/cover;
          transition: transform 0.45s ease, filter 0.45s ease;
        }

        .card:hover .left {
          filter: brightness(1.03);
        }

        .left::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.28));
          transition: opacity 0.35s ease;
        }

        .left > * {
          position: relative;
          z-index: 1;
        }

        .left-content {
          transform: translateY(0);
          transition: transform 0.35s ease;
        }

        .card:hover .left-content {
          transform: translateY(-2px);
        }

        .eyebrow {
          display: inline-block;
          width: fit-content;
          margin-bottom: 16px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .left h1 {
          font-size: clamp(34px, 5vw, 54px);
          line-height: 1;
          letter-spacing: -0.04em;
          margin-bottom: 18px;
        }

        .tagline {
          max-width: 430px;
          font-size: 16px;
          line-height: 1.7;
          color: rgba(255,255,255,0.82);
        }

        .trust {
          margin-top: 24px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .trust div {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.9);
          font-size: 13px;
        }

        .roles {
          margin-top: 28px;
          font-size: 13px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
          font-weight: 500;
        }

        .right {
          padding: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: linear-gradient(180deg, #fff, #fcfaf8);
        }

        .form-header h2 {
          font-size: 32px;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 10px;
        }

        .form-header p {
          color: var(--muted);
          line-height: 1.6;
          margin-bottom: 28px;
        }

        label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #3d3a36;
          margin-bottom: 8px;
        }

        input {
          width: 100%;
          padding: 15px 16px;
          border-radius: 16px;
          border: 1px solid var(--line);
          background: var(--soft);
          font-size: 15px;
          outline: none;
          transition: 0.25s ease;
          color: var(--text);
          margin-bottom: 18px;
        }

        input::placeholder {
          color: #a39b92;
        }

        input:hover {
          border-color: rgba(139, 107, 63, 0.35);
          transform: translateY(-1px);
        }

        input:focus {
          border-color: rgba(139, 107, 63, 0.7);
          box-shadow: 0 0 0 4px rgba(139, 107, 63, 0.12);
          background: #fff;
          transform: translateY(-1px);
        }

        .password-box {
          position: relative;
        }

        .password-box input {
          padding-right: 48px;
        }

        .password-box button {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #8a837b;
          display: grid;
          place-items: center;
          padding: 4px;
          border-radius: 10px;
          transition: 0.2s ease;
        }

        .password-box button:hover {
          background: rgba(139, 107, 63, 0.08);
          color: var(--accent-dark);
        }

        .login-btn {
          width: 100%;
          margin-top: 6px;
          padding: 15px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent-dark));
          color: white;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(111, 83, 45, 0.25);
          transition: transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease, filter 0.22s ease;
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(111, 83, 45, 0.32);
          filter: brightness(1.03);
          opacity: 0.98;
        }

        .login-btn:active {
          transform: translateY(0);
          box-shadow: 0 10px 20px rgba(111, 83, 45, 0.22);
        }

        .login-btn:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }

        .footer-note {
          margin-top: 16px;
          text-align: center;
          font-size: 13px;
          color: #8a837b;
        }

        @media (max-width: 900px) {
          .card {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .left, .right {
            padding: 34px;
          }

          .left {
            min-height: 320px;
          }
        }

        @media (max-width: 560px) {
          .page {
            padding: 14px;
          }

          .card {
            border-radius: 22px;
          }

          .left, .right {
            padding: 26px 20px;
          }

          .form-header h2 {
            font-size: 28px;
          }

          .tagline {
            font-size: 15px;
          }

          .roles {
            letter-spacing: 0.12em;
          }
        }
      `}</style>
    </div>
  );
}