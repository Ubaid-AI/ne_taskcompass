from urllib.parse import quote

import frappe

from ne_taskcompass.api.files import is_public_file_url, normalize_file_url, serve_file_url
from ne_taskcompass.api.utils import (
	assert_own_or_manager,
	current_sales_person,
	payload_list,
	payload_number,
	require_login,
	require_manager,
)
from ne_taskcompass.engine.people import is_tc_manager, resolve_sales_person


@frappe.whitelist()
def list_tenders():
	require_login()
	rows = frappe.get_all(
		"TC Tender",
		fields=[
			"name",
			"title",
			"hospital",
			"champion_doctor",
			"lead",
			"stage",
			"submission_date",
			"po_number",
			"po_date",
			"supporting_document",
			"notes",
		],
		order_by="modified desc",
	)
	for row in rows:
		row["supporting_file_url"] = _supporting_url(row.name, row.get("supporting_document"))
	return rows


def _supporting_url(name, file_url):
	url = normalize_file_url(file_url)
	if not url:
		return ""
	if is_public_file_url(url):
		return url
	return f"/api/method/ne_taskcompass.api.tenders.tender_file?name={quote(str(name))}"


@frappe.whitelist()
def get_tender(name):
	require_login()
	data = frappe.get_doc("TC Tender", name).as_dict()
	data["supporting_file_url"] = _supporting_url(name, data.get("supporting_document"))
	data.pop("value", None)
	return data


@frappe.whitelist()
def tender_file(name=None):
	"""Serve a tender's supporting document to anyone allowed to read that tender."""
	require_login()
	if not name:
		frappe.throw("name is required")
	doc = frappe.get_doc("TC Tender", name)
	doc.check_permission("read")
	if not doc.supporting_document:
		frappe.throw("No supporting document")
	serve_file_url(doc.supporting_document)


def _item_row(item):
	if not isinstance(item, dict):
		item = {"product": item}
	product = item.get("product")
	if not product:
		return None
	return {
		"product": product,
		"qty": payload_number(item.get("qty")) or 1,
		"unit_price": payload_number(item.get("unit_price")) or 0,
	}


@frappe.whitelist()
def save_tender(**kwargs):
	"""Create or update a tender. Salespersons and managers may both call this."""
	require_login()
	payload = frappe._dict(kwargs)
	if not (payload.title or "").strip() and not payload.name:
		frappe.throw("Enter a tender title")
	me = current_sales_person(required=False)
	lead = resolve_sales_person(payload.lead) if payload.lead else None
	if not is_tc_manager():
		lead = me or lead
	replace_items = payload.get("items") is not None and not callable(payload.get("items"))
	rows = [_item_row(item) for item in payload_list(payload, "items")]
	rows = [r for r in rows if r]
	if payload.name:
		if not frappe.db.exists("TC Tender", payload.name):
			frappe.throw("That tender was not found")
		doc = frappe.get_doc("TC Tender", payload.name)
		assert_own_or_manager(doc.lead, "tender")
		if payload.title:
			doc.title = payload.title
		doc.hospital = payload.hospital
		doc.champion_doctor = payload.champion_doctor
		if is_tc_manager():
			doc.lead = lead or doc.lead
		doc.stage = payload.stage or doc.stage
		doc.submission_date = payload.submission_date or None
		doc.po_number = payload.po_number
		doc.po_date = payload.po_date or None
		if payload.supporting_document:
			doc.supporting_document = payload.supporting_document
		doc.notes = payload.notes
		if replace_items:
			doc.set("items", [])
			for row in rows:
				doc.append("items", row)
	else:
		if not lead:
			frappe.throw("Link this login to a Sales Person before saving a tender")
		doc = frappe.new_doc("TC Tender")
		doc.title = payload.title
		doc.hospital = payload.hospital
		doc.champion_doctor = payload.champion_doctor
		doc.lead = lead
		doc.stage = payload.stage or "Identified"
		doc.submission_date = payload.submission_date or None
		doc.po_number = payload.po_number
		doc.po_date = payload.po_date or None
		if payload.supporting_document:
			doc.supporting_document = payload.supporting_document
		doc.notes = payload.notes
		for row in rows:
			doc.append("items", row)
	if payload.name:
		doc.save(ignore_permissions=True)
	else:
		doc.insert(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def delete_tender(name):
	require_manager()
	if not frappe.db.exists("TC Tender", name):
		frappe.throw("That tender was not found")
	frappe.delete_doc("TC Tender", name, ignore_permissions=True, force=True)
	return {"ok": True}
