import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Repeat, TrendingUp, TrendingDown, Minus, Info, CheckCircle2, AlertCircle,
} from "lucide-react";
import PhoneFrame from "../../components/mobile/PhoneFrame.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Textarea } from "../../components/ui/Field.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { salesperson } from "../../data/neData.js";
import { followupTrend, currentPeriod, MONTH_NAMES } from "../../lib/performance.js";

/** Why a surgeon has not switched more of their list across. */
const OBSTACLES = [
  "Price",
  "Habit or preference",
  "Hospital stock or procurement",
  "Clinical concern",
  "Competitor relationship",
  "No obstacle, growing",
];

/**
 * Logging a follow up visit.
 *
 * This is deliberately not the standard visit screen. That one walks a doctor
 * through introduction, demonstration and close, which is the wrong shape here:
 * the surgeon has already adopted the product. The only questions that matter on
 * a follow up are how much they used since last time, how much the competitor
 * took, what is stopping them moving more across, and what happens next.
 *
 * Capturing the two usage figures here is also what makes the whole feature
 * work. Without them every trend reads "no data recorded", and the rep standing
 * in the room is the only person who can answer.
 */
export default function FollowupVisit() {
  const { id } = useParams();          // follow up assignment id
  const navigate = useNavigate();
  const toast = useToast();
  const { mobileUser } = useSession();
  const me = mobileUser || salesperson;

  const {
    followups, doctors, salesForDoctor, logVisit, recordDoctorSales, visits,
  } = useData();

  const assignment = followups.find((f) => f.id === id);
  const doctor = doctors.find((d) => d.id === assignment?.doctorId);

  const period = currentPeriod();
  const [ourUnits, setOurUnits] = useState("");
  const [obstacle, setObstacle] = useState("");
  const [discussed, setDiscussed] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [busy, setBusy] = useState(false);

  const history = useMemo(() => {
    if (!assignment) return [];
    return salesForDoctor(assignment.doctorId)
      .map((p) => ({
        year: p.year, month: p.month,
        qty: p.lines.filter((l) => l.productId === assignment.productId).reduce((n, l) => n + l.qty, 0),
        competitorQty: p.lines.filter((l) => l.productId === assignment.productId)
          .reduce((n, l) => n + l.competitorQty, 0),
        has: p.lines.some((l) => l.productId === assignment.productId),
      }))
      .filter((p) => p.has);
  }, [assignment, salesForDoctor]);

  const trend = useMemo(() => followupTrend(history), [history]);
  const lastMonth = history[history.length - 1];
  const roundsDone = assignment
    ? visits.filter((v) => v.doctorId === assignment.doctorId && v.product === assignment.product && v.isFollowup).length
    : 0;

  if (!assignment || !doctor) {
    return (
      <PhoneFrame>
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div>
            <AlertCircle size={26} className="mx-auto mb-2 text-slate-300" />
            <div className="text-[13px] text-slate-500">
              That follow up is no longer assigned to you.
            </div>
            <Button variant="ghost" className="mt-3" onClick={() => navigate("/mobile/followups")}>
              Back to follow ups
            </Button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const ours = Number(ourUnits);
  const valid = ourUnits !== "" && ours >= 0 && obstacle;

  async function submit() {
    if (!valid) return toast("Enter our units and pick what is holding them back.");
    setBusy(true);

    // The visit itself, marked as a follow up so it does not consume the cap.
    const res = await logVisit({
      doctorId: doctor.id,
      product: assignment.product,
      brochure: false,
      demo: false,
      notes: [
        `Follow up ${roundsDone + 1}`,
        `Used ${ours} of ours`,
        obstacle ? `Obstacle: ${obstacle}` : "",
        discussed, nextAction ? `Next: ${nextAction}` : "",
      ].filter(Boolean).join(". "),
    });

    if (!res.ok) { setBusy(false); return toast(res.error); }

    // The usage figures, which are what the trend is actually measured from.
    await recordDoctorSales(doctor.id, {
      year: period.year, month: period.month,
      productId: assignment.productId, qty: ours,
    });

    setBusy(false);
    toast(`Follow up ${roundsDone + 1} logged for ${doctor.name}.`);
    navigate("/mobile/followups");
  }

  const TrendIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;

  return (
    <PhoneFrame>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0">
        <button onClick={() => navigate("/mobile/followups")} className="text-slate-400 p-1 -ml-1">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-slate-800 truncate">Follow up visit</div>
          <div className="text-[11.5px] text-slate-500 truncate">{doctor.name}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
        {/* Where this account stands */}
        <Card padding="p-3" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold text-slate-800 truncate">{assignment.product}</div>
              <div className="text-[11.5px] text-slate-500 truncate">
                against {assignment.competitor || "a competitor"}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 shrink-0">
              <Repeat size={11} /> visit {roundsDone + 1}
            </span>
          </div>
          {history.length > 0 ? (
            <div className="flex items-center gap-2 text-[11.5px] pt-1.5 border-t border-slate-100">
              <TrendIcon size={13} className={
                trend.direction === "up" ? "text-success-fg"
                : trend.direction === "down" ? "text-danger-fg" : "text-slate-400"} />
              <span className="text-slate-600">
                We hold <b>{trend.share}%</b>
                {lastMonth && <>, last recorded {lastMonth.qty} ours to {lastMonth.competitorQty} theirs</>}
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 pt-1.5 border-t border-slate-100">
              No usage recorded yet. What you enter below becomes the first data point.
            </div>
          )}
          {assignment.targetShare && (
            <div className="text-[11px] text-brand-700">
              Office target: win {assignment.targetShare}% of this doctor's usage.
            </div>
          )}
        </Card>

        <div className="flex gap-2 text-[11.5px] text-brand-800 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 leading-relaxed">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            No brochure or demonstration needed here, they already use it. What matters is the
            usage split and what is stopping them moving more across.
          </span>
        </div>

        {/* Usage since last visit */}
        <div>
          <div className="text-[12px] font-bold text-slate-500 mb-2">
            Usage in {MONTH_NAMES[period.month - 1]}
          </div>
          <Input label="Our units *" type="number" min="0"
            value={ourUnits} onChange={(e) => setOurUnits(e.target.value)} />
        </div>

        {/* Obstacle */}
        <div>
          <div className="text-[12px] font-bold text-slate-500 mb-2">
            What is holding them back? *
          </div>
          <div className="flex flex-wrap gap-1.5">
            {OBSTACLES.map((o) => (
              <button key={o} onClick={() => setObstacle(o)}
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition ${
                  obstacle === o
                    ? "bg-slate-800 border-slate-800 text-white"
                    : "bg-white border-slate-200 text-slate-600"}`}>
                {obstacle === o && <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" />}
                {o}
              </button>
            ))}
          </div>
        </div>

        <Textarea label="What was discussed" rows={3}
          placeholder="e.g. Showed the cost per case comparison, he wants to trial on 2 spinal lists"
          value={discussed} onChange={(e) => setDiscussed(e.target.value)} />

        <Input label="Next action"
          placeholder="e.g. Bring pricing sheet for procurement in 2 weeks"
          value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
      </div>

      <div className="p-4 border-t border-slate-100 shrink-0">
        <Button size="lg" className="w-full" onClick={submit} disabled={busy || !valid}>
          {busy ? "Saving…" : `Log follow up visit ${roundsDone + 1}`}
        </Button>
        {!valid && (
          <div className="text-[11px] text-slate-400 text-center mt-1.5">
            Our units and an obstacle are required.
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
