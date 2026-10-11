// Scoring and period maths, kept as pure functions so the rules can be reasoned
// about and tested without a database or a React tree.

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The last `count` months, newest first, as { year, month, key, label }. */
export function recentMonths(count = 12, from = new Date()) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    out.push({
      year, month,
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: `${MONTH_SHORT[month - 1]} ${year}`,
      longLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      isCurrent: i === 0,
    });
  }
  return out;
}

export function periodKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function currentPeriod(from = new Date()) {
  return { year: from.getFullYear(), month: from.getMonth() + 1 };
}

/**
 * A weekly target is the monthly figure split across the weeks of the month.
 *
 * The client describes this as "monthly divided by four". Kept as a named
 * function rather than a bare `/ 4` so that when someone points out February
 * and a 31 day month are not both four weeks, there is one place to change it.
 * Rounding is up, because a target the team can never quite reach by rounding
 * down is worse than one that is a fraction ambitious.
 */
export const WEEKS_PER_MONTH = 4;

export function weeklyFromMonthly(monthlyQty) {
  return Math.ceil((Number(monthlyQty) || 0) / WEEKS_PER_MONTH);
}

/** Percentage achieved, capped at 100 so one runaway product cannot mask misses. */
export function achievementPct(lines) {
  const target = lines.reduce((n, l) => n + (Number(l.target) || 0), 0);
  const achieved = lines.reduce((n, l) => n + (Number(l.achieved) || 0), 0);
  if (target <= 0) return 0;
  return Math.min(100, Math.round((achieved / target) * 100));
}

// ------------------------------------------------------------ follow ups ----

/**
 * How many visits a rep may log against one doctor.
 *
 * The standard cycle is three: introduce, demonstrate, close. It assumes the
 * doctor either adopts the product or does not, and after three visits there is
 * nothing further to say.
 *
 * That assumption breaks for a surgeon already using our products alongside a
 * competitor's. They have adopted. The job is no longer to convert them, it is
 * to grow the share of their theatre list that runs on our stock, and that takes
 * repeated contact over months. Those visits are marked as follow ups, do not
 * count against the cap, and are judged on whether volume actually moves.
 */
export const STANDARD_VISIT_CAP = 3;

export function visitAllowance(doctor, visitsForDoctor = [], hasAssignment = false) {
  const standard = visitsForDoctor.filter((v) => !v.isFollowup).length;
  const followups = visitsForDoctor.filter((v) => v.isFollowup).length;

  // An assignment settles it regardless of how many visits exist. A brand new
  // assignment has none, and treating that first visit as an introduction is
  // what made the follow up screen unusable: it was rejected for lacking a
  // brochure and a demonstration that the screen never offers.
  if (hasAssignment) {
    return {
      allowed: true,
      kind: "followup",
      visitNumber: Math.min(standard + 1, STANDARD_VISIT_CAP),
      followupRound: followups + 1,
      remaining: Infinity,
      reason:
        `Assigned as a follow up against ${doctor?.competitorNames || "a competitor's product"}. ` +
        `Visit ${followups + 1}, scored on whether monthly volume grows.`,
    };
  }

  if (standard < STANDARD_VISIT_CAP) {
    return {
      allowed: true,
      kind: "standard",
      visitNumber: standard + 1,
      remaining: STANDARD_VISIT_CAP - standard,
      reason: `Visit ${standard + 1} of ${STANDARD_VISIT_CAP} in the standard cycle.`,
    };
  }

  if (doctor?.usesCompetitor) {
    return {
      allowed: true,
      kind: "followup",
      visitNumber: STANDARD_VISIT_CAP,
      followupRound: followups + 1,
      remaining: Infinity,
      reason:
        `The three visit cycle is complete, but this surgeon also uses ` +
        `${doctor.competitorNames || "a competitor's products"}. Follow up visit ` +
        `${followups + 1}, scored on whether their monthly volume grows.`,
    };
  }

  return {
    allowed: false,
    kind: "blocked",
    remaining: 0,
    reason:
      `All ${STANDARD_VISIT_CAP} visits are used and this doctor is not marked as ` +
      `using a competitor's products. If they are, ask the office to flag them so ` +
      `follow up visits open up.`,
  };
}

