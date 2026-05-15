import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../utils/api.js";

function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least 1 uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least 1 lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least 1 number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least 1 special character.";
  return "";
}

function useCountdown() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = window.setTimeout(() => setSeconds((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds];
}

function ForgotPasswordForm({ onBack }) {
  const [form, setForm] = useState({ confirmPassword: "", email: "", newPassword: "", otp: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [seconds, setSeconds] = useCountdown();
  const [otpVerified, setOtpVerified] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function sendOtp() {
    setError("");
    setMessage("");
    if (!form.email) {
      setError("Email is required.");
      return;
    }
    setLoading("send");
    try {
      const result = await apiRequest("/api/auth/send-otp", {
        body: JSON.stringify({ email: form.email }),
        method: "POST"
      });
      setMessage(result.message);
      setOtpVerified(false);
      setSeconds(60);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setLoading("");
    }
  }

  async function verifyOtp() {
    setError("");
    setMessage("");
    if (!form.email || !form.otp) {
      setError("Email and OTP are required.");
      return;
    }
    setLoading("verify");
    try {
      const result = await apiRequest("/api/auth/verify-otp", {
        body: JSON.stringify({ email: form.email, otp: form.otp }),
        method: "POST"
      });
      setOtpVerified(true);
      setMessage(result.message);
    } catch (verifyError) {
      setOtpVerified(false);
      setError(verifyError.message);
    } finally {
      setLoading("");
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.otp) {
      setError("OTP is required.");
      return;
    }
    if (!otpVerified) {
      setError("Please verify OTP before resetting password.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const passwordError = validatePassword(form.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setLoading("reset");
    try {
      const result = await apiRequest("/api/admin/auth/forgot-password/reset", {
        body: JSON.stringify({
          confirmPassword: form.confirmPassword,
          email: form.email,
          otp: form.otp,
          password: form.newPassword
        }),
        method: "POST"
      });
      setMessage(result.message);
      window.setTimeout(onBack, 1000);
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <form onSubmit={resetPassword} autoComplete="off" className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#1f1f1f] text-white">
        <LockKeyhole className="h-6 w-6" />
      </div>
      <h1 className="text-3xl font-black">Reset Password</h1>
      <p className="mt-3 text-sm leading-6 text-black/55">Enter the admin email, verify OTP, then set a new password.</p>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-bold">Registered email</span>
        <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
      </label>

      <button
        type="button"
        disabled={loading === "send" || seconds > 0}
        onClick={sendOtp}
        className="mt-4 rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white disabled:opacity-60"
      >
        {loading === "send" ? "Sending..." : seconds > 0 ? `Resend in ${seconds}s` : "Send OTP"}
      </button>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-bold">OTP</span>
        <input value={form.otp} maxLength="6" onChange={(event) => update("otp", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
      </label>
      <button
        type="button"
        disabled={loading === "verify" || !form.otp}
        onClick={verifyOtp}
        className="mt-3 rounded-xl border border-black/10 px-5 py-3 font-black text-black disabled:opacity-60"
      >
        {loading === "verify" ? "Verifying..." : otpVerified ? "OTP Verified" : "Verify OTP"}
      </button>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-bold">New password</span>
        <input type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
      </label>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-bold">Confirm password</span>
        <input type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
      </label>

      <button type="submit" disabled={loading === "reset"} className="mt-6 w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white disabled:opacity-60">
        {loading === "reset" ? "Resetting..." : "Reset Password"}
      </button>
      <button type="button" onClick={onBack} className="mt-3 w-full rounded-xl border border-black/10 px-5 py-3 font-black text-black">
        Back to login
      </button>
      {message && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
    </form>
  );
}

export function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onLogin({ email, password });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f4f1] px-5 pt-28 text-[#1f1f1f]">
      {forgotMode ? (
        <ForgotPasswordForm onBack={() => setForgotMode(false)} />
      ) : (
        <form onSubmit={handleSubmit} autoComplete="off" className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-xl">
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#1f1f1f] text-white">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-black/55">Secure access</p>
          <h1 className="mt-1 text-3xl font-black">Admin Login</h1>
          <p className="mt-3 text-sm leading-6 text-black/55">
            Use your admin email and password to manage products, collections, and storefront content.
          </p>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-bold">Email</span>
            <input type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold">Password</span>
            <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
          </label>

          <button type="submit" disabled={loading} className="mt-6 w-full rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white disabled:opacity-60">
            {loading ? "Checking..." : "Login Securely"}
          </button>
          <button type="button" onClick={() => setForgotMode(true)} className="mt-4 w-full text-sm font-black text-emerald-700">
            Forgot password?
          </button>
          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
        </form>
      )}
    </main>
  );
}
