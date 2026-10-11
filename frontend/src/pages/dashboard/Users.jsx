import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { api } from "../../lib/frappe.js";

const EMPTY = {
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  role: "",
  territory: "",
  enabled: 1,
};

function needsCity(role) {
  return role === "TC Salesperson" || role === "TC Sales Manager";
}

export default function Users() {
  const toast = useToast();
  const { territories } = useData();
  const [rows, setRows] = useState([]);
  const [assignable, setAssignable] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    try {
      const [list, roleInfo] = await Promise.all([
        api.call("ne_taskcompass.api.users.list_portal_users"),
        api.call("ne_taskcompass.api.users.list_roles"),
      ]);
      setRows(list || []);
      setAssignable(roleInfo?.assignable || roleInfo?.roles || []);
    } catch (e) {
      toast(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY, role: assignable[0] || "" });
    setOpen(true);
  }

  function startEdit(row) {
    setEditing(row);
    setForm({
      email: row.email,
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      password: "",
      role: row.role || assignable[0] || "",
      territory: row.territory || "",
      enabled: row.enabled,
    });
    setOpen(true);
  }

  async function save() {
    if (!editing && !form.email.trim()) return toast("Enter an email.");
    if (!form.first_name.trim()) return toast("Enter a first name.");
    if (!form.role) return toast("Pick a role.");
    if (needsCity(form.role) && !form.territory) return toast("Pick a city for this role.");
    if (!editing && String(form.password).length < 8) return toast("Password must be at least 8 characters.");
    if (editing && form.password && String(form.password).length < 8) return toast("Password must be at least 8 characters.");
    setBusy(true);
    try {
      if (editing) {
        await api.call("ne_taskcompass.api.users.update_portal_user", {
          name: editing.name,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          territory: form.territory,
          enabled: form.enabled,
          password: form.password || undefined,
        });
        toast("User updated.");
      } else {
        await api.call("ne_taskcompass.api.users.create_portal_user", {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          password: form.password,
          role: form.role,
          territory: form.territory,
        });
        toast("User created.");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  }

  const roleOptions = [{ value: "", label: "Select role" }, ...assignable.map((r) => ({ value: r, label: r }))];
  const cityOptions = [{ value: "", label: "Select city" }, ...(territories || []).map((t) => ({ value: t.id, label: t.name }))];

  return (
    <DashboardLayout
      title="Users"
      subtitle="Portal logins. Only the four TaskCompass roles can be assigned here."
    >
      <div className="flex justify-end mb-3">
        <Button icon={Plus} onClick={startCreate}>Add user</Button>
      </div>
      <Card padding="p-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Email</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">City</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr
                key={u.name}
                className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50"
                onClick={() => startEdit(u)}
              >
                <td className="px-4 py-2.5 font-semibold text-slate-800">{u.full_name || u.email}</td>
                <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                <td className="px-4 py-2.5 text-slate-700">{u.role || "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{u.territory || "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={u.enabled ? "text-emerald-700 font-semibold" : "text-slate-400"}>
                    {u.enabled ? "Active" : "Disabled"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="text-center text-slate-400 py-10 text-[13px]">
            No portal users yet. Add one here.
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit user" : "Add user"}
        subtitle="Role list is only the four TaskCompass roles. Salesperson and Sales Manager need a city."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create user"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Email"
            type="email"
            value={form.email}
            disabled={Boolean(editing)}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last name" value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Select
            label="Role"
            options={roleOptions}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          {needsCity(form.role) && (
            <Select
              label="City / territory"
              options={cityOptions}
              value={form.territory}
              onChange={(e) => setForm({ ...form, territory: e.target.value })}
            />
          )}
          <Input
            label={editing ? "New password (optional)" : "Password"}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {editing && (
            <Select
              label="Status"
              options={[{ value: "1", label: "Active" }, { value: "0", label: "Disabled" }]}
              value={String(form.enabled)}
              onChange={(e) => setForm({ ...form, enabled: Number(e.target.value) })}
            />
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
