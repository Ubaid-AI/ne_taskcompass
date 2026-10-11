import frappe
from frappe.utils import cint, now_datetime

from ne_taskcompass.api.utils import (
	assert_own_or_manager,
	current_sales_person,
	require_login,
	require_manager,
)
from ne_taskcompass.engine.people import is_tc_manager, resolve_sales_person
from ne_taskcompass.engine.scoring import followup_trend


@frappe.whitelist()
def list_followups(status=None):
	require_login()
	filters = {}
	if status and str(status).lower() not in ("none", "null", "all", ""):
		filters["status"] = status
	rows = frappe.get_all(
		"TC Follow Up",
		filters=filters,
		fields=[
			"name",
			"doctor",
			"product",
			"status",
			"assigned_to",
			"competitor_name",
			"target_share",
			"review_after",
			"reason",
		],
		order_by="modified desc",
	)
	names = {
		d.name: d.doctor_name
		for d in frappe.get_all("TC Doctor", fields=["name", "doctor_name"])
	}
	for row in rows:
		row["doctor_name"] = names.get(row.doctor)
	return rows


@frappe.whitelist()
def list_doctor_sales(doctor=None):
	require_login()
	filters = {}
	if doctor:
		filters["doctor"] = doctor
	return frappe.get_all(
		"TC Doctor Monthly Sales",
		filters=filters,
		fields=["name", "doctor", "product", "year", "month", "qty", "competitor_qty", "recorded_by"],
		order_by="year desc, month desc",
		limit=1000,
	)


def _followup_fields(payload, assigned_to):
	share = payload.target_share if payload.get("target_share") not in (None, "") else payload.get("targetShare")
	review = payload.review_after or payload.get("reviewAfter") or None
	if review == "":
		review = None
	return {
		"doctor": payload.doctor or payload.get("doctorId") or payload.get("doctor_id"),
		"product": payload.product or payload.get("productId") or payload.get("product_id"),
		"assigned_to": assigned_to,
		"competitor_name": payload.competitor_name or payload.get("competitor"),
		"target_share": cint(share) if share not in (None, "") else None,
		"review_after": review,
		"reason": payload.reason,
	}


def _resolve_assignee(payload):
	requested = resolve_sales_person(
		payload.assigned_to or payload.get("assignedTo") or payload.get("assignedToName")
	)
	me = current_sales_person(required=False)
	if is_tc_manager():
		return requested or frappe.db.get_value("TC Doctor", payload.doctor or payload.get("doctorId"), "assigned_to") or me
	# Field reps create/update against themselves (or the doctor's own rep if they have none).
	return me or requested or frappe.db.get_value("TC Doctor", payload.doctor or payload.get("doctorId"), "assigned_to")


@frappe.whitelist()
def assign_followup(**kwargs):
	"""Create or update a follow up. Salespersons and managers may both call this.

	Pass `name` to update an existing assignment. Without it a new Active row is created.
	"""
	require_login()
	payload = frappe._dict(kwargs)
	assigned_to = _resolve_assignee(payload)
	if not assigned_to:
		frappe.throw("Assign to salesperson is required. Link this login to a Sales Person first.")
	fields = _followup_fields(payload, assigned_to)
	existing_name = payload.name or payload.get("followup")
	if existing_name:
		if not frappe.db.exists("TC Follow Up", existing_name):
			frappe.throw("That follow up was not found")
		doc = frappe.get_doc("TC Follow Up", existing_name)
		assert_own_or_manager(doc.assigned_to, "follow up")
		if fields["doctor"]:
			doc.doctor = fields["doctor"]
		if fields["product"]:
			doc.product = fields["product"]
		if is_tc_manager() and assigned_to:
			doc.assigned_to = assigned_to
		if fields["competitor_name"] not in (None, ""):
			doc.competitor_name = fields["competitor_name"]
		if fields["target_share"] not in (None, ""):
			doc.target_share = fields["target_share"]
		if fields["review_after"] is not None:
			doc.review_after = fields["review_after"]
		if fields["reason"] not in (None, ""):
			doc.reason = fields["reason"]
		if payload.status:
			key = str(payload.status).strip().title()
			if key in ("Active", "Paused", "Closed"):
				doc.status = key
		doc.save(ignore_permissions=True)
		return doc.as_dict()
	if not fields["doctor"] or not fields["product"]:
		frappe.throw("Doctor and product are required")
	doc = frappe.new_doc("TC Follow Up")
	doc.update(fields)
	doc.status = "Active"
	doc.assigned_by = frappe.session.user
	doc.assigned_at = now_datetime()
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def set_followup_status(name, status):
	require_login()
	allowed = {"Active": "Active", "Paused": "Paused", "Closed": "Closed"}
	key = str(status or "").strip().title()
	if key not in allowed:
		frappe.throw("Status must be Active, Paused or Closed")
	doc = frappe.get_doc("TC Follow Up", name)
	assert_own_or_manager(doc.assigned_to, "follow up")
	doc.status = allowed[key]
	doc.save(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def reassign_followup(name, assigned_to):
	require_manager()
	sp = resolve_sales_person(assigned_to)
	if not sp:
		frappe.throw("Pick a salesperson from the list")
	doc = frappe.get_doc("TC Follow Up", name)
	doc.assigned_to = sp
	doc.save(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def log_followup_visit(**kwargs):
	require_login()
	payload = frappe._dict(kwargs)
	sp = payload.salesperson or current_sales_person()
	our_units = int(payload.our_units or 0)
	competitor_units = int(payload.competitor_units or 0)
	total = our_units + competitor_units
	share = round((our_units / total) * 100) if total else 0
	sales = frappe.get_all(
		"TC Doctor Monthly Sales",
		filters={"doctor": payload.doctor, "product": payload.product},
		fields=["year", "month", "qty", "competitor_qty"],
	)
	preview = followup_trend(sales)
	doc = frappe.new_doc("TC Visit")
	doc.update(
		{
			"salesperson": sp,
			"doctor": payload.doctor,
			"product": payload.product,
			"is_followup": 1,
			"followup": payload.followup,
			"visited_at": payload.visited_at,
			"our_units": our_units,
			"competitor_units": competitor_units,
			"blocker": payload.blocker,
			"notes": payload.notes,
			"next_action": payload.next_action,
			"latitude": payload.latitude,
			"longitude": payload.longitude,
			"day_plan": payload.day_plan,
		}
	)
	doc.insert()
	return {"doc": doc.as_dict(), "share": share, "trend": preview}
