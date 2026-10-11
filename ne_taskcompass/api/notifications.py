import frappe

from ne_taskcompass.api.utils import require_login


@frappe.whitelist()
def list_notifications(unread_only=0):
	require_login()
	filters = {"user": frappe.session.user}
	if int(unread_only or 0):
		filters["read"] = 0
	return frappe.get_all(
		"TC Notification",
		filters=filters,
		fields=["name", "title", "body", "read", "reference_doctype", "reference_name", "creation"],
		order_by="creation desc",
		limit=50,
	)


@frappe.whitelist()
def mark_read(name=None, all=0):
	require_login()
	if int(all or 0):
		for row in frappe.get_all(
			"TC Notification",
			filters={"user": frappe.session.user, "read": 0},
			pluck="name",
		):
			frappe.db.set_value("TC Notification", row, "read", 1)
		return {"ok": True}
	doc = frappe.get_doc("TC Notification", name)
	doc.read = 1
	doc.save()
	return {"ok": True}