/**
 * Judge a follow up relationship by what actually changed in the order book.
 *
 * Comparing the most recent month against the one before it would swing wildly
 * on a single quiet month, so this compares the average of the recent half of
 * the window against the average of the earlier half. A surgeon whose volume is
 * genuinely climbing shows up; one who had a single busy theatre week does not.
 *
 * `sales` is [{ year, month, qty, competitorQty }] in any order.
 */
export function followupTrend(sales = [], windowMonths = 6) {
  const ordered = [...sales]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-windowMonths);

  if (ordered.length < 2) {
    return { direction: "unknown", changePct: 0, points: 0, ours: 0, share: 0,
      note: "Not enough months of sales recorded to judge a trend yet." };
  }

  const mid = Math.floor(ordered.length / 2);
  const avg = (rows) => (rows.length ? rows.reduce((n, r) => n + (Number(r.qty) || 0), 0) / rows.length : 0);
  const earlier = avg(ordered.slice(0, mid));
  const recent = avg(ordered.slice(mid));

  const ours = ordered.reduce((n, r) => n + (Number(r.qty) || 0), 0);
  const theirs = ordered.reduce((n, r) => n + (Number(r.competitorQty) || 0), 0);
  const share = ours + theirs > 0 ? Math.round((ours / (ours + theirs)) * 100) : 0;

  // A doctor going from nothing to something is a win, but dividing by zero is
  // not a percentage. Treat it as a full step up.
  const changePct =
    earlier === 0
      ? (recent > 0 ? 100 : 0)
      : Math.round(((recent - earlier) / earlier) * 100);

  let direction = "flat";
  if (changePct >= 10) direction = "up";
  else if (changePct <= -10) direction = "down";

  // Scaled so a strong grower earns roughly what a missed visit costs, keeping
  // follow up work worth doing without letting it dominate the score.
  const points = Math.max(-12, Math.min(12, Math.round(changePct / 5)));

  const note =
    direction === "up"
      ? `Volume is up ${changePct}% across the last ${ordered.length} months. Follow ups are working, keep going.`
      : direction === "down"
      ? `Volume is down ${Math.abs(changePct)}%. The competitor is gaining here, worth understanding why.`
      : `Volume is steady. Holding share but not growing it.`;

  return { direction, changePct, points, ours, theirs, share, months: ordered.length, note };
}

/**
 * What must have happened on a visit for it to be loggable.
 *
 * Lives here rather than inside the context so it can be tested without a React
 * tree. It has now broken twice by having a rule that belongs to the
 * introduction cycle applied to follow ups as well, so the follow up exit is the
 * first line and everything after it is unambiguously cycle-only.
 */
export function validateDiscussion({ visitNumber, brochure, demo, isFollowup }) {
  // A follow up surgeon already uses the product. There is nothing to introduce
  // with a brochure and nothing to demonstrate. The follow up screen asks its
  // own required questions instead: usage split and obstacle.
  if (isFollowup) return null;

  if (!brochure && !demo) return "Select at least one: brochure/catalog or product demonstration.";
  if (visitNumber >= 2 && !demo) {
    return "Product demonstration is mandatory from the second visit onwards.";
  }
  return null;
}

/** Overall score out of 100, blending target achievement with conduct events. */
export function scoreFromParts({ achievedPct = 0, events = [], followupPoints = 0 }) {
  const conduct = events.reduce((n, e) => n + (Number(e.points) || 0), 0);
  // 70% of the score is hitting numbers, 30% is how the work was done. Follow up
  // movement rides on top, since it reflects effort the weekly target misses.
  const base = Math.round(achievedPct * 0.7 + 30);
  return Math.max(0, Math.min(100, base + conduct + followupPoints));
}

export function bandFor(score) {
  const n = Number(score) || 0;
  if (n >= 85) return { label: "Excellent", tone: "text-success-fg", bg: "bg-success-bg", ring: "#12805c" };
  if (n >= 70) return { label: "On Track", tone: "text-brand-700", bg: "bg-brand-50", ring: "#0f6f8c" };
  if (n >= 50) return { label: "Needs Push", tone: "text-warning-fg", bg: "bg-warning-bg", ring: "#b45309" };
  return { label: "At Risk", tone: "text-danger-fg", bg: "bg-danger-bg", ring: "#b3261e" };
}
