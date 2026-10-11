// The sales pipeline, derived rather than maintained.
//
// The unit is a (doctor, product) opportunity, not a doctor. Sir Zubair does not
// sell "Dr. Zafar Iqbal", he sells Stypcel into Dr. Zafar's theatre list, and the
// same surgeon can be three opportunities at three different stages.
//
// Nothing here is typed by a human. Every stage is read from records the field
// team already creates: visits, sample order forms, sample reviews and monthly
// purchases. That is the entire design. A pipeline someone has to remember to
// update is stale within a fortnight and then quietly lied to for a year.

export const STAGES = [
  { key: "introduced",  label: "Introduced",      hint: "First visit logged, product put in front of them." },
  { key: "demonstrated", label: "Demonstrated",   hint: "Shown the product in person." },
  { key: "sample",      label: "Sample requested", hint: "They asked to try it. A form is with the office." },
  { key: "trial",       label: "Trial running",   hint: "Sample approved and with the surgeon." },
  { key: "evaluated",   label: "Evaluated",       hint: "Stamped review back from the doctor." },
  { key: "ordering",    label: "Ordering",        hint: "Buying it. Recorded purchases exist." },
  { key: "growing",     label: "Growing",         hint: "Volume climbing against the competitor." },
];

export const LOST = { key: "lost", label: "Lost", hint: "Refused, or the cycle ran out with nothing." };
export const AT_RISK = { key: "at_risk", label: "At risk", hint: "Ordering, but volume is falling." };

export const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));

// How long a stage may sit before it is worth someone asking why. These are not
// SLAs, they are conversation prompts: a sample that went out seven weeks ago
// with no review is not a pipeline entry, it is a forgotten box in a theatre.
export const STALL_DAYS = {
  introduced: 21,
  demonstrated: 21,
  sample: 14,
  trial: 30,
  evaluated: 30,
  ordering: 60,
  growing: 90,
};

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysSince(value, now = new Date()) {
  const d = toDate(value);
  if (!d) return null;
  return Math.max(0, Math.floor((now - d) / 86400000));
}

/**
 * Work out where one opportunity stands.
 *
 * Reads latest-wins: the furthest stage any record supports is the stage. A
 * doctor who is already ordering does not regress because someone logged a
 * catch-up visit.
 */
export function deriveStage({
  visits = [],
  sampleOrders = [],
  samples = [],
  sales = [],
  trend = null,
  now = new Date(),
} = {}) {
  const standard = visits.filter((v) => !v.isFollowup);
  const bought = sales.some((s) => (Number(s.qty) || 0) > 0);
  const refused = visits.some((v) => v.outcome === "Refused");

  // Ordering and beyond. Real money outranks every earlier signal.
  if (bought) {
    const latestSale = [...sales].sort((a, b) => a.year - b.year || a.month - b.month).pop();
    const since = latestSale ? new Date(latestSale.year, latestSale.month - 1, 1) : null;
    if (trend?.direction === "down") {
      return { stage: AT_RISK.key, label: AT_RISK.label, since, isLost: false, atRisk: true };
    }
    if (trend?.direction === "up") {
      return { stage: "growing", label: "Growing", since, isLost: false, atRisk: false };
    }
    return { stage: "ordering", label: "Ordering", since, isLost: false, atRisk: false };
  }

  // A refusal only ends it while nothing has been bought. Surgeons say no and
  // change their minds; a purchase is the stronger evidence.
  if (refused) {
    const v = visits.find((x) => x.outcome === "Refused");
    return { stage: LOST.key, label: LOST.label, since: toDate(v?.visitedAt || v?.date), isLost: true, reason: "Refused on a visit" };
  }

  const reviewed = samples.find((s) => s.review);
  if (reviewed) {
    return { stage: "evaluated", label: "Evaluated", since: toDate(reviewed.reviewedAt || reviewed.date), isLost: false };
  }

  const issued = samples.find((s) => ["Approved", "Issued", "Delivered"].includes(s.status));
  if (issued) {
    return { stage: "trial", label: "Trial running", since: toDate(issued.date), isLost: false };
  }

  const orderForm = sampleOrders[0];
  const askedForSample = visits.some((v) => v.outcome === "Sample Requested");
  if (orderForm || askedForSample) {
    const since = toDate(orderForm?.createdAt) ||
      toDate(visits.find((v) => v.outcome === "Sample Requested")?.visitedAt);
    return { stage: "sample", label: "Sample requested", since, isLost: false };
  }

  const demoed = standard.find((v) => v.demo);
  if (demoed) {
    return { stage: "demonstrated", label: "Demonstrated", since: toDate(demoed.visitedAt || demoed.date), isLost: false };
  }

  if (standard.length > 0) {
    // Three visits used, no demo, no sample, no order. The cycle is spent.
    if (standard.length >= 3) {
      return {
        stage: LOST.key, label: LOST.label, isLost: true,
        since: toDate(standard[0].visitedAt || standard[0].date),
        reason: "Three visits used with no outcome",
      };
    }
    return { stage: "introduced", label: "Introduced", since: toDate(standard[0].visitedAt || standard[0].date), isLost: false };
  }

  return null;   // nothing has happened, so there is no opportunity to show
}

/** Add stall detection and value to a derived stage. */
export function describeOpportunity(opportunity, { now = new Date() } = {}) {
  const derived = deriveStage({ ...opportunity, now });
  if (!derived) return null;

  const age = daysSince(derived.since, now);
  const limit = STALL_DAYS[derived.stage];
  const stalled = !derived.isLost && limit != null && age != null && age > limit;

  // Value comes from the surgeon's own stated monthly consumption on the sample
  // order form, times the unit price. If either is missing the value is unknown
  // and is reported as such rather than guessed, because an invented rupee
  // figure in front of a CEO is worse than an empty cell.
  const consumption = opportunity.sampleOrders?.[0]?.expectedConsumption ?? null;
  const price = opportunity.unitPrice ?? null;
  const monthlyValue = consumption != null && price != null ? consumption * price : null;

  return {
    ...derived,
    ageDays: age,
    stalled,
    stallLimit: limit,
    monthlyValue,
    annualValue: monthlyValue == null ? null : monthlyValue * 12,
    valueKnown: monthlyValue != null,
  };
}

/**
 * Conversion between consecutive stages.
 *
 * Counts every opportunity that has ever reached at least stage N, so the
 * figures read as a funnel rather than as a snapshot. An opportunity sitting in
 * Ordering has passed through Trial and still counts toward it.
 */
export function funnel(opportunities) {
  const reached = STAGES.map(() => 0);
  for (const o of opportunities) {
    if (!o) continue;
    const idx = o.stage === AT_RISK.key ? STAGE_INDEX.ordering
      : o.stage === LOST.key ? -1
      : STAGE_INDEX[o.stage];
    if (idx == null || idx < 0) continue;
    for (let i = 0; i <= idx; i++) reached[i] += 1;
  }
  return STAGES.map((s, i) => ({
    ...s,
    reached: reached[i],
    // Drop off from the previous stage, which is where the money leaks.
    conversion: i === 0 || reached[i - 1] === 0
      ? null
      : Math.round((reached[i] / reached[i - 1]) * 100),
  }));
}
