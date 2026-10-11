import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const CATEGORIES = ["Adhesives & Sealants", "Haemostats", "Disposables", "Power Tools", "Implants", "Shunts", "Drainage", "Other"];
const EMPTY = { id: "", name: "", category: "Haemostats", monthlyTarget: "", unitPrice: "" };

export default function Products() {
  const toast = useToast();
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY);

  function startAdd() {
    setForm(EMPTY);
    setOpen(true);
  }

  function startEdit(p) {
    setForm({
      id: p.id,
      name: p.name || "",
      category: p.category || "Other",
      monthlyTarget: p.monthlyTarget ?? "",
      unitPrice: p.unitPrice ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return toast("Enter a product name.");
    setBusy(true);
    const res = form.id
      ? await updateProduct(form.id, form)
      : await addProduct(form);
    setBusy(false);
    if (!res.ok) return toast(res.error || "Could not save that product.");
    toast(form.id ? `${form.name} updated.` : `${form.name} added to the catalogue.`);
    setForm(EMPTY);
    setOpen(false);
  }

  async function confirmDelete() {
    setBusy(true);
    const res = await deleteProduct(deleting.id);
    setBusy(false);
    if (!res.ok) return toast(res.error || "Could not delete that product.");
    toast(`${deleting.name} removed.`);
    setDeleting(null);
  }

  return (
    <DashboardLayout title="Products" subtitle="Catalogue the field team sells. Each visit, sample and target is per product.">
      <div className="flex justify-end mb-3">
        <Button icon={Plus} onClick={startAdd}>Add product</Button>
      </div>
      <Card padding="p-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 font-semibold">Product</th>
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 font-semibold">Monthly target</th>
              <th className="px-4 py-2.5 font-semibold">Unit price</th>
              <th className="px-4 py-2.5 font-semibold">Stock item</th>
              <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(products || []).map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 font-semibold text-slate-800">{p.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{p.category || "—"}</td>
                <td className="px-4 py-2.5 tabular-nums">{p.monthlyTarget || "—"}</td>
                <td className="px-4 py-2.5 tabular-nums">{p.unitPrice != null ? p.unitPrice : "—"}</td>
                <td className="px-4 py-2.5 text-slate-500">{p.item || "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50" onClick={() => startEdit(p)} title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="p-1.5 rounded-lg text-slate-400 hover:text-danger-fg hover:bg-danger-bg" onClick={() => setDeleting(p)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!products || products.length === 0) && (
          <div className="text-center text-slate-400 py-10 text-[13px]">No products yet. Add the catalogue here.</div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit product" : "Add product"}
        subtitle="A stock item is created automatically so ERP stays in sync"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save product"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Product name" placeholder="e.g. Stypcel" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Category" options={CATEGORIES} value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Default monthly target" type="number" min="0" value={form.monthlyTarget}
              onChange={(e) => setForm({ ...form, monthlyTarget: e.target.value })} />
            <Input label="Unit price (PKR)" type="number" min="0" value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete product"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={busy}>{busy ? "Deleting…" : "Delete"}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Delete {deleting?.name} from the catalogue?</p>
      </Modal>
    </DashboardLayout>
  );
}
