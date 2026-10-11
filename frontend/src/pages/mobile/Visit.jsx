import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, BookOpen, MonitorPlay, CheckCircle2, Ban, ShoppingCart, FlaskConical } from "lucide-react";
import PhoneFrame from "../../components/mobile/PhoneFrame.jsx";
import MobileHeader from "../../components/mobile/MobileHeader.jsx";
import { Textarea, Select } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { salesperson } from "../../data/neData.js";

function fmt(total) {
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const STAGE_LABEL = {
  1: "Visit 1 · Brochure / Catalog",
  2: "Visit 2 · Product Demonstration",
  3: "Visit 3 · Final Outcome",
};

export default function Visit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { approvedDoctors, doctorsForRep, availableProducts, canVisit, logVisit, visitsFor } = useData();
  const { mobileUser } = useSession();
  const mine = doctorsForRep((mobileUser || salesperson).name);

  const doctor = approvedDoctors.find((d) => d.id === id) || mine[0] || approvedDoctors[0];
  const options = useMemo(() => availableProducts(doctor?.id), [doctor, availableProducts]);

  const [product, setProduct] = useState(options[0] || "");
  const [seconds, setSeconds] = useState(0);
  const [brochure, setBrochure] = useState(true);
  const [demo, setDemo] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!options.includes(product)) setProduct(options[0] || "");
  }, [options, product]);

  const check = product ? canVisit(doctor.id, product) : { allowed: false, next: null, reason: "No products left for this doctor." };
  const stage = check.next;
  const history = product ? visitsFor(doctor.id, product) : [];

  // Demonstration becomes mandatory from visit 2 onwards
  useEffect(() => { if (stage >= 2) setDemo(true); }, [stage]);

  async function submit() {
    const res = await logVisit({ doctorId: doctor.id, product, brochure, demo, outcome, notes });
    if (!res.ok) return toast(res.error);
    toast(`Visit ${res.visit.visitNumber} logged for ${product}`);
    if (outcome === "Sample Requested") navigate("/mobile/samples");
    else navigate(`/mobile/delivery/${doctor.id}`);
  }

  return (
    <PhoneFrame>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MobileHeader title="Call Report" back />
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <div className="text-[10.5px] font-bold text-white/60 uppercase tracking-wide">Visit Duration</div>
            <div className="text-3xl font-extrabold font-mono mt-1">{fmt(seconds)}</div>
            <div className="text-[12px] text-white/70 mt-1.5">{doctor?.name} · {doctor?.hospital}</div>
            <div className="text-[10.5px] text-white/50 mt-0.5">{doctor?.personType}</div>
          </div>

          {/* Product — only products not yet closed with this doctor */}
          <div>
            <Select
              label="Product Discussed (must be a new product each cycle)"
              options={options.length ? options : ["— none available —"]}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
            <div className="text-[11px] text-slate-400 mt-1">
              Products already completed (3 visits) with this doctor are hidden.
            </div>
          </div>

          {/* Stage indicator */}
          {check.allowed ? (
            check.isFollowup ? (
              <div className="rounded-2xl bg-success-bg border border-success-fg/25 px-3.5 py-3">
                <div className="text-[12.5px] font-bold text-success-fg">
                  Follow up visit {check.followupRound}
                </div>
                <div className="text-[11.5px] text-success-fg/90 mt-1 leading-relaxed">
                  The three visit cycle for {product} is complete, but {doctor.name} also uses{" "}
                  {doctor.competitorNames || "a competitor's products"}. Follow ups are unlimited here,
                  and success is measured by whether their monthly volume grows, not by a closing outcome.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-brand-50 border border-brand-100 px-3.5 py-3">
                <div className="text-[12.5px] font-bold text-brand-800">{STAGE_LABEL[stage]}</div>
                <div className="flex gap-1.5 mt-2">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={`flex-1 h-1.5 rounded-full ${n <= stage ? "bg-brand-600" : "bg-brand-200"}`} />
                  ))}
                </div>
                <div className="text-[11px] text-brand-700 mt-1.5">
                  {history.length} of 3 visits used for {product}.
                </div>
              </div>
            )
          ) : (
            <div className="rounded-2xl bg-danger-bg border border-danger-fg/20 px-3.5 py-3 flex items-start gap-2">
              <AlertCircle size={15} className="text-danger-fg shrink-0 mt-0.5" />
              <div className="text-[12px] text-danger-fg">{check.reason}</div>
            </div>
          )}

          {/* What was discussed (rule 8) */}
          <div>
            <div className="text-[12px] font-bold text-slate-500 mb-2">What was discussed?</div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setBrochure((b) => !b)}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${brochure ? "bg-brand-50 border-brand-300" : "bg-white border-slate-200"}`}
              >
                <BookOpen size={17} className={brochure ? "text-brand-700" : "text-slate-400"} />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-slate-800">A · Brochure / Catalog</div>
                  <div className="text-[11px] text-slate-400">Product literature shared</div>
                </div>
                {brochure && <CheckCircle2 size={17} className="text-brand-700" />}
              </button>

              <button
                onClick={() =>
                  (stage >= 2 && !check.isFollowup)
                    ? toast("Demonstration is mandatory from visit 2")
                    : setDemo((d) => !d)
                }
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${demo ? "bg-brand-50 border-brand-300" : "bg-white border-slate-200"}`}
              >
                <MonitorPlay size={17} className={demo ? "text-brand-700" : "text-slate-400"} />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-slate-800">
                    B · Product Demonstration
                    {!check.isFollowup && (
                      <span className="text-[10px] font-bold text-danger-fg ml-1.5">MANDATORY</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {check.isFollowup
                      ? "Optional on a follow up, they already use the product"
                      : "Required from the second visit onwards"}
                  </div>
                </div>
                {demo && <CheckCircle2 size={17} className="text-brand-700" />}
              </button>
            </div>
          </div>

          {/* Outcome — only on visit 3 */}
          {stage === 3 && (
            <div>
              <div className="text-[12px] font-bold text-slate-500 mb-2">Final Outcome (required)</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "Refused", icon: Ban },
                  { v: "Will Buy", icon: ShoppingCart },
                  { v: "Sample Requested", icon: FlaskConical },
                ].map(({ v, icon: Icon }) => (
                  <button
                    key={v}
                    onClick={() => setOutcome(v)}
                    className={`rounded-xl border px-2 py-2.5 flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
                      outcome === v ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    <Icon size={16} />
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Textarea label="Notes / Competitor Activity" rows={3} placeholder="Doctor feedback, competitor products seen…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="shrink-0 p-4 border-t border-slate-200 bg-white flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={() => toast("Draft saved")}>Save Draft</Button>
          <Button variant="success" className="flex-1" disabled={!check.allowed} onClick={submit}>
            Complete Visit
          </Button>
        </div>
      </div>
    </PhoneFrame>
  );
}
