import { useMemo, useState, Component } from "react";
import {
  MapPin, Phone, Mail, Clock, Building2, Pencil, Trash2, Info, ShieldCheck, AlertTriangle,
  Repeat, TrendingUp, TrendingDown, Minus, BarChart3,
} from "lucide-react";
import { useData } from "../../context/DataContext.jsx";
import { MONTH_SHORT } from "../../lib/performance.js";

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY = DAY_ORDER[(new Date().getDay() + 6) % 7]; // JS weeks start on Sunday

const TYPE_TONE = {
  HOD: "bg-brand-50 text-brand-700 border-brand-200",
  Professor: "bg-success-bg text-success-fg border-success-fg/20",
  "OT Incharge": "bg-amber-50 text-amber-700 border-amber-200",
  Unclassified: "bg-slate-100 text-slate-500 border-slate-200",
};

/** Colour from the name, so the same doctor always gets the same placeholder. */
function tint(name = "") {
  const hues = ["#0e7490", "#4338ca", "#b45309", "#15803d", "#9d174d", "#7c3aed"];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return hues[sum % hues.length];
}

function initials(name = "") {
  return name
    .replace(/^(Prof\.?|Dr\.?|Assoc\.?|Asst\.?|Assist\.?|Associate|Assistant|Professor)\s*/gi, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ doctor, size = 72 }) {
  const [broken, setBroken] = useState(false);
  const showImage = doctor.imageUrl && !broken;
  return (
    <div
      className="rounded-2xl shrink-0 grid place-items-center overflow-hidden font-extrabold text-white"
      style={{ width: size, height: size, background: tint(doctor.name), fontSize: size / 3 }}
    >
      {showImage ? (
        <img
          src={doctor.imageUrl}
          alt={doctor.name}
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
          loading="lazy"
        />
      ) : (
        initials(doctor.name)
      )}
    </div>
  );
}

