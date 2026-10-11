import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import SearchSelect from "../../components/ui/SearchSelect.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { api, uploadFile } from "../../lib/frappe.js";

const STAGES = ["Identified", "Submitted", "Won", "Lost", "Closed"];
const EMPTY = {
  name: "", title: "", hospital: "", champion_doctor: "", lead: "", stage: "Identified",
  submission_date: "", po_number: "", po_date: "", notes: "", product: "", qty: "1",
  supporting_document: "", supporting_file_url: "", file: null,
};

export default function Tenders() {
  const toast = useToast();
  const { tenders, hospitals, doctors, users, products, saveTender, deleteTender } = useData();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function startAdd() {
    setForm(EMPTY);
    setOpen(true);
  }

  async function startEdit(t) {
    let full = t;
    try {
      full = await api.call("ne_taskcompass.api.tenders.get_tender", { name: t.name }) || t;
    } catch {
      full = t;
    }
    const first = (full.items || [])[0] || {};
    setForm({
      name: full.name,
      title: full.title || "",
      hospital: full.hospital || "",
      champion_doctor: full.champion_doctor || "",
      lead: full.lead || "",
      stage: full.stage || "Identified",
      submission_date: full.submission_date || "",
      po_number: full.po_number || "",
      po_date: full.po_date || "",
      notes: full.notes || "",
      product: first.product || "",
      qty: String(first.qty || 1),
      supporting_document: full.supporting_document || "",
      supporting_file_url: full.supporting_file_url || "",
      file: null,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return toast("Enter a tender title.");
    if (!form.po_number.trim()) return toast("PO Number is required.");
    if (!form.po_date) return toast("PO Date is required.");
    setBusy(true);
    let supporting = form.supporting_document || undefined;
    if (form.file && form.name) {
      try {
        const uploaded = await uploadFile({
          file: form.file, doctype: "TC Tender", docname: form.name, fieldname: "supporting_document",
        });
        supporting = uploaded?.file_url || supporting;
      } catch (e) {
        setBusy(false);
        return toast(e.message);
      }
    }
    const res = await saveTender({
      name: form.name || undefined,
      title: form.title,
      hospital: form.hospital,
      champion_doctor: form.champion_doctor,
      lead: form.lead,
      stage: form.stage,
      submission_date: form.submission_date || null,
      po_number: form.po_number,
      po_date: form.po_date,
      supporting_document: supporting,
      notes: form.notes,
      items: form.product ? [{ product: form.product, qty: Number(form.qty) || 1, unit_price: 0 }] : [],
    });
    if (res.ok && form.file && !form.name && res.name) {
      try {
        const uploaded = await uploadFile({
          file: form.file, doctype: "TC Tender", docname: res.name, fieldname: "supporting_document",
        });
        if (uploaded?.file_url) {
          await saveTender({
            name: res.name,
            title: form.title,
            hospital: form.hospital,
            champion_doctor: form.champion_doctor,
            lead: form.lead,
            stage: form.stage,
            submission_date: form.submission_date || null,
            po_number: form.po_number,
            po_date: form.po_date,
            supporting_document: uploaded.file_url,
            notes: form.notes,
          });
        }
      } catch (e) {
        setBusy(false);
        return toast(`Tender saved, but the document did not upload. ${e.message}`);
      }
    }
    setBusy(false);
    if (!res.ok) return toast(res.error);
    toast(form.name ? "Tender updated." : "Tender saved.");
    setOpen(false);
    setForm(EMPTY);
  }

  async function confirmDelete() {
    setBusy(true);
    const res = await deleteTender(deleting.name);
    setBusy(false);
    if (!res.ok) return toast(res.error);
    toast("Tender deleted.");
    setDeleting(null);
  }

  return (
    <DashboardLayout title="Tenders" subtitle="Hospital tenders the field team is chasing">
      <div className="flex justify-end mb-3">
        <Button icon={Plus} onClick={startAdd}>Add tender</Button>
      </div>
      <Card padding="p-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 font-semibold">Title</th>
              <th className="px-4 py-2.5 font-semibold">Hospital</th>
              <th className="px-4 py-2.5 font-semibold">Lead</th>
              <th className="px-4 py-2.5 font-semibold">Stage</th>
              <th className="px-4 py-2.5 font-semibold">PO</th>
              <th className="px-4 py-2.5 font-semibold">PO date</th>
              <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tenders || []).map((t) => (
              <tr key={t.name} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 font-semibold text-slate-800">{t.title}</td>
                <td className="px-4 py-2.5 text-slate-600">{t.hospital || "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{t.lead || "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{t.stage}</td>
                <td className="px-4 py-2.5 text-slate-600">{t.po_number || "—"}</td>
                <td className="px-4 py-2.5 text-slate-500">{t.po_date || "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50" onClick={() => startEdit(t)} title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="p-1.5 rounded-lg text-slate-400 hover:text-danger-fg hover:bg-danger-bg" onClick={() => setDeleting(t)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!tenders || tenders.length === 0) && (
          <div className="text-center text-slate-400 py-10 text-[13px]">No tenders yet.</div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.name ? "Edit tender" : "Add tender"}
        subtitle="Identified, then Submitted, then Won or Lost. A Won tender stays open until you mark it Closed after the order is finished."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save tender"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <SearchSelect
            label="Hospital"
            value={form.hospital}
            options={(hospitals || []).map((h) => ({ value: h.id, label: h.name, sub: h.city }))}
            onChange={(id) => setForm({ ...form, hospital: id })}
          />
          <SearchSelect
            label="Champion doctor"
            value={form.champion_doctor}
            options={(doctors || []).map((d) => ({ value: d.id, label: d.name, sub: d.hospital }))}
            onChange={(id) => setForm({ ...form, champion_doctor: id })}
          />
          <Select
            label="Lead salesperson"
            options={[{ value: "", label: "—" }, ...(users || []).map((u) => ({ value: u.id, label: u.name }))]}
            value={form.lead}
            onChange={(e) => setForm({ ...form, lead: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Stage" options={STAGES} value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })} />
            <Input label="Submission date" type="date" value={form.submission_date}
              onChange={(e) => setForm({ ...form, submission_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="PO Number *" value={form.po_number}
              onChange={(e) => setForm({ ...form, po_number: e.target.value })} />
            <Input label="PO Date *" type="date" value={form.po_date}
              onChange={(e) => setForm({ ...form, po_date: e.target.value })} />
          </div>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">Supporting document</span>
            <input type="file" accept="image/*,.pdf" className="text-[13px] text-slate-600"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
            <span className="block text-[11px] text-slate-400 mt-1">Photo of the PO or challan.</span>
          </label>
          {(form.supporting_file_url || form.supporting_document) && !form.file && (
            <a href={form.supporting_file_url || form.supporting_document} target="_blank" rel="noreferrer" className="text-[12px] text-brand-700 font-semibold">
              View current document
            </a>
          )}
          <SearchSelect
            label="Product line"
            value={form.product}
            options={(products || []).map((p) => ({ value: p.id, label: p.name, sub: p.category }))}
            onChange={(id) => setForm({ ...form, product: id })}
          />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete tender"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={busy}>{busy ? "Deleting…" : "Delete"}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Delete {deleting?.title}?</p>
      </Modal>
    </DashboardLayout>
  );
}
