import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoMark from "../../components/ui/LogoMark.jsx";
import { Input } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import { useSession, shapeUser } from "../../context/SessionContext.jsx";
import { frappeLogin } from "../../lib/frappe.js";

export default function DashboardLogin() {
  const { setDashboardUser } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const me = await frappeLogin(email.trim(), password);
      const roles = me?.roles || [];
      const deskUser = roles.includes("System Manager") || me?.user === "Administrator";
      if (me?.portal_only || ((me?.is_manager || me?.is_admin) && !deskUser)) {
        setDashboardUser(shapeUser(me));
        navigate("/dashboard/home");
        return;
      }
      window.location.href = "/app";
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center shadow-lg mb-3">
            <LogoMark size={44} variant="color" />
          </div>
          <div className="text-white font-bold text-xl">NE LiveTrack</div>
          <div className="text-brand-200 text-[13px] mt-1">National Enterprises · Management portal</div>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl p-6 shadow-pop flex flex-col gap-3">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error ? <div className="text-[12.5px] text-danger-fg bg-danger-bg rounded-lg px-3 py-2">{error}</div> : null}
          <Button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
        </form>
      </div>
    </div>
  );
}
