import frappe


def emit_doc_change(doc, method=None):
	try:
		frappe.publish_realtime(
			"tc_doc_update",
			{"doctype": doc.doctype, "name": doc.name, "modified": str(doc.modified)},
			after_commit=True,
		)
	except Exception:
		frappe.log_error(title="TC realtime emit failed")
