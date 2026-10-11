import { useState, useMemo } from "react";
import { AlertCircle, ClipboardList } from "lucide-react";
import { Input, Select } from "../ui/Field.jsx";
import Button from "../ui/Button.jsx";
import { useData } from "../../context/DataContext.jsx";

export const DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Consultant Surgeon",
  "Other",
];

const NUMERIC = ["relatedSurgeries", "totalSurgeries", "expectedConsumption"];

/**
 * The sample order form.
 *
 * The order of the fields follows how the conversation actually goes in a
 * hospital corridor: who the surgeon is, where they work, then the theatre
 * numbers that decide how much stock to send. Every field is required, because
 * a form with the surgery counts missing cannot answer the only question the
 * office is asking, which is whether the sample quantity is proportionate.
 */
export default function SampleOrderForm({ doctor, products = [], onSubmit, onCancel, busy }) {
  const { designations } = useData();
  const designationOptions = useMemo(() => {
    const fromSetup = (designations || []).map((d) => d.name).filter(Boolean);
    return fromSetup.length ? fromSetup : DESIGNATIONS;
  }, [designations]);
  const [form, setForm] = useState({
    doctorName: doctor?.name || "",
    designation:
      doctor?.academicRank === "Associate" ? "Associate Professor"
      : doctor?.academicRank === "Assistant" ? "Assistant Professor"
      : doctor?.personType === "Professor" ? "Professor"
      : "Consultant Surgeon",
    hospitalName: doctor?.hospital && doctor.hospital !== "Not recorded" ? doctor.hospital : "",
    department: doctor?.specialty || "",
    productId: products[0]?.id || "",
    relatedSurgeries: "",
    totalSurgeries: "",
    expectedConsumption: "",
  });
  const [touched, setTouched] = useState({});

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setTouched({ ...touched, [k]: true });
  };

  const errors = useMemo(() => {
    const e = {};
    if (!form.doctorName.trim()) e.doctorName = "Required";
    if (!form.designation) e.designation = "Required";
    if (!form.hospitalName.trim()) e.hospitalName = "Required";
    if (!form.department.trim()) e.department = "Required";
    if (!form.productId) e.productId = "Required";

    for (const k of NUMERIC) {
      const raw = form[k];
      if (raw === "" || raw === null) { e[k] = "Required"; continue; }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) e[k] = "Enter a whole number, zero or more";
      else if (!Number.isInteger(n)) e[k] = "Whole numbers only";
    }

    // The sanity check that matters. If related surgeries exceed the total, one
    // of the two numbers is wrong, and shipping stock against it wastes it.
    const rel = Number(form.relatedSurgeries);
    const tot = Number(form.totalSurgeries);
    if (!e.relatedSurgeries && !e.totalSurgeries && rel > tot) {
      e.relatedSurgeries = "Cannot be more than the total number of surgeries";
    }
    return e;
  }, [form]);

  const valid = Object.keys(errors).length === 0;

  // A quiet sense check, not a blocker. The surgeon may batch cases.
  const ratioWarning = useMemo(() => {
    const rel = Number(form.relatedSurgeries);
    const con = Number(form.expectedConsumption);
    if (!rel || !con) return null;
    if (con > rel * 5) {
      return `That is ${(con / rel).toFixed(1)} units per relevant surgery. Worth double checking before the office reviews it.`;
    }
    return null;
  }, [form.relatedSurgeries, form.expectedConsumption]);

  function submit(e) {
    e?.preventDefault();
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    if (!valid) return;
    onSubmit?.({
      ...form,
      relatedSurgeries: Number(form.relatedSurgeries),
      totalSurgeries: Number(form.totalSurgeries),
      expectedConsumption: Number(form.expectedConsumption),
    });
  }

  const err = (k) => (touched[k] ? errors[k] : null);

  const Err = ({ k }) =>
    err(k) ? (
      <div className="text-[11px] text-danger-fg mt-0.5 flex items-center gap-1">
        <AlertCircle size={11} /> {err(k)}
      </div>
    ) : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <div className="flex gap-2 text-[11.5px] text-brand-800 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 leading-relaxed">
        <ClipboardList size={14} className="shrink-0 mt-0.5" />
        <span>
          Every field is required. The theatre numbers are what the office uses to decide the sample
          quantity, so a guess here becomes wasted stock later.
        </span>
      </div>

      {/* Who */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">The surgeon</div>
        <div className="flex flex-col gap-3">
          <div>
            <Input label="Doctor's name *" value={form.doctorName} onChange={set("doctorName")} />
            <Err k="doctorName" />
          </div>
          <div>
            <Select label="Designation *" options={designationOptions} value={form.designation} onChange={set("designation")} />
            <Err k="designation" />
          </div>
        </div>
      </div>

      {/* Where */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Where they operate</div>
        <div className="flex flex-col gap-3">
          <div>
            <Input label="Hospital name *" value={form.hospitalName} onChange={set("hospitalName")} />
            <Err k="hospitalName" />
          </div>
          <div>
            <Input label="Department *" placeholder="e.g. Neurosurgery" value={form.department} onChange={set("department")} />
            <Err k="department" />
          </div>
        </div>
      </div>

      {/* Volume */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">
          Theatre volume, per month
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <Select label="Sample product *" options={products.map((p) => p.name)}
              value={products.find((p) => p.id === form.productId)?.name || ""}
              onChange={(e) => {
                const p = products.find((x) => x.name === e.target.value);
                setForm({ ...form, productId: p?.id || "" });
                setTouched({ ...touched, productId: true });
              }} />
            <Err k="productId" />
          </div>
          <div>
            <Input label="Surgeries per month related to this sample *" type="number" min="0"
              value={form.relatedSurgeries} onChange={set("relatedSurgeries")} />
            <div className="text-[10.5px] text-slate-400 mt-0.5">
              Only the cases where this product would actually be used.
            </div>
            <Err k="relatedSurgeries" />
          </div>
          <div>
            <Input label="Total surgeries per month, all types *" type="number" min="0"
              value={form.totalSurgeries} onChange={set("totalSurgeries")} />
            <div className="text-[10.5px] text-slate-400 mt-0.5">
              Their whole list. This is how we judge how much of it we could win.
            </div>
            <Err k="totalSurgeries" />
          </div>
          <div>
            <Input label="Expected monthly consumption *" type="number" min="0"
              value={form.expectedConsumption} onChange={set("expectedConsumption")} />
            <div className="text-[10.5px] text-slate-400 mt-0.5">
              Units they expect to use each month once they adopt it.
            </div>
            <Err k="expectedConsumption" />
          </div>
        </div>
      </div>

      {ratioWarning && (
        <div className="text-[11.5px] text-warning-fg bg-warning-bg border border-warning-fg/20 rounded-xl px-3 py-2 flex gap-2">
          <AlertCircle size={13} className="shrink-0 mt-0.5" /> {ratioWarning}
        </div>
      )}

      {/* What we can infer, shown back so the rep sees the case they are making */}
      {Number(form.totalSurgeries) > 0 && Number(form.relatedSurgeries) >= 0 && !errors.relatedSurgeries && !errors.totalSurgeries && (
        <div className="text-[11.5px] text-slate-600 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed">
          This product is relevant to{" "}
          <b>{Math.round((Number(form.relatedSurgeries) / Number(form.totalSurgeries)) * 100)}%</b> of their
          monthly list.
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" className="flex-1" disabled={busy || !valid}>
          {busy ? "Sending…" : "Submit sample order"}
        </Button>
      </div>
      {!valid && Object.keys(touched).length > 0 && (
        <div className="text-[11px] text-slate-400 text-center">
          Fill every field above to submit.
        </div>
      )}
    </form>
  );
}
