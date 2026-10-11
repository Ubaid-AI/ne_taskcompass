import frappe
from frappe.utils import getdate

from ne_taskcompass.api.utils import require_login, require_manager
from ne_taskcompass.engine.people import get_managed_sales_persons
from ne_taskcompass.engine.scoring import salesperson_score, team_score_history


def _managed_people():
	return [
		sp
		for sp in get_managed_sales_persons()
		if not frappe.db.get_value("Sales Person", sp, "is_group")
	]


@frappe.whitelist()
def team_scores(year=None, month=None):
	require_login()
	today = getdate()
	year = int(year or today.year)
	month = int(month or today.month)
	return [salesperson_score(sp, year, month) for sp in _managed_people()]


@frappe.whitelist()
def score_history(months=12):
	"""Calendar-month scores for the last N months (newest first). Used by the portal matrix and charts."""
	require_login()
	return team_score_history(_managed_people(), months=int(months or 12))


@frappe.whitelist()
def add_event(**kwargs):
	require_manager()
	payload = frappe._dict(kwargs)
	doc = frappe.get_doc(
		{
			"doctype": "TC Performance Event",
			"salesperson": payload.salesperson,
			"event_date": payload.event_date or getdate(),
			"kind": payload.kind,
			"points": payload.points,
			"note": payload.note,
		}
	)
	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def list_events(salesperson=None):
	require_login()
	filters = {}
	if salesperson:
		filters["salesperson"] = salesperson
	return frappe.get_all(
		"TC Performance Event",
		filters=filters,
		fields=["name", "salesperson", "event_date", "kind", "points", "note"],
		order_by="event_date desc",
		limit=200,
	)


@frappe.whitelist()
def overview():
	require_login()
	today = getdate()
	plans = frappe.get_all("TC Day Plan", filters={"plan_date": today}, fields=["name"])
	planned = 0
	done = 0
	missed = 0
	for plan in plans:
		doc = frappe.get_doc("TC Day Plan", plan.name)
		for row in doc.items:
			planned += 1
			if row.status == "Done":
				done += 1
			elif row.status == "Missed":
				missed += 1
	return {
		"planned": planned,
		"completed": done,
		"missed": missed,
		"active_reps": len(
			[sp for sp in get_managed_sales_persons() if not frappe.db.get_value("Sales Person", sp, "is_group")]
		),
		"pending_samples": frappe.db.count("TC Sample Order", {"status": "Pending"}),
		"pending_doctors": frappe.db.count("TC Doctor", {"status": "Pending"}),
		"pending_edits": frappe.db.count("TC Doctor Edit Request", {"status": "Pending"}),
	}
