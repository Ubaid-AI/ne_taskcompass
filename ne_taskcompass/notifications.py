import frappe


def expire_stale_checks():
	"""Placeholder hourly hook. Stall highlighting is computed live in the pipeline."""
	return


def notify(user, title, body=None, reference_doctype=None, reference_name=None):
	if not user:
		return
	doc = frappe.get_doc(
		{
			"doctype": "TC Notification",
			"user": user,
			"title": title,
			"body": body,
			"reference_doctype": reference_doctype,
			"reference_name": reference_name,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name
