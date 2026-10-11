import { useState } from "react";
import { MessageSquare, FlaskConical, UserPlus, Camera, Stethoscope, PencilLine, ArrowRight } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useData } from "../../context/DataContext.jsx";

const interestTone = { High: "bg-success-bg text-success-fg", Medium: "bg-warning-bg text-warning-fg", Low: "bg-slate-100 text-slate-500" };
const typeTone = {
  HOD: "bg-brand-600 text-white",
  Professor: "bg-info-solid text-white",
  "OT Incharge": "bg-slate-500 text-white",
};

function StampedPreview({ sample, className }) {
  const [failed, setFailed] = useState(false);
  const src = sample?.stampedFileUrl || "";
  if (!src) return null;
  if (failed) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-[11px] text-brand-700 px-2.5 py-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Camera size={12} /> Open stamped document
      </a>
    );
  }
  return (
    <img
      src={src}
      alt="Stamped review"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function Approvals() {
  const toast = useToast();
  const {
    pendingDoctors, setDoctorStatus, samples, editRequests, reviewEditRequest,
    sampleOrders, reviewSampleOrder,
  } = useData();
  const pendingOrders = (sampleOrders || []).filter((o) => o.status === "pending");

  async function decideOrder(o, status) {
    const res = await reviewSampleOrder(o.id, status);
    toast(res.ok ? `Sample order for ${o.doctorName} ${status}.` : res.error);
  }
  const [busyId, setBusyId] = useState(null);
  const [viewingSample, setViewingSample] = useState(null);
  const reviewed = samples.filter((s) => s.review || s.stampedDoc || s.interest);
  const pendingEdits = (editRequests || []).filter((r) => r.status === "pending");

  async function decideDoctor(d, status) {
    await setDoctorStatus(d.id, status);
    toast(`${d.name} ${status === "approved" ? "approved — now visible to the rep" : "rejected"}`);
  }

  async function decideEdit(req, decision) {
    setBusyId(req.id);
    const res = await reviewEditRequest(req.id, decision);
    setBusyId(null);
    if (!res.ok) return toast(res.error || "Could not save that decision.");
    toast(
      decision === "approved"
        ? `${req.doctor} updated. Everyone sees the change now.`
        : `Correction to ${req.doctor} rejected.`
    );
  }

  // Field-facing labels. The database column names would mean nothing to a manager.
  const FIELD_LABEL = {
    name: "Name", personType: "Person type", specialty: "Specialty", city: "City",
    phone: "Phone", whatsapp: "WhatsApp", email: "Email",
    designation: "Designation", notes: "Notes", imageUrl: "Photo", hospitalId: "Hospital",
  };

  return (
    <DashboardLayout title="Approvals & Feedback" subtitle="Doctor corrections, sample requests, exceptions & doctor sample feedback">
      {/* Sample order forms */}
      <div className="text-[13px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
        <FlaskConical size={15} className="text-brand-700" /> Sample Order Forms
        {pendingOrders.length > 0 && (
          <span className="text-[11px] font-bold bg-warning-bg text-warning-fg px-2 py-0.5 rounded-full">
            {pendingOrders.length} waiting
          </span>
        )}
      </div>
      <div className="text-[12px] text-slate-400 mb-2.5">
        The theatre volume on each form is what decides whether the sample quantity is proportionate.
      </div>
      {pendingOrders.length === 0 ? (
        <Card className="text-center text-slate-400 py-8 text-[13px] mb-7">No sample order forms waiting.</Card>
      ) : (
        <div className="flex flex-col gap-3 mb-7">
          {pendingOrders.map((o) => {
            const relevance = o.totalSurgeries
              ? Math.round((o.relatedSurgeries / o.totalSurgeries) * 100) : 0;
            return (
              <Card key={o.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 text-[14px]">{o.doctorName}</div>
                    <div className="text-[12px] text-slate-500">
                      {o.designation} · {o.department} · {o.hospitalName}
                    </div>
                    <div className="text-[11.5px] text-slate-400 mt-0.5">
                      {o.product} · requested by {o.rep} on {o.createdAt}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => decideOrder(o, "rejected")}>Reject</Button>
                    <Button size="sm" onClick={() => decideOrder(o, "approved")}>Approve</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ["Related surgeries", `${o.relatedSurgeries}/mo`],
                    ["Total surgeries", `${o.totalSurgeries}/mo`],
                    ["Expected use", `${o.expectedConsumption}/mo`],
                    ["Relevance", `${relevance}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
                      <div className="text-[14px] font-bold text-slate-800 tabular-nums">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[11.5px] text-slate-500">
                  This product is relevant to {relevance}% of their monthly list, and they expect to use{" "}
                  {o.expectedConsumption} units a month across {o.relatedSurgeries} relevant cases.
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Corrections sent in from the field */}
      <div className="text-[13px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
        <PencilLine size={15} className="text-brand-700" /> Corrections From the Field
        {pendingEdits.length > 0 && (
          <span className="text-[11px] font-bold bg-warning-bg text-warning-fg px-2 py-0.5 rounded-full">
            {pendingEdits.length} waiting
          </span>
        )}
      </div>
      <div className="text-[12px] text-slate-400 mb-2.5">
        A rep standing in front of a consultant knows the real timings better than any directory does.
        Their change waits here until you approve it, then updates for everyone at once.
      </div>
      {pendingEdits.length === 0 ? (
        <Card className="text-center text-slate-400 py-8 text-[13px] mb-7">
          No corrections waiting. Reps can send one from a doctor profile in the app.
        </Card>
      ) : (
        <div className="flex flex-col gap-3 mb-7">
          {pendingEdits.map((req) => (
            <Card key={req.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-[14px]">{req.doctor}</div>
                  <div className="text-[12px] text-slate-500">
                    Sent by {req.requestedBy}
                    {req.createdAt ? ` · ${req.createdAt}` : ""}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" disabled={busyId === req.id}
                    onClick={() => decideEdit(req, "rejected")}>
                    Reject
                  </Button>
                  <Button size="sm" disabled={busyId === req.id}
                    onClick={() => decideEdit(req, "approved")}>
                    {busyId === req.id ? "Saving…" : "Approve"}
                  </Button>
                </div>
              </div>

              {req.reason && (
                <div className="text-[12px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  <b>Why:</b> {req.reason}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {Object.entries(req.changes).map(([field, change]) => (
                  <div key={field} className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 last:border-0 text-[12.5px] flex-wrap">
                    <span className="font-semibold text-slate-600 w-24 shrink-0">
                      {FIELD_LABEL[field] || field}
                    </span>
                    <span className="text-slate-400 line-through break-all">
                      {String(change.from || "").trim() || "empty"}
                    </span>
                    <ArrowRight size={13} className="text-slate-300 shrink-0" />
                    <span className="font-semibold text-success-fg break-all">
                      {String(change.to || "").trim() || "empty"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New doctors submitted from the mobile app (rule 4) */}
      <div className="text-[13px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
        <UserPlus size={15} className="text-brand-700" /> New Doctors Awaiting Approval
      </div>
      <div className="text-[12px] text-slate-400 mb-2.5">Added by field reps in the app — they stay hidden until you approve them.</div>
      {pendingDoctors.length === 0 ? (
        <Card className="text-center text-slate-400 py-8 text-[13px] mb-7">No new doctors pending approval.</Card>
      ) : (
        <div className="flex flex-col gap-3 mb-7">
          {pendingDoctors.map((d) => (
            <Card key={d.id} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0"><Stethoscope size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9.5px] font-bold rounded-full px-2 py-0.5 uppercase ${typeTone[d.personType]}`}>{d.personType}</span>
                </div>
                <div className="font-semibold text-[14px] text-slate-800 mt-1">{d.name}</div>
                <div className="text-[12px] text-slate-500">{d.hospital} · {d.city} {d.phone ? `· ${d.phone}` : ""}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => decideDoctor(d, "rejected")}>Reject</Button>
                <Button size="sm" onClick={() => decideDoctor(d, "approved")}>Approve</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Doctor sample feedback (captured by field reps on the mobile app) */}
      <div className="text-[13px] font-bold text-slate-700 mt-7 mb-1 flex items-center gap-1.5">
        <MessageSquare size={15} className="text-brand-700" /> Doctor Sample Feedback
      </div>
      <div className="text-[12px] text-slate-400 mb-2.5">Reviews recorded by field reps, each backed by the surgeon's stamped document.</div>
      {reviewed.length === 0 ? (
        <Card className="text-center text-slate-400 py-8 text-[13px]">No sample reviews recorded yet.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {reviewed.map((f) => (
            <Card key={f.id} className="flex flex-col gap-2 cursor-pointer hover:border-brand-200" onClick={() => setViewingSample(f)}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center shrink-0"><FlaskConical size={17} /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13.5px] text-slate-800 truncate">{f.product}</div>
                  <div className="text-[11.5px] text-slate-400 truncate">{f.doctor} · via {f.rep}</div>
                </div>
                <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${interestTone[f.interest] || "bg-slate-100 text-slate-500"}`}>{f.interest || "—"}</span>
              </div>
              {f.review && <div className="text-[12.5px] text-slate-600 italic">“{f.review}”</div>}
              {f.stampedFileUrl && (
                <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                  <StampedPreview sample={f} className="w-full max-h-48 object-contain bg-white" />
                </div>
              )}
              <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">Expected to use by <span className="font-semibold text-slate-600">{f.usageDate || "—"}</span> · logged {f.date || f.createdAt}</div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(viewingSample)}
        onClose={() => setViewingSample(null)}
        title="Sample feedback"
        subtitle={viewingSample ? `${viewingSample.product} · ${viewingSample.doctor}` : ""}
        footer={<Button variant="ghost" onClick={() => setViewingSample(null)}>Close</Button>}
      >
        {viewingSample && (
          <div className="flex flex-col gap-3 text-[13px] text-slate-600">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Interest</div>
                <div className="font-bold text-slate-800">{viewingSample.interest || "—"}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Use by</div>
                <div className="font-bold text-slate-800">{viewingSample.usageDate || "—"}</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 mb-1">Doctor review</div>
              <div className="italic">{viewingSample.review || "No written review yet."}</div>
            </div>
            {viewingSample.stampedFileUrl ? (
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1">Stamped document</div>
                <StampedPreview sample={viewingSample} className="w-full rounded-xl border border-slate-100 object-contain max-h-[60vh] bg-white" />
              </div>
            ) : (
              <div className="text-[12px] text-slate-400">No stamped document was attached.</div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
