import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import LogoMark from "../../components/ui/LogoMark.jsx";
import PhoneFrame from "../../components/mobile/PhoneFrame.jsx";
import { Input, Checkbox } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import UserPicker from "../../components/shared/UserPicker.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { DEMO_PASSCODE } from "../../data/team.js";

export default function MobileLogin() {
  const { users } = useData();
  const { setMobileUser } = useSession();
  const navigate = useNavigate();

  // The field app is for field staff. Managers use the portal.
  const team = useMemo(() => (users || []).filter((u) => u.kind !== "admin"), [users]);

  const [selected, setSelected] = useState(team[0] || null);
  const [email, setEmail] = useState(team[0]?.email || "");
  const [password, setPassword] = useState(DEMO_PASSCODE);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function pick(user) {
    setSelected(user);
    setEmail(user.email || "");
    setPassword(DEMO_PASSCODE);
    setError("");
  }

  function submit(e) {
    e.preventDefault();
    const match =
      team.find((u) => (u.email || "").toLowerCase() === email.trim().toLowerCase()) || selected;
    if (!match) {
      setError("Pick your name from the list below to sign in.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setMobileUser(match);
      navigate("/mobile/home");
    }, 400);
  }

  return (
    <PhoneFrame>
      <div className="flex-1 overflow-y-auto px-6 py-8 bg-gradient-to-b from-brand-900 via-brand-800 to-slate-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white grid place-items-center shadow-lg mb-3">
            <LogoMark size={44} variant="color" />
          </div>
          <div className="font-extrabold text-white text-xl">NE TaskCompass</div>
          <div className="text-[11px] text-brand-200 uppercase tracking-wide mt-1">Field Team App</div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-pop p-6 flex flex-col gap-4">
          <div className="text-center mb-1">
            <div className="font-bold text-[15px] text-slate-800">Welcome back</div>
            <div className="text-[12px] text-slate-500 mt-0.5">Neurosurgery Field Sales</div>
          </div>

          {selected && (
            <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2 text-[12px] text-brand-800">
              Signing in as <b>{selected.name}</b>
              {selected.region ? `, ${selected.region}` : ""}
            </div>
          )}

          <Input label="Email Address" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} type="email" />
          <Input label="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          {error && <div className="text-[12px] text-danger-fg bg-danger-bg rounded-lg px-3 py-2">{error}</div>}
          <Checkbox label="Keep me signed in" checked={remember} onChange={setRemember} />
          <Button type="submit" size="lg" className="w-full mt-1" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </Button>
        </form>

        <div className="mt-4 bg-white rounded-2xl shadow-sm p-4">
          <div className="text-[12px] font-bold text-slate-700 mb-1">Who are you?</div>
          <div className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Tap your name to fill the form. You will only see the doctors in your own territory, and
            only your own performance figures.
          </div>
          <UserPicker users={team} value={selected?.name} onPick={pick} />
          <div className="text-[10.5px] text-slate-400 mt-3 leading-relaxed border-t border-slate-100 pt-2.5">
            Demo sign in code is <code className="font-mono text-slate-600">{DEMO_PASSCODE}</code> for
            everyone. A real deployment gives each person their own password.
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
