import { useState } from "react";
import { X, Plus, Gavel, Building2, CalendarDays } from "lucide-react";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Select, Textarea } from "../../components/ui/Field.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { TENDER_STAGES, HOSPITALS, salesperson } from "../../data/neData.js";

const stageTone = {
  Identified: "bg-slate-100 text-slate-600",
  Submitted: "bg-brand-50 text-brand-700",
  Won: "bg-success-bg text-success-fg",
  Lost: "bg-danger-bg text-danger-fg",
  Closed: "bg-slate-200 text-slate-600",
};

const empty = { title: "", hospital: HOSPITALS[0].name, stage: "Identified", submissionDate: "", poNumber: "", poDate: "", notes: "" };

export default function Tenders() {
  const toast = useToast();
  const { tenders, saveTender } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(empty);

  const mine = tenders.filter((t) => t.lead === salesperson.name);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast("Enter a tender title");
    if (!form.poNumber.trim() || !form.poDate) return toast("PO Number and PO Date are required");
    const res = await saveTender({
      title: form.title,
      hospital: form.hospital,
      stage: form.stage,
      submission_date: form.submissionDate || null,
      po_number: form.poNumber,
      po_date: form.poDate,
      notes: form.notes,
      lead: salesperson.name,
    });
    if (!res.ok) return toast(res.error);
    setForm(empty);
    setShowAdd(false);
    toast("Tender saved — visible to Management on the portal");
  }

  async function advance(t) {
    if (t.stage !== "Identified") {
      return toast("After submission, set the stage to Won, Lost, or Closed on the form. Won stays open until you close it.");
    }
    const res = await saveTender({
      name: t.name || t.id,
      title: t.title,
      hospital: t.hospital,
      lead: t.lead,
      stage: "Submitted",
      submission_date: t.submission_date,
      po_number: t.po_number,
      po_date: t.po_date,
      notes: t.notes,
    });
    if (!res.ok) return toast(res.error);
    toast("Moved to Submitted");
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      <MobileHeader title="Tenders" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12.5px] font-bold text-slate-700">Tenders I'm leading</div>
            <div className="text-[11px] text-slate-400">Managed here, monitored by Management on the portal.</div>
          </div>
          <Button size="sm" icon={Plus} onClick={() => setShowAdd(true)}>New</Button>
        </div>

        {mine.length === 0 && (
          <Card className="text-center text-slate-400 py-10 text-[13px]">No tenders assigned to you yet.</Card>
        )}

        {mine.map((t) => (
          <Card key={t.id} className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center shrink-0"><Gavel size={17} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-slate-800 leading-snug">{t.title}</div>
                <div className="text-[11.5px] text-slate-400 flex items-center gap-1 mt-0.5"><Building2 size={11} /> {t.hospital}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${stageTone[t.stage] || "bg-slate-100 text-slate-600"}`}>{t.stage}</span>
              <span className="text-[12px] font-semibold text-slate-600">{t.po_number || "No PO"}</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1"><CalendarDays size={11} /> Submission: {t.submissionDate || "—"}</div>
            {t.notes && <div className="text-[11.5px] text-slate-500 bg-slate-50 rounded-lg px-2.5 py-2">{t.notes}</div>}
            <Button size="sm" variant="secondary" className="w-full" onClick={() => advance(t)}>Move to next stage</Button>
          </Card>
        ))}
      </div>

      {showAdd && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/45" onClick={() => setShowAdd(false)} />
          <form onSubmit={submit} className="relative bg-white rounded-t-3xl max-h-[90%] overflow-y-auto p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 text-[15px]">New Tender</div>
              <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <Input label="Tender Title *" placeholder="e.g. PIMS — Annual Shunt Supply" value={form.title} onChange={set("title")} />
            <Select label="Hospital" options={HOSPITALS.map((h) => h.name)} value={form.hospital} onChange={set("hospital")} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="PO Number *" value={form.poNumber} onChange={set("poNumber")} />
              <Input label="PO Date *" type="date" value={form.poDate} onChange={set("poDate")} />
            </div>
            <Input label="Submission Date" type="date" value={form.submissionDate} onChange={set("submissionDate")} />
            <Select label="Stage" options={TENDER_STAGES} value={form.stage} onChange={set("stage")} />
            <Textarea label="Notes" rows={3} placeholder="Documents required, competitors, remarks…" value={form.notes} onChange={set("notes")} />
            <Button type="submit" size="lg" className="w-full mt-1">Save Tender</Button>
          </form>
        </div>
      )}
    </div>
  );
}
