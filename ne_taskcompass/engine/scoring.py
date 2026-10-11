import math
from calendar import monthrange
from datetime import date

import frappe
from frappe.utils import flt, getdate


def weeks_per_month():
	try:
		return int(frappe.db.get_single_value("TC Settings", "weeks_per_month") or 4)
	except Exception:
		return 4


def score_floor():
	try:
		return int(frappe.db.get_single_value("TC Settings", "score_floor") or 30)
	except Exception:
		return 30


def weekly_from_monthly(monthly_qty):
	return math.ceil((flt(monthly_qty) or 0) / weeks_per_month())


def achievement_pct(lines):
	target = sum(flt(l.get("target") or l.get("target_qty")) for l in lines)
	achieved = sum(flt(l.get("achieved") or l.get("achieved_qty")) for l in lines)
	if target <= 0:
		return 0
	return min(100, round((achieved / target) * 100))


def followup_trend(sales, window_months=6):
	ordered = sorted(
		sales or [],
		key=lambda r: (int(r.get("year") or 0), int(r.get("month") or 0)),
	)[-window_months:]
	if len(ordered) < 2:
		return {
			"direction": "unknown",
			"change_pct": 0,
			"points": 0,
			"ours": 0,
			"share": 0,
			"note": "Not enough months of sales recorded to judge a trend yet.",
		}

	mid = len(ordered) // 2

	def avg(rows):
		return (sum(flt(r.get("qty")) for r in rows) / len(rows)) if rows else 0

	earlier = avg(ordered[:mid])
	recent = avg(ordered[mid:])
	ours = sum(flt(r.get("qty")) for r in ordered)
	theirs = sum(flt(r.get("competitor_qty")) for r in ordered)
	share = round((ours / (ours + theirs)) * 100) if ours + theirs > 0 else 0
	if earlier == 0:
		change_pct = 100 if recent > 0 else 0
	else:
		change_pct = round(((recent - earlier) / earlier) * 100)

	if change_pct >= 10:
		direction = "up"
	elif change_pct <= -10:
		direction = "down"
	else:
		direction = "flat"

	points = max(-12, min(12, round(change_pct / 5)))
	if direction == "up":
		note = f"Volume is up {change_pct}% across the last {len(ordered)} months."
	elif direction == "down":
		note = f"Volume is down {abs(change_pct)}%. The competitor is gaining here."
	else:
		note = "Volume is steady. Holding share but not growing it."
	return {
		"direction": direction,
		"change_pct": change_pct,
		"points": points,
		"ours": ours,
		"theirs": theirs,
		"share": share,
		"months": len(ordered),
		"note": note,
	}


def score_from_parts(achieved_pct=0, events=None, followup_points=0):
	conduct = sum(int(e.get("points") or 0) for e in (events or []))
	base = round(flt(achieved_pct) * 0.7 + score_floor())
	return max(0, min(100, base + conduct + int(followup_points or 0)))


def band_for(score):
	if score >= 85:
		return {"label": "Excellent", "key": "excellent"}
	if score >= 70:
		return {"label": "On Track", "key": "on_track"}
	if score >= 50:
		return {"label": "Needs Push", "key": "needs_push"}
	return {"label": "At Risk", "key": "at_risk"}


def salesperson_score(salesperson, year, month):
	targets = frappe.get_all(
		"TC Monthly Target",
		filters={"salesperson": salesperson, "year": year, "month": month},
		fields=["product", "target_qty"],
	)
	achieved_rows = frappe.get_all(
		"TC Weekly Achievement",
		filters={"salesperson": salesperson, "year": year, "month": month},
		fields=["product", "achieved_qty"],
	)
	achieved_by_product = {}
	for row in achieved_rows:
		achieved_by_product[row.product] = achieved_by_product.get(row.product, 0) + (row.achieved_qty or 0)
	lines = [
		{"product": t.product, "target": t.target_qty, "achieved": achieved_by_product.get(t.product, 0)}
		for t in targets
	]
	pct = achievement_pct(lines)
	events = frappe.get_all(
		"TC Performance Event",
		filters={"salesperson": salesperson, "event_date": ["between", [f"{year}-{month:02d}-01", f"{year}-{month:02d}-31"]]},
		fields=["points"],
	)
	followups = frappe.get_all(
		"TC Follow Up",
		filters={"assigned_to": salesperson, "status": "Active"},
		fields=["doctor", "product"],
	)
	fu_points = 0
	for fu in followups:
		sales = frappe.get_all(
			"TC Doctor Monthly Sales",
			filters={"doctor": fu.doctor, "product": fu.product},
			fields=["year", "month", "qty", "competitor_qty"],
		)
		fu_points += followup_trend(sales).get("points") or 0
	score = score_from_parts(pct, events, fu_points)
	return {
		"salesperson": salesperson,
		"year": year,
		"month": month,
		"achieved_pct": pct,
		"score": score,
		"band": band_for(score),
		"lines": lines,
		"followup_points": fu_points,
	}


