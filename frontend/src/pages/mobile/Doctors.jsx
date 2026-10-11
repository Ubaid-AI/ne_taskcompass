import { useMemo, useState } from "react";
import { Search, Info, X } from "lucide-react";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import DoctorProfile from "../../components/shared/DoctorProfile.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { salesperson, PERSON_TYPES } from "../../data/neData.js";

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY = DAY_ORDER[(new Date().getDay() + 6) % 7];

const TYPE_TONE = {
  HOD: "bg-brand-50 text-brand-700",
  Professor: "bg-success-bg text-success-fg",
  "OT Incharge": "bg-amber-50 text-amber-700",
  Unclassified: "bg-slate-100 text-slate-500",
};

export default function MobileDoctors() {
  const toast = useToast();
  const { mobileUser } = useSession();
  const me = mobileUser || salesperson;
  const { doctorsForRep, repHasOwnDoctors, schedulesFor, requestDoctorEdit } = useData();

  const mine = doctorsForRep(me.name);
  const ownsAny = repHasOwnDoctors(me.name);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [viewing, setViewing] = useState(null);
  const [suggesting, setSuggesting] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine.filter((d) => {
      if (filter === "Today") {
        return schedulesFor(d.id).some((g) => g.slots.some((s) => s.day === TODAY));
      }
      if (filter !== "All" && d.personType !== filter) return false;
      return (
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.hospital || "").toLowerCase().includes(q) ||
        (d.specialty || "").toLowerCase().includes(q)
      );
    });
  }, [mine, query, filter, schedulesFor]);

  function startSuggest(d) {
    setViewing(null);
    setSuggesting(d);
    setForm({
      name: d.name || "", personType: d.personType || "Unclassified",
      personTypeOther: d.personTypeOther || "",
      specialty: d.specialty || "", phone: d.phone || "", whatsapp: d.whatsapp || "",
      designation: d.designation || "", notes: d.notes || "", reason: "",
    });
  }

  async function send() {
    if (form.personType === "Other" && !(form.personTypeOther || "").trim()) {
      return toast("Describe the person type.");
    }
    setBusy(true);
    const { reason, ...patch } = form;
    const res = await requestDoctorEdit(suggesting.id, patch, {
      by: me.name, byId: me.id, reason,
    });
    setBusy(false);
    if (!res.ok) return toast(res.error);
    toast("Sent to the office for approval.");
    setSuggesting(null);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <MobileHeader title="My Doctors" />

      {/* Search and filters */}
      <div className="px-4 pt-3 pb-2 shrink-0 border-b border-slate-100">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctor, hospital or specialty"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 -mx-1 px-1">
          {["All", "Today", ...PERSON_TYPES].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold border whitespace-nowrap transition ${
                filter === t
                  ? "bg-slate-800 border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {t === "Today" ? `Available today (${TODAY})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
        {!ownsAny && mine.length > 0 && (
          <div className="flex gap-2 text-[11.5px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 leading-relaxed">
            <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
            <span>
              No doctors are assigned to you yet, so you are seeing the shared pool for now. Once the
              office assigns your territory, this list becomes just yours.
            </span>
          </div>
        )}

        <div className="text-[11.5px] text-slate-400 px-0.5">
          {visible.length} of {mine.length} doctor{mine.length === 1 ? "" : "s"} · tap one for full OPD timings
        </div>

        {visible.map((d) => {
          const groups = schedulesFor(d.id);
          const today = groups.flatMap((g) => g.slots.filter((s) => s.day === TODAY).map((s) => ({ ...s, hospital: g.hospital })));
          const sessions = groups.reduce((n, g) => n + g.slots.length, 0);
          return (
            <Card key={d.id} padding="p-3" className="active:scale-[0.99] transition cursor-pointer"
              onClick={() => setViewing(d)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-slate-800 truncate">{d.name}</div>
                  <div className="text-[11.5px] text-slate-500 truncate">
                    {d.specialty} · {d.hospital}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_TONE[d.personType] || TYPE_TONE.Unclassified}`}>
                  {d.personType || "Unclassified"}
                </span>
              </div>
              <div className="mt-2 text-[11.5px]">
                {today.length > 0 ? (
                  <span className="text-success-fg font-semibold">
                    Today {today[0].start} to {today[0].end}
                    {today.length > 1 ? ` and ${today.length - 1} more` : ""}
                  </span>
                ) : sessions > 0 ? (
                  <span className="text-slate-400">
                    {sessions} session{sessions === 1 ? "" : "s"} this week, none today
                  </span>
                ) : (
                  <span className="text-slate-400">No timings recorded</span>
                )}
              </div>
            </Card>
          );
        })}

        {visible.length === 0 && (
          <Card className="text-center text-slate-400 py-10 text-[13px]">
            {mine.length === 0
              ? "No doctors in your territory yet. Ask the office to assign some, or add one from the plan screen."
              : "Nothing matches that search."}
          </Card>
        )}
      </div>

      {/* Full profile */}
      {viewing && (
        <div className="absolute inset-0 z-40 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="font-bold text-slate-800 text-[14px]">Doctor profile</div>
            <button onClick={() => setViewing(null)} className="text-slate-400 p-1"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <DoctorProfile doctor={viewing} mode="field" onSuggest={startSuggest} />
          </div>
        </div>
      )}

      {/* Suggest a correction */}
      {suggesting && form && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="min-w-0">
              <div className="font-bold text-slate-800 text-[14px] truncate">Suggest a correction</div>
              <div className="text-[11.5px] text-slate-500 truncate">{suggesting.name}</div>
            </div>
            <button onClick={() => setSuggesting(null)} className="text-slate-400 p-1"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="text-[11.5px] text-slate-600 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 leading-relaxed">
              Change only what you know is wrong. The office reviews it before anything updates, so
              nothing here goes live straight away.
            </div>
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="Person type" options={PERSON_TYPES} value={form.personType}
              onChange={(e) => setForm({ ...form, personType: e.target.value })} />
            {form.personType === "Other" && (
              <Input label="Specify person type *" placeholder="e.g. Senior Registrar" value={form.personTypeOther || ""}
                onChange={(e) => setForm({ ...form, personTypeOther: e.target.value })} />
            )}
            <div className="text-[11px] text-slate-400 -mt-1.5 leading-relaxed">
              If you met them and know their real role, set it here. This is the fastest way to clear
              the unclassified records.
            </div>
            <Input label="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
            <Input label="Designation" placeholder="Consultant Neurosurgeon" value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <Input label="Notes for the team" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Input label="Why are you changing this?" placeholder="e.g. Confirmed with his secretary on 28 July"
              value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="p-4 border-t border-slate-100 shrink-0 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setSuggesting(null)}>Cancel</Button>
            <Button className="flex-1" onClick={send} disabled={busy}>
              {busy ? "Sending…" : "Send for approval"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