function Row({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 text-[12.5px] text-slate-600">
      {typeof Icon === "function" ? <Icon size={14} className="shrink-0 mt-0.5 text-slate-400" /> : null}
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

/**
 * One doctor, shown the same way in the management portal and on a rep's phone.
 *
 * `mode` decides what the footer offers:
 *   "admin" gives edit and delete, applied immediately
 *   "field" gives "suggest a correction", which an admin has to approve
 *   "view"  gives nothing
 */
function callMaybe(fn, ...args) {
  try {
    if (typeof fn === "function") return fn(...args);
  } catch {
    return undefined;
  }
  return undefined;
}

function DoctorProfileInner({ doctor, mode = "view", onEdit, onDelete, onSuggest }) {
  const ctx = useData() || {};
  const followups = Array.isArray(ctx.followups) ? ctx.followups : [];
  const scheduleRows = Array.isArray(ctx.schedules) ? ctx.schedules : [];

  const myFollowups = useMemo(
    () => followups.filter((f) => f.doctorId === doctor.id && f.status === "active"),
    [followups, doctor.id]
  );

  const grouped = useMemo(() => {
    const fromHelper = callMaybe(ctx.schedulesFor, doctor.id);
    if (Array.isArray(fromHelper) && fromHelper.length) {
      return fromHelper.map((g) => ({
        hospital: g.hospital || "Hospital",
        slots: Array.isArray(g.slots) ? g.slots : [],
      }));
    }
    const groups = {};
    scheduleRows
      .filter((s) => s.doctor === doctor.id)
      .forEach((s) => {
        const hospital = s.hospital || "Hospital";
        groups[hospital] = groups[hospital] || { hospital, slots: [] };
        groups[hospital].slots.push({
          day: s.day_of_week,
          start: s.start_time,
          end: s.end_time,
          source: s.source,
        });
      });
    return Object.values(groups);
  }, [ctx.schedulesFor, scheduleRows, doctor.id]);

  const sales = useMemo(() => {
    const rows = callMaybe(ctx.salesForDoctor, doctor.id);
    return Array.isArray(rows) ? rows : [];
  }, [ctx.salesForDoctor, doctor.id]);

  const trend = useMemo(() => {
    const t = callMaybe(ctx.followupTrendFor, doctor.id);
    return t && typeof t === "object"
      ? t
      : { direction: "unknown", share: 0, changePct: 0, note: "" };
  }, [ctx.followupTrendFor, doctor.id]);

  const permission = useMemo(() => {
    const p = callMaybe(ctx.visitPermission, doctor.id);
    return p && typeof p === "object"
      ? p
      : { allowed: true, kind: "standard", reason: "" };
  }, [ctx.visitPermission, doctor.id]);

  const maxSale = Math.max(1, ...sales.map((s) => (Number(s.qty) || 0) + (Number(s.competitorQty) || 0)));

  const totalSlots = grouped.reduce((n, g) => n + (g.slots || []).length, 0);
  const todaySlots = grouped.flatMap((g) =>
    (g.slots || []).filter((s) => s.day === TODAY).map((s) => ({ ...s, hospital: g.hospital }))
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Identity */}
      <div className="flex gap-3.5">
        <Avatar doctor={doctor} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-800 text-[15px] leading-snug">{doctor.name}</div>
          <div className="text-[12.5px] text-slate-500 mt-0.5">
            {doctor.designation || doctor.specialty || "Surgeon"}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${TYPE_TONE[doctor.personType] || TYPE_TONE.Unclassified}`}>
              {doctor.personType === "Other" && doctor.personTypeOther
                ? `Other · ${doctor.personTypeOther}`
                : (doctor.personType || "Unclassified")}
            </span>
            {doctor.academicRank && (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {doctor.academicRank} Professor
              </span>
            )}
            {doctor.source && doctor.source !== "Manual" && (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                via {doctor.source}
              </span>
            )}
            {doctor.status === "pending" && (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                Awaiting approval
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
        <Row icon={Building2}>
          {(doctor.hospitals || []).length
            ? (doctor.hospitals || []).join(" · ")
            : doctor.hospital}
        </Row>
        <Row icon={MapPin}>{doctor.city}</Row>
        <Row icon={Phone}>{doctor.phone}</Row>
        <Row icon={Mail}>{doctor.email}</Row>
        {doctor.rep && <Row icon={ShieldCheck}>Handled by {doctor.rep}</Row>}
      </div>

      {/* Why this person is typed the way they are */}
      {doctor.hodCandidate && doctor.hodEvidence && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 flex gap-2">
          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11.5px] text-amber-800 leading-relaxed">
            <b>Possibly the department head.</b> The directory profile says:
            <i className="block mt-1">“{doctor.hodEvidence}”</i>
            <span className="block mt-1 text-amber-700">
              Nobody has confirmed this yet, so it is not treated as fact. Check on your next visit.
            </span>
          </div>
        </div>
      )}

      {doctor.personType === "Unclassified" && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 flex gap-2">
          <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
          <div className="text-[11.5px] text-slate-600 leading-relaxed">
            <b>Role not confirmed.</b> The public directory did not say whether this person is a
            department head, a professor or the theatre incharge. Whoever visits them first can set it.
          </div>
        </div>
      )}

      {/* OPD timings */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" />
            OPD Timings
          </div>
          {totalSlots > 0 && (
            <div className="text-[11px] text-slate-400">
              {totalSlots} session{totalSlots === 1 ? "" : "s"} across {grouped.length} hospital
              {grouped.length === 1 ? "" : "s"}
            </div>
          )}
        </div>

        {todaySlots.length > 0 && (
          <div className="mb-2.5 rounded-xl bg-success-bg border border-success-fg/20 px-3 py-2">
            <div className="text-[11px] font-bold text-success-fg mb-1">Available today ({TODAY})</div>
            {todaySlots.map((s, i) => (
              <div key={i} className="text-[11.5px] text-success-fg/90">
                {s.start} to {s.end} · {s.hospital}
              </div>
            ))}
          </div>
        )}

        {grouped.length === 0 ? (
          <div className="text-[11.5px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5 leading-relaxed">
            No timings recorded yet. If you know when this doctor holds OPD, add it so the rest of the
            team can plan around it.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {grouped.map((g) => (
              <div key={g.hospital} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-1.5 text-[11.5px] font-bold text-slate-700 truncate">
                  {g.hospital}
                </div>
                <div className="divide-y divide-slate-100">
                  {g.slots.map((s) => (
                    <div
                      key={s.id || `${s.day}-${s.start}`}
                      className={`flex items-center justify-between px-3 py-1.5 text-[12px] ${
                        s.day === TODAY ? "bg-success-bg/40" : ""
                      }`}
                    >
                      <span className={`font-semibold w-10 ${s.day === TODAY ? "text-success-fg" : "text-slate-600"}`}>
                        {s.day}
                      </span>
                      <span className="text-slate-500 tabular-nums">
                        {s.start} to {s.end}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Which products are on follow up, and against whom */}
      {myFollowups.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-brand-800 mb-1.5">
              <Repeat size={13} /> Follow up on {myFollowups.length} product
              {myFollowups.length === 1 ? "" : "s"}
            </div>
            <div className="flex flex-col gap-1 mb-2">
              {myFollowups.map((f) => (
                <div key={f.id} className="flex items-baseline justify-between gap-2 text-[11.5px]">
                  <span className="font-semibold text-brand-800 truncate">{f.product}</span>
                  <span className="text-brand-700/80 shrink-0 truncate">
                    vs {f.competitor || "a competitor"}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-brand-800/80 leading-relaxed">
              The three visit limit is lifted for these products only. Every other product still
              follows the normal cycle. Success is whether their monthly volume grows.
            </div>
            {trend.direction !== "unknown" && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-brand-200/50">
                {trend.direction === "up" ? <TrendingUp size={14} className="text-success-fg shrink-0" />
                  : trend.direction === "down" ? <TrendingDown size={14} className="text-danger-fg shrink-0" />
                  : <Minus size={14} className="text-slate-400 shrink-0" />}
                <span className={`text-[11.5px] font-semibold ${
                  trend.direction === "up" ? "text-success-fg"
                  : trend.direction === "down" ? "text-danger-fg" : "text-slate-500"}`}>
                  {trend.note}
                </span>
              </div>
            )}
            {trend.share > 0 && (
              <div className="text-[11px] text-brand-700 mt-1.5">
                We hold <b>{trend.share}%</b> of their recorded volume.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visit allowance, so a rep knows before they travel */}
      {mode === "field" && (
        <div className={`rounded-xl px-3 py-2.5 text-[11.5px] leading-relaxed flex gap-2 ${
          !permission.allowed ? "bg-danger-bg text-danger-fg"
          : permission.kind === "followup" ? "bg-success-bg text-success-fg"
          : "bg-slate-50 text-slate-600"}`}>
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>{permission.reason}</span>
        </div>
      )}

      {/* Monthly sales history */}
      {sales.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <div className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <BarChart3 size={13} className="text-slate-400" /> Monthly purchases
          </div>
          <div className="flex items-end gap-1 h-20 mb-1.5">
            {sales.slice(-12).map((s) => (
              <div key={`${s.year}-${s.month}`} className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
                <div className="w-full flex-1 flex flex-col justify-end gap-px">
                  {s.competitorQty > 0 && (
                    <div className="w-full bg-slate-300 rounded-t"
                      style={{ height: `${(s.competitorQty / maxSale) * 100}%` }}
                      title={`Competitor ${s.competitorQty}`} />
                  )}
                  <div className="w-full bg-brand-600 rounded-t"
                    style={{ height: `${(s.qty / maxSale) * 100}%` }}
                    title={`Ours ${s.qty}`} />
                </div>
                <div className="text-[8px] text-slate-400 truncate w-full text-center">
                  {MONTH_SHORT[s.month - 1] || s.month}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10.5px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-brand-600 inline-block" /> Our products
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-slate-300 inline-block" /> Competitor
            </span>
          </div>
        </div>
      )}

      {doctor.notes && (
        <div className="border-t border-slate-100 pt-3">
          <div className="text-[12px] font-bold text-slate-700 mb-1">Notes</div>
          <div className="text-[12px] text-slate-600 leading-relaxed">{doctor.notes}</div>
        </div>
      )}

      {/* Actions */}
      {mode === "admin" && (
        <div className="border-t border-slate-100 pt-3 flex gap-2">
          <button
            onClick={() => onEdit?.(doctor)}
            className="flex-1 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            <Pencil size={13} /> Edit details
          </button>
          <button
            onClick={() => onDelete?.(doctor)}
            className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-xl border border-danger-fg/30 text-danger-fg hover:bg-danger-bg transition"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}

      {mode === "field" && (
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => onSuggest?.(doctor)}
            className="w-full flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            <Pencil size={13} /> Suggest a correction
          </button>
          <div className="text-[11px] text-slate-400 mt-1.5 text-center leading-relaxed">
            Your change goes to the office for approval. Once approved it updates for everyone.
          </div>
        </div>
      )}
    </div>
  );
}

class ProfileErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="text-[13px] text-slate-600 leading-relaxed">
          Could not open this profile. Close and try again, or refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DoctorProfile(props) {
  if (!props.doctor) return null;
  return (
    <ProfileErrorBoundary>
      <DoctorProfileInner {...props} />
    </ProfileErrorBoundary>
  );
}
