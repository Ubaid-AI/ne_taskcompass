import frappe
from frappe.utils import now_datetime

from ne_taskcompass.api.utils import require_admin, require_login


@frappe.whitelist()
def pending():
	require_login()
	doctors = frappe.get_all(
		"TC Doctor",
		filters={"status": "Pending"},
		fields=["name", "doctor_name", "person_type", "hospital", "city", "added_by", "assigned_to", "creation"],
		order_by="creation desc",
	)
	edits = frappe.get_all(
		"TC Doctor Edit Request",
		filters={"status": "Pending"},
		fields=["name", "doctor", "requested_by", "changes_json", "reason", "creation"],
		order_by="creation desc",
	)
	samples = frappe.get_all(
		"TC Sample Order",
		filters={"status": "Pending"},
		fields=[
			"name",
			"doctor",
			"doctor_name",
			"product",
			"requested_by",
			"approval_warning",
			"related_surgeries_pm",
			"total_surgeries_pm",
			"expected_consumption_pm",
			"creation",
		],
		order_by="creation desc",
	)
	return {"doctors": doctors, "edits": edits, "samples": samples}


@frappe.whitelist()
def decide_doctor(name, action, review_note=None):
	require_admin()
	action = (action or "").title()
	if action not in ("Approved", "Rejected"):
		frappe.throw("action must be Approved or Rejected")
	doc = frappe.get_doc("TC Doctor", name)
	doc.status = action
	doc.save()
	return doc.as_dict()


@frappe.whitelist()
def decide_edit(name, action, review_note=None):
	require_admin()
	action = (action or "").title()
	if action not in ("Approved", "Rejected"):
		frappe.throw("action must be Approved or Rejected")
	doc = frappe.get_doc("TC Doctor Edit Request", name)
	doc.status = action
	doc.review_note = review_note
	doc.save()
	return doc.as_dict()
