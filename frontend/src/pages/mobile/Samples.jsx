import { useRef, useState } from "react";
import { X, MessageSquarePlus, CheckCircle2, Camera, Ban, ShieldAlert, ClipboardList } from "lucide-react";
import SampleOrderForm from "../../components/shared/SampleOrderForm.jsx";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import { Select, Input, Textarea } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { salesperson } from "../../data/neData.js";

const emptyFeedback = { interest: "High", usageDate: "", review: "", stampedDoc: null };

export default function Samples() {
  const toast = useToast();
  const {
    doctorsForRep, samples, requestSample, sampleAllowed, saveSampleReview,
    products, submitSampleOrder, sampleOrders,
  } = useData();
  const { mobileUser } = useSession();
  const me = mobileUser || salesperson;
  const approvedDoctors = doctorsForRep(me.name);
  const [orderFor, setOrderFor] = useState(null);
  const [orderBusy, setOrderBusy] = useState(false);
  const myOrders = (sampleOrders || []).filter((o) => o.rep === me.name || o.rep === "You");

  async function sendOrder(form) {
    setOrderBusy(true);
    const res = await submitSampleOrder(orderFor.id, form, { by: me.name, byId: me.id });
    if (!res.ok) { setOrderBusy(false); return toast(res.error); }

    // The form is the paperwork; the sample request is the thing that gets
    // approved, issued and later reviewed. Creating both keeps the existing
    // issue and review flow working now that the old quick request is gone,
    // and keeps the one sample per doctor rule enforced by its unique index.
    const productName = products.find((p) => p.id === form.productId)?.name;
    await requestSample({
      doctorId: orderFor.id, doctor: orderFor.name,
      product: productName, qty: form.expectedConsumption, rep: me.name,
    });

    setOrderBusy(false);
    setOrderFor(null);
    toast("Sample order form sent to the office.");
  }

  const [doctorId, setDoctorId] = useState(approvedDoctors[0]?.id || "");
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [fb, setFb] = useState(emptyFeedback);
  const fileRef = useRef(null);

  const doctor = approvedDoctors.find((d) => d.id === doctorId);
  const eligibility = doctorId ? sampleAllowed(doctorId) : { allowed: false, reason: "Select a doctor." };

  function openFeedback(s) {
    setFeedbackFor(s);
    setFb({ interest: s.interest || "High", usageDate: s.usageDate || "", review: s.review || "", stampedDoc: s.stampedDoc || null });
  }

  function onPickPhoto(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFb((x) => ({ ...x, stampedDoc: f.name }));
      toast("Stamped document attached");
    }
  }

  async function saveFeedback(e) {
    e.preventDefault();
    const res = await saveSampleReview(feedbackFor.id, fb);
    if (!res.ok) return toast(res.error);
    setFeedbackFor(null);
    toast("Review saved — visible on the portal");
  }

  const setF = (k) => (e) => setFb((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      <MobileHeader title="Samples & Feedback" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Sample Order Form. This replaces the old three field quick request,
            which asked for a doctor, a product and a quantity and gave the office
            no way to judge whether that quantity made sense. */}
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500 mb-2">
            <ClipboardList size={14} className="text-brand-700" /> Request a Sample
          </div>

          <Select
            label="Doctor"
            options={approvedDoctors.map((d) => d.name)}
            value={doctor?.name || ""}
            onChange={(e) => setDoctorId(approvedDoctors.find((d) => d.name === e.target.value)?.id)}
          />

          {/* The one sample per doctor rule is checked before the form opens, so
              a rep does not fill in eight fields only to be refused at the end. */}
          {doctorId && !eligibility.allowed ? (
            <div className="mt-3 rounded-xl bg-danger-bg border border-danger-fg/20 px-3.5 py-2.5 flex items-start gap-2">
              <Ban size={15} className="text-danger-fg shrink-0 mt-0.5" />
              <div className="text-[11.5px] text-danger-fg">{eligibility.reason}</div>
            </div>
          ) : doctorId ? (
            <button
              onClick={() => setOrderFor(doctor)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl py-2.5 transition"
            >
              <ClipboardList size={15} /> Open order form for {doctor?.name}
            </button>
          ) : (
            <div className="mt-3 text-[11.5px] text-slate-400">Pick a doctor to start the form.</div>
          )}

          <div className="text-[10.5px] text-slate-400 flex items-start gap-1.5 mt-2.5 leading-relaxed">
            <ShieldAlert size={13} className="shrink-0 mt-0.5" />
            Each doctor may receive a sample only once, so the form asks for their theatre volume.
            That is what the office uses to decide the quantity.
          </div>

          {myOrders.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 mb-1.5">My order forms</div>
              <div className="flex flex-col gap-1.5">
                {myOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="text-slate-600 truncate min-w-0">
                      {o.doctorName} · {o.product}
                    </span>
                    <StatusPill status={o.status}>{o.status}</StatusPill>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-3">
          <div className="text-[12px] font-bold text-slate-500 mb-2">Issued Samples &amp; Doctor Reviews</div>
          <div className="flex flex-col gap-2">
            {samples.map((s) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-slate-800 truncate">{s.product}</div>
                    <div className="text-[11px] text-slate-400 truncate">{s.doctor} · Qty {s.qty} · {s.date}</div>
                  </div>
                  <StatusPill status={s.status}>{s.status}</StatusPill>
                </div>

                {s.review ? (
                  <div className="mt-2 bg-success-bg rounded-lg px-3 py-2">
                    <div className="text-[11px] font-bold text-success-fg flex items-center gap-1"><CheckCircle2 size={12} /> Review recorded</div>
                    <div className="text-[11.5px] text-slate-600 mt-1">“{s.review}”</div>
                    <div className="text-[10.5px] text-slate-500 mt-1">Interest: {s.interest} · Will use by {s.usageDate}</div>
                    {s.stampedDoc && (
                      <div className="text-[10.5px] text-brand-700 mt-1 flex items-center gap-1"><Camera size={11} /> {s.stampedDoc}</div>
                    )}
                  </div>
                ) : ["Approved", "Issued"].includes(s.status) ? (
                  <button onClick={() => openFeedback(s)} className="mt-2 w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg py-2 transition">
                    <MessageSquarePlus size={14} /> Record doctor's review
                  </button>
                ) : (
                  <div className="mt-1.5 text-[10.5px] text-slate-400 italic">Review can be recorded once the sample is approved &amp; issued.</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center pt-2">
          Inventory quantities are not visible to salespersons — requests are reviewed by Management.
        </p>
      </div>

      {/* Review sheet — stamped document photo is mandatory (rule 10) */}
      {feedbackFor && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/45" onClick={() => setFeedbackFor(null)} />
          <form onSubmit={saveFeedback} className="relative bg-white rounded-t-3xl max-h-[92%] overflow-y-auto p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 text-[15px]">Doctor's Sample Review</div>
              <button type="button" onClick={() => setFeedbackFor(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="text-[11.5px] text-slate-500 -mt-1">{feedbackFor.product} · {feedbackFor.doctor}</div>

            <Select label="Interest Level" options={["High", "Medium", "Low"]} value={fb.interest} onChange={setF("interest")} />
            <Input label="When will the doctor use the sample? *" placeholder="e.g. 28 Jul 2026 / next OT list" value={fb.usageDate} onChange={setF("usageDate")} />
            <Textarea label="Doctor's Review *" rows={3} placeholder="What did the doctor say about the sample?" value={fb.review} onChange={setF("review")} />

            {/* Stamped document upload */}
            <div>
              <span className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                Surgeon's Stamped Review Document * <span className="text-danger-fg">(required)</span>
              </span>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickPhoto} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`w-full rounded-xl border-[1.5px] border-dashed px-3 py-4 flex flex-col items-center gap-1.5 transition ${
                  fb.stampedDoc ? "border-success-fg/40 bg-success-bg" : "border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Camera size={20} className={fb.stampedDoc ? "text-success-fg" : "text-slate-400"} />
                <span className={`text-[12px] font-semibold ${fb.stampedDoc ? "text-success-fg" : "text-slate-600"}`}>
                  {fb.stampedDoc ? fb.stampedDoc : "Capture stamped document"}
                </span>
                <span className="text-[10.5px] text-slate-400">Camera only — photo of the signed &amp; stamped review</span>
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full mt-1">Save Review</Button>
          </form>
        </div>
      )}

      {/* Sample order form, full screen so the numeric fields get room */}
      {orderFor && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="min-w-0">
              <div className="font-bold text-slate-800 text-[14px]">Sample Order Form</div>
              <div className="text-[11.5px] text-slate-500 truncate">{orderFor.name}</div>
            </div>
            <button onClick={() => setOrderFor(null)} className="text-slate-400 p-1"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SampleOrderForm
              doctor={orderFor}
              products={products}
              busy={orderBusy}
              onSubmit={sendOrder}
              onCancel={() => setOrderFor(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