def calendar_months_back(count, from_date=None):
	"""Newest-first list of (year, month) calendar months."""
	today = getdate(from_date) if from_date else getdate()
	out = []
	year, month = today.year, today.month
	for _ in range(int(count or 1)):
		out.append((year, month))
		month -= 1
		if month < 1:
			month = 12
			year -= 1
	return out


def team_score_history(people, months=12):
	"""Calendar-month scores for every salesperson. One bulk read, no rolling windows."""
	people = [sp for sp in (people or []) if sp]
	periods = calendar_months_back(months)
	if not people or not periods:
		return []
	newest_y, newest_m = periods[0]
	oldest_y, oldest_m = periods[-1]
	start = date(oldest_y, oldest_m, 1)
	end = date(newest_y, newest_m, monthrange(newest_y, newest_m)[1])
	period_set = set(periods)

	targets = frappe.get_all(
		"TC Monthly Target",
		filters={"salesperson": ["in", people]},
		fields=["salesperson", "year", "month", "product", "target_qty"],
	)
	achieved_rows = frappe.get_all(
		"TC Weekly Achievement",
		filters={"salesperson": ["in", people]},
		fields=["salesperson", "year", "month", "product", "achieved_qty"],
	)
	events = frappe.get_all(
		"TC Performance Event",
		filters={"salesperson": ["in", people], "event_date": ["between", [start, end]]},
		fields=["salesperson", "event_date", "points"],
	)
	followups = frappe.get_all(
		"TC Follow Up",
		filters={"assigned_to": ["in", people], "status": "Active"},
		fields=["assigned_to", "doctor", "product"],
	)
	fu_pairs = {(f.doctor, f.product) for f in followups if f.doctor and f.product}
	sales = []
	if fu_pairs:
		sales = frappe.get_all(
			"TC Doctor Monthly Sales",
			filters={"doctor": ["in", list({p[0] for p in fu_pairs})]},
			fields=["doctor", "product", "year", "month", "qty", "competitor_qty"],
		)
	sales_by_pair = {}
	for row in sales:
		key = (row.doctor, row.product)
		if key not in fu_pairs:
			continue
		sales_by_pair.setdefault(key, []).append(row)

	fu_points_by_sp = {sp: 0 for sp in people}
	for fu in followups:
		fu_points_by_sp[fu.assigned_to] = fu_points_by_sp.get(fu.assigned_to, 0) + (
			followup_trend(sales_by_pair.get((fu.doctor, fu.product), [])).get("points") or 0
		)

	lines_by = {}
	for t in targets:
		key = (t.salesperson, int(t.year), int(t.month))
		if (key[1], key[2]) not in period_set:
			continue
		lines_by.setdefault(key, {})[t.product] = {"product": t.product, "target": t.target_qty or 0, "achieved": 0}
	for row in achieved_rows:
		key = (row.salesperson, int(row.year), int(row.month))
		bucket = lines_by.get(key)
		if not bucket or row.product not in bucket:
			continue
		bucket[row.product]["achieved"] += row.achieved_qty or 0

	events_by = {}
	for ev in events:
		when = getdate(ev.event_date)
		events_by.setdefault((ev.salesperson, when.year, when.month), []).append({"points": ev.points or 0})

	out = []
	for year, month in periods:
		for sp in people:
			lines = list(lines_by.get((sp, year, month), {}).values())
			pct = achievement_pct(lines)
			month_events = events_by.get((sp, year, month), [])
			fu_points = fu_points_by_sp.get(sp) or 0
			score = score_from_parts(pct, month_events, fu_points) if lines else 0
			out.append(
				{
					"salesperson": sp,
					"year": year,
					"month": month,
					"achieved_pct": pct,
					"score": score,
					"band": band_for(score),
					"lines": lines,
					"followup_points": fu_points,
					"has_data": bool(lines),
				}
			)
	return out
