import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, UserPlus, CheckCircle2, AlertCircle, Stethoscope, Search } from "lucide-react";
import PhoneFrame from "../../components/mobile/PhoneFrame.jsx";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import { Checkbox, Input, Textarea, Select } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { DAY_TYPES, PERSON_TYPES, HOSPITALS, salesperson } from "../../data/neData.js";

const emptyDoc = { name: "", personType: "Professor", personTypeOther: "", hospital: HOSPITALS[0].name, time: "", phone: "", email: "", discussion: "" };

const typeTone = {
  HOD: "bg-brand-600 text-white",
  Professor: "bg-info-solid text-white",
  "OT Incharge": "bg-slate-500 text-white",
};

export default function PlanBuilder() {
  const navigate = useNavigate();
  const toast = useToast();
  const { doctorsForRep, addDoctor } = useData();
  const { mobileUser } = useSession();
  const me = mobileUser || salesperson;

  // A rep only ever plans against the doctors assigned to them.
  const myDoctors = doctorsForRep(me.name);

  const [selected, setSelected] = useState([]);
  const [dayType, setDayType] = useState(DAY_TYPES[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyDoc);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const selectedDocs = myDoctors.filter((d) => selected.includes(d.id));
  const counts = {
    total: selectedDocs.length,
    hod: selectedDocs.filter((d) => d.personType === "HOD").length,
    prof: selectedDocs.filter((d) => d.personType === "Professor").length,
  };
  const isOtHalf = dayType === "OT Half Day";
  const otAdjusted = isOtHalf
    ? {
        valid: selectedDocs.length === 3,
        problems: selectedDocs.length === 3 ? [] : [`OT half day — select 3 people (currently ${selectedDocs.length}).`],
      }
    : {
        valid: selectedDocs.length > 0,
        problems: selectedDocs.length ? [] : ["Select at least one doctor."],
      };

  // Selected doctors always stay visible, so a filter change never hides a choice.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myDoctors.filter((d) =>
      selected.includes(d.id) ||
      ((filter === "All" || d.personType === filter) &&
       (!q || d.name.toLowerCase().includes(q) || (d.hospital || "").toLowerCase().includes(q)))
    );
  }, [myDoctors, filter, search, selected]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function saveCustomDoctor(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.hospital.trim()) return toast("Enter at least the doctor's name and hospital");
    if (form.personType === "Other" && !form.personTypeOther.trim()) return toast("Describe the person type");
    await addDoctor(
      {
        name: form.name.trim(), personType: form.personType, personTypeOther: form.personTypeOther, hospital: form.hospital,
        specialty: form.personType === "OT Incharge" ? "Operation Theatre" : "Neurosurgery",
        city: "Islamabad", phone: form.phone, email: form.email, discussion: form.discussion,
        rep: "Mr. Shoaib",
      },
      { fromMobile: true }
    );
    setForm(emptyDoc);
    setShowAdd(false);
    toast("Doctor submitted — visible after admin approval");
  }

  function savePlan() {
    if (!otAdjusted.valid) return toast(otAdjusted.problems[0]);
    toast(`Plan saved · ${dayType} · ${selectedDocs.length} visits`);
    navigate("/mobile/schedule");
  }

  return (
    <PhoneFrame>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <MobileHeader title="Morning Plan" back />
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div>
            <div className="text-[11px] font-bold text-brand-600 uppercase tracking-wide">Stage 1 · Morning Plan</div>
            <div className="text-lg font-bold text-slate-800">Build Today's Plan</div>
          </div>

          {/* Day type — OT full / half day (rule 6) */}
          <div>
            <div className="text-[12px] font-bold text-slate-500 mb-2">Day Type</div>
            <div className="grid grid-cols-3 gap-2">
              {DAY_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setDayType(t)}
                  className={`rounded-xl px-2 py-2 text-[11.5px] font-semibold border transition ${
                    dayType === t ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {dayType !== "Field Day" && (
              <div className="text-[11px] text-slate-500 mt-1.5">
                {dayType === "OT Full Day"
                  ? "Full day in OT with the surgeon — counts as a complete working day."
                  : "Half day in OT — only 3 field visits are required today."}
              </div>
            )}
          </div>

          {/* Rule tracker */}
          <div className={`rounded-2xl px-3.5 py-3 border ${otAdjusted.valid ? "bg-success-bg border-success-fg/20" : "bg-warning-bg border-warning-fg/20"}`}>
            <div className="flex items-center gap-2 text-[12.5px] font-bold mb-1.5">
              {otAdjusted.valid ? <CheckCircle2 size={15} className="text-success-fg" /> : <AlertCircle size={15} className="text-warning-fg" />}
              <span className={otAdjusted.valid ? "text-success-fg" : "text-warning-fg"}>
                {otAdjusted.valid ? "Plan meets the daily rule" : "Daily visit rule"}
              </span>
            </div>
            {isOtHalf ? (
              <div className="text-[11.5px] text-slate-600">OT half day — select 3 people. Selected: <b>{selectedDocs.length}/3</b></div>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-600">
                <span>Selected: <b>{counts.total}</b></span>
                <span>HOD: <b className={counts.hod >= 2 ? "text-success-fg" : ""}>{counts.hod}/2 min</b></span>
                <span>Professor: <b className={counts.prof >= 2 ? "text-success-fg" : ""}>{counts.prof}/2 min</b></span>
              </div>
            )}
          </div>

          {/* Type filter */}
          <div className="flex gap-1.5 overflow-x-auto">
            {["All", ...PERSON_TYPES].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap border transition ${
                  filter === t ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search across my assigned doctors */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search my ${myDoctors.length} doctors`}
              className="w-full outline-none text-[13px] text-slate-700 bg-transparent"
            />
          </div>

          {/* Doctor list */}
          <div className="text-[11px] text-slate-400 -mb-1">
            Showing {visible.length} of {myDoctors.length} doctors assigned to you
          </div>
          <div className="flex flex-col gap-2">
            {visible.map((d) => (
              <label key={d.id} className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 uppercase ${typeTone[d.personType]}`}>{d.personType}</span>
                  </div>
                  <div className="text-[13px] font-bold text-slate-800 truncate mt-0.5">{d.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{d.hospital}</div>
                </div>
                <Checkbox checked={selected.includes(d.id)} onChange={() => toggle(d.id)} />
              </label>
            ))}
            <button
              onClick={() => setShowAdd(true)}
              className="border-[1.5px] border-dashed border-slate-300 rounded-xl py-2.5 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50 transition flex items-center justify-center gap-1.5"
            >
              <UserPlus size={15} /> Add New Doctor (needs admin approval)
            </button>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-slate-200 bg-white">
          <Button size="lg" className="w-full" disabled={!otAdjusted.valid} onClick={savePlan}>
            {otAdjusted.valid ? `Save Plan (${selectedDocs.length} visits)` : (isOtHalf ? "Select 3 people to continue" : "Select at least one doctor")}
          </Button>
        </div>

        {/* Add doctor sheet */}
        {showAdd && (
          <div className="absolute inset-0 z-40 flex flex-col justify-end">
            <div className="absolute inset-0 bg-slate-900/45" onClick={() => setShowAdd(false)} />
            <form onSubmit={saveCustomDoctor} className="relative bg-white rounded-t-3xl max-h-[90%] overflow-y-auto p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-800 text-[15px] flex items-center gap-1.5"><Stethoscope size={16} className="text-brand-700" /> Add New Doctor</div>
                <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
              </div>
              <div className="text-[11.5px] text-slate-500 -mt-1">
                New doctors are sent to Management and appear in your list only after approval.
              </div>
              <Input label="Doctor Name *" placeholder="Prof. Dr. Full Name" value={form.name} onChange={set("name")} />
              <Select label="Person Type *" options={PERSON_TYPES} value={form.personType} onChange={set("personType")} />
              {form.personType === "Other" && (
                <Input label="Specify person type *" placeholder="e.g. Senior Registrar" value={form.personTypeOther} onChange={set("personTypeOther")} />
              )}
              <Select label="Hospital *" options={HOSPITALS.map((h) => h.name)} value={form.hospital} onChange={set("hospital")} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Visit Time" placeholder="e.g. 04:30 PM" value={form.time} onChange={set("time")} />
                <Input label="Phone" placeholder="+92 3xx xxxxxxx" value={form.phone} onChange={set("phone")} />
              </div>
              <Input label="Email" type="email" placeholder="doctor@hospital.com" value={form.email} onChange={set("email")} />
              <Textarea label="Discussion / Objective" rows={3} placeholder="Products to discuss and objective of the visit…" value={form.discussion} onChange={set("discussion")} />
              <Button type="submit" size="lg" className="w-full mt-1">Submit for Approval</Button>
            </form>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
