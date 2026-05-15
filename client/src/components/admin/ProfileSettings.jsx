import { KeyRound, Mail, Save, ShieldCheck, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../utils/api.js";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least 1 uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least 1 lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least 1 number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least 1 special character.";
  return "";
}

function CountdownButton({ children, disabled, loading, onClick, seconds, type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled || loading || seconds > 0}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
    >
      {loading ? "Please wait..." : seconds > 0 ? `Resend in ${seconds}s` : children}
    </button>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-xl font-black">{title}</h3>
          <button onClick={onClose} className="rounded-lg bg-black/10 p-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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

function ChangeEmailModal({ adminProfile, onClose, onCredentialChanged }) {
  const [form, setForm] = useState({ currentPassword: "", newEmail: "", otp: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [seconds, setSeconds] = useCountdown();

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function sendOtp() {
    setError("");
    setMessage("");
    if (!form.newEmail || form.newEmail === adminProfile?.email) {
      setError("Enter a different valid email.");
      return;
    }
    if (!form.currentPassword) {
      setError("Current password is required.");
      return;
    }
    setLoading("send");
    try {
      const result = await apiRequest("/api/admin/profile/change-email/send-otp", {
        body: JSON.stringify({ currentPassword: form.currentPassword, newEmail: form.newEmail }),
        method: "POST"
      });
      setMessage(result.message);
      setSeconds(60);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setLoading("");
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.otp) {
      setError("OTP is required.");
      return;
    }
    setLoading("verify");
    try {
      const result = await apiRequest("/api/admin/profile/change-email/verify", {
        body: JSON.stringify({ otp: form.otp }),
        method: "POST"
      });
      setMessage(result.message);
      window.setTimeout(onCredentialChanged, 900);
    } catch (verifyError) {
      setError(verifyError.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <Modal title="Change Admin ID / Email" onClose={onClose}>
      <form onSubmit={verifyOtp} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-bold">Current admin email</span>
          <input value={adminProfile?.email || ""} readOnly className="w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-3 text-black/60 outline-none" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">New admin email</span>
          <input type="email" value={form.newEmail} onChange={(event) => update("newEmail", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">Current password</span>
          <input type="password" value={form.currentPassword} onChange={(event) => update("currentPassword", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        </label>
        <CountdownButton loading={loading === "send"} onClick={sendOtp} seconds={seconds}>
          Send OTP
        </CountdownButton>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">OTP</span>
          <input value={form.otp} onChange={(event) => update("otp", event.target.value)} maxLength="6" className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        </label>
        <button disabled={loading === "verify"} className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white disabled:opacity-60">
          {loading === "verify" ? "Verifying..." : "Verify and change email"}
        </button>
        {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
      </form>
    </Modal>
  );
}

function ChangePasswordModal({ onClose, onCredentialChanged }) {
  const [form, setForm] = useState({ confirmPassword: "", currentPassword: "", newPassword: "", otp: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [seconds, setSeconds] = useCountdown();

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function sendOtp() {
    setError("");
    setMessage("");
    if (!form.currentPassword) {
      setError("Current password is required.");
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
    setLoading("send");
    try {
      const result = await apiRequest("/api/admin/profile/change-password/send-otp", {
        body: JSON.stringify({
          confirmPassword: form.confirmPassword,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        }),
        method: "POST"
      });
      setMessage(result.message);
      setSeconds(60);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setLoading("");
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.otp) {
      setError("OTP is required.");
      return;
    }
    setLoading("verify");
    try {
      const result = await apiRequest("/api/admin/profile/change-password/verify", {
        body: JSON.stringify({ otp: form.otp }),
        method: "POST"
      });
      setMessage(result.message);
      window.setTimeout(onCredentialChanged, 900);
    } catch (verifyError) {
      setError(verifyError.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <Modal title="Change Password" onClose={onClose}>
      <form onSubmit={verifyOtp} className="space-y-4">
        <input type="password" value={form.currentPassword} onChange={(event) => update("currentPassword", event.target.value)} placeholder="Current password" className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        <input type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} placeholder="New password" className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        <input type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} placeholder="Confirm new password" className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        <CountdownButton loading={loading === "send"} onClick={sendOtp} seconds={seconds}>
          Send OTP
        </CountdownButton>
        <input value={form.otp} onChange={(event) => update("otp", event.target.value)} maxLength="6" placeholder="OTP" className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        <button disabled={loading === "verify"} className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white disabled:opacity-60">
          {loading === "verify" ? "Verifying..." : "Verify and change password"}
        </button>
        {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
      </form>
    </Modal>
  );
}

export function ProfileSettings({ adminProfile, onCredentialChanged, onSaveProfile }) {
  const [form, setForm] = useState({ name: "", profileImage: "" });
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: adminProfile?.name || "Mota Bhai Admin",
      profileImage: adminProfile?.profileImage || ""
    });
  }, [adminProfile]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onSaveProfile(form);
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setForm((current) => ({ ...current, profileImage: dataUrl }));
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-[#1f1f1f] text-lg font-black text-white">
            {form.profileImage ? <img src={form.profileImage} alt={form.name} className="h-full w-full object-cover" /> : "MB"}
          </div>
          <div>
            <p className="text-sm font-bold text-black/55">Profile / Settings</p>
            <h2 className="text-2xl font-black">Admin Profile</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Admin name</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Admin email / login ID</span>
            <input value={adminProfile?.email || ""} readOnly className="w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-3 text-black/60 outline-none" />
          </label>
          <div>
            <span className="mb-2 block text-sm font-bold">Profile picture</span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white">
              <UserRound className="h-4 w-4" />
              Upload profile picture
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleProfileUpload} className="hidden" />
            </label>
            <span className="mt-2 block text-xs text-black/50">If empty, the admin avatar shows MB initials.</span>
          </div>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
        {message && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { id: "email", title: "Change Admin ID / Email", text: "Verify your password and OTP before changing the login email.", Icon: Mail },
          { id: "password", title: "Change Password", text: "Send OTP to the current admin email before saving a new password.", Icon: KeyRound },
          { id: "forgot", title: "Forgot Password / Reset Password", text: "Use the login page reset flow when you cannot sign in.", Icon: ShieldCheck }
        ].map(({ id, title, text, Icon }) => (
          <button key={id} onClick={() => id === "forgot" ? onCredentialChanged() : setModal(id)} className="rounded-2xl border border-black/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <Icon className="h-6 w-6 text-emerald-700" />
            <h3 className="mt-4 font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-black/55">{text}</p>
          </button>
        ))}
      </div>

      {modal === "email" && <ChangeEmailModal adminProfile={adminProfile} onClose={() => setModal("")} onCredentialChanged={onCredentialChanged} />}
      {modal === "password" && <ChangePasswordModal onClose={() => setModal("")} onCredentialChanged={onCredentialChanged} />}
    </section>
  );
}
