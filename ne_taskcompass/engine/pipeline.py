import frappe
from frappe.utils import get_datetime, now_datetime

from ne_taskcompass.engine.scoring import followup_trend

STAGES = [
	{"key": "introduced", "label": "Introduced"},
	{"key": "demonstrated", "label": "Demonstrated"},
	{"key": "sample", "label": "Sample requested"},
	{"key": "trial", "label": "Trial running"},
	{"key": "evaluated", "label": "Evaluated"},
	{"key": "ordering", "label": "Ordering"},
	{"key": "growing", "label": "Growing"},
	{"key": "tender", "label": "Tender"},
]

LOST = {"key": "lost", "label": "Lost"}
AT_RISK = {"key": "at_risk", "label": "At risk"}

STALL_DAYS = {
	"introduced": 21,
	"demonstrated": 21,
	"sample": 14,
	"trial": 30,
	"evaluated": 30,
	"ordering": 60,
	"growing": 90,
	"tender": 30,
}


def days_since(value, now=None):
	if not value:
		return None
	now = now or now_datetime()
	dt = get_datetime(value)
	return max(0, int((now - dt).total_seconds() // 86400))


def derive_stage(visits=None, sample_orders=None, sales=None, trend=None, now=None):
	visits = visits or []
	sample_orders = sample_orders or []
	sales = sales or []
	standard = [v for v in visits if not v.get("is_followup")]
	bought = any((s.get("qty") or 0) > 0 for s in sales)
	refused = any(v.get("outcome") == "Refused" for v in visits)

	if bought:
		latest = sorted(sales, key=lambda s: (s.get("year") or 0, s.get("month") or 0))[-1]
		since = f"{latest.get('year')}-{int(latest.get('month') or 1):02d}-01"
		if trend and trend.get("direction") == "down":
			return {"stage": AT_RISK["key"], "label": AT_RISK["label"], "since": since, "is_lost": False, "at_risk": True}
		if trend and trend.get("direction") == "up":
			return {"stage": "growing", "label": "Growing", "since": since, "is_lost": False, "at_risk": False}
		return {"stage": "ordering", "label": "Ordering", "since": since, "is_lost": False, "at_risk": False}

	if refused:
		v = next(x for x in visits if x.get("outcome") == "Refused")
		return {
			"stage": LOST["key"],
			"label": LOST["label"],
			"since": v.get("visited_at"),
			"is_lost": True,
			"reason": "Refused on a visit",
		}

	reviewed = next((s for s in sample_orders if s.get("review_text") or s.get("stamped_document")), None)
	if reviewed:
		return {
			"stage": "evaluated",
			"label": "Evaluated",
			"since": reviewed.get("modified") or reviewed.get("creation"),
			"is_lost": False,
		}

	issued = next((s for s in sample_orders if s.get("status") in ("Approved", "Delivered")), None)
	if issued:
		return {
			"stage": "trial",
			"label": "Trial running",
			"since": issued.get("reviewed_at") or issued.get("creation"),
			"is_lost": False,
		}

	asked = any(v.get("outcome") == "Sample Requested" for v in visits)
	if sample_orders or asked:
		since = (sample_orders[0].get("creation") if sample_orders else None) or next(
			(v.get("visited_at") for v in visits if v.get("outcome") == "Sample Requested"), None
		)
		return {"stage": "sample", "label": "Sample requested", "since": since, "is_lost": False}

	demoed = next((v for v in standard if v.get("did_demonstration")), None)
	if demoed:
		return {
			"stage": "demonstrated",
			"label": "Demonstrated",
			"since": demoed.get("visited_at"),
			"is_lost": False,
		}

	if standard:
		if len(standard) >= 3:
			return {
				"stage": LOST["key"],
				"label": LOST["label"],
				"is_lost": True,
				"since": standard[0].get("visited_at"),
				"reason": "Three visits spent with no outcome",
			}
		return {
			"stage": "introduced",
			"label": "Introduced",
			"since": standard[0].get("visited_at"),
			"is_lost": False,
		}

	return None


def opportunity_value(product, sample_orders):
	price = frappe.db.get_value("TC Product", product, "unit_price") if product else None
	if not price:
		return None
	consumption = 0
	for order in sample_orders or []:
		consumption = max(consumption, order.get("expected_consumption_pm") or 0)
	if not consumption:
		return None
	return float(price) * consumption


def build_pipeline(filters=None):
	"""Return derived opportunities keyed by doctor+product, plus tender stages."""
	filters = filters or {}
	salesperson = filters.get("salesperson")
	doctor_filters = {}
	if salesperson:
		doctor_filters["assigned_to"] = salesperson
	if filters.get("status"):
		doctor_filters["status"] = filters["status"]
	else:
		doctor_filters["status"] = "Approved"

	doctors = frappe.get_all(
		"TC Doctor",
		filters=doctor_filters or None,
		fields=["name", "doctor_name", "assigned_to", "hospital", "person_type"],
	)
	doctor_names = [d.name for d in doctors]
	if not doctor_names and not salesperson:
		doctor_names = []

	visit_filters = {"is_followup": 0}
	if doctor_names:
		visit_filters["doctor"] = ["in", doctor_names]
	visits = frappe.get_all(
		"TC Visit",
		filters=visit_filters,
		fields=[
			"name",
			"doctor",
			"product",
			"visit_number",
			"is_followup",
			"did_demonstration",
			"outcome",
			"visited_at",
		],
		order_by="visited_at asc",
	) if doctor_names else []

	samples = (
		frappe.get_all(
			"TC Sample Order",
			filters={"doctor": ["in", doctor_names]},
			fields=[
				"name",
				"doctor",
				"product",
				"status",
				"review_text",
				"stamped_document",
				"expected_consumption_pm",
				"reviewed_at",
				"creation",
				"modified",
			],
		)
		if doctor_names
		else []
	)
	sales = (
		frappe.get_all(
			"TC Doctor Monthly Sales",
			filters={"doctor": ["in", doctor_names]},
			fields=["doctor", "product", "year", "month", "qty", "competitor_qty"],
		)
		if doctor_names
		else []
	)

	pairs = set()
	for row in visits + samples + sales:
		if row.get("doctor") and row.get("product"):
			pairs.add((row["doctor"], row["product"]))

	doctor_map = {d.name: d for d in doctors}
	opps = []
	for doctor, product in sorted(pairs):
		v = [r for r in visits if r.doctor == doctor and r.product == product]
		s = [r for r in samples if r.doctor == doctor and r.product == product]
		sl = [r for r in sales if r.doctor == doctor and r.product == product]
		trend = followup_trend(sl)
		derived = derive_stage(v, s, sl, trend)
		if not derived:
			continue
		stall = days_since(derived.get("since"))
		stalled = bool(stall is not None and stall > STALL_DAYS.get(derived["stage"], 9999))
		doc = doctor_map.get(doctor) or {}
		opps.append(
			{
				"doctor": doctor,
				"doctor_name": doc.get("doctor_name") if isinstance(doc, dict) else getattr(doc, "doctor_name", None),
				"assigned_to": doc.get("assigned_to") if isinstance(doc, dict) else getattr(doc, "assigned_to", None),
				"hospital": doc.get("hospital") if isinstance(doc, dict) else getattr(doc, "hospital", None),
				"product": product,
				"value": opportunity_value(product, s),
				"stalled": stalled,
				"stall_days": stall,
				**derived,
			}
		)

	tender_filters = {}
	if salesperson:
		tender_filters["lead"] = salesperson
	tenders = frappe.get_all(
		"TC Tender",
		filters=tender_filters or None,
		fields=["name", "title", "hospital", "champion_doctor", "lead", "stage", "value", "modified"],
	)
	for t in tenders:
		if t.stage == "Lost":
			stage, label, is_lost = "lost", "Lost", True
		else:
			stage, label, is_lost = "tender", "Tender", False
		opps.append(
			{
				"doctor": t.champion_doctor,
				"doctor_name": t.title,
				"assigned_to": t.lead,
				"hospital": t.hospital,
				"product": None,
				"tender": t.name,
				"stage": stage,
				"label": label,
				"since": t.modified,
				"is_lost": is_lost,
				"at_risk": False,
				"value": t.value,
				"stalled": False,
			}
		)
	return opps
