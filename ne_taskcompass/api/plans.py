import json

import frappe
from frappe.utils import today

from ne_taskcompass.api.utils import current_sales_person, payload_list, require_login
from ne_taskcompass.engine.people import (
	get_managed_sales_persons,
	is_tc_admin,
	is_tc_manager,
	resolve_sales_person,
)
from ne_taskcompass.engine.plan_visits import (
	opd_start_time as _opd_start_time,
	plan_row_is_locked,
)


def _decorate_plan(data):
	for row in data.get("items") or []:
		if isinstance(row, dict):
			row["locked"] = plan_row_is_locked(row.get("status"))
	return data


@frappe.whitelist()
def list_plans(plan_date=None, limit=200):
	"""List day plans with visit rows. Each item includes locked=1 after check-in."""
	require_login()
	filters = {}
	if plan_date:
		filters["plan_date"] = plan_date
	if not is_tc_admin():
		names = get_managed_sales_persons()
		if not names:
			return []
		filters["salesperson"] = ["in", names]
	plans = frappe.get_all(
		"TC Day Plan",
		filters=filters,
		fields=["name", "salesperson", "plan_date", "day_type", "status", "remarks"],
		order_by="plan_date desc",
		limit=int(limit or 200),
	)
	out = []
	for plan in plans:
		items = frappe.get_all(
			"TC Day Plan Item",
			filters={"parent": plan.name},
			fields=[
				"name",
				"doctor",
				"hospital",
				"product",
				"visit_time",
				"status",
				"visit",
				"sort_order",
			],
			order_by="sort_order",
		)
		out.append(_decorate_plan({**plan, "items": items}))
	return out


@frappe.whitelist()
def get_plan(name=None, plan_date=None, salesperson=None):
	"""Return one day plan. Pass name, or plan_date + salesperson."""
	require_login()
	if name:
		if not frappe.db.exists("TC Day Plan", name):
			frappe.throw("Day plan not found")
		return _decorate_plan(frappe.get_doc("TC Day Plan", name).as_dict())
	salesperson = salesperson or current_sales_person()
	plan_date = plan_date or today()
	found = frappe.db.exists("TC Day Plan", {"salesperson": salesperson, "plan_date": plan_date})
	if not found:
		return None
	return _decorate_plan(frappe.get_doc("TC Day Plan", found).as_dict())


@frappe.whitelist()
def opd_start_time(doctor, hospital, plan_date=None):
	"""HH:MM start time from TC Doctor Schedule for this doctor + hospital (prefer that weekday)."""
	require_login()
	return _opd_start_time(doctor, hospital, plan_date)


def _resolve_plan_salesperson(payload):
	if is_tc_manager():
		salesperson = resolve_sales_person(payload.salesperson) or current_sales_person(required=False)
		if not salesperson:
			frappe.throw("Pick a salesperson")
		if not is_tc_admin() and salesperson not in (get_managed_sales_persons() or []):
			frappe.throw("That salesperson is outside your territory")
		return salesperson
	return current_sales_person()


@frappe.whitelist()
def save_plan(**kwargs):
	"""Create or update a day plan. Saving creates a TC Visit per row.

	Pass name to update. Include each existing item name so In Progress / Done /
	Rescheduled rows stay locked. Pending and Missed changes copy onto the visit.
	Field Day: at least 6 visits, 2 HOD, 2 Professor. Extra rows are allowed.
	"""
	require_login()
	payload = frappe._dict(kwargs)
	salesperson = _resolve_plan_salesperson(payload)
	items = payload_list(payload, "items")
	existing = None
	if payload.name and frappe.db.exists("TC Day Plan", payload.name):
		existing = payload.name
	else:
		existing = frappe.db.exists(
			"TC Day Plan", {"salesperson": salesperson, "plan_date": payload.plan_date or today()}
		)
	if existing:
		doc = frappe.get_doc("TC Day Plan", existing)
		doc.day_type = payload.day_type or doc.day_type
		doc.remarks = payload.remarks
		if not any(plan_row_is_locked(row.status) for row in doc.items):
			if payload.plan_date:
				doc.plan_date = payload.plan_date
			doc.salesperson = salesperson
		_merge_plan_items(doc, items)
		doc.save(ignore_permissions=True)
		return _decorate_plan(doc.as_dict())
	else:
		doc = frappe.new_doc("TC Day Plan")
		doc.salesperson = salesperson
		doc.plan_date = payload.plan_date or today()
		doc.day_type = payload.day_type or "Field Day"
		doc.remarks = payload.remarks
		doc.status = "Pending"
		for idx, item in enumerate(items):
			item = frappe._dict(item)
			doc.append("items", _item_values(item, doc.plan_date, idx))
		doc.insert(ignore_permissions=True)
		return _decorate_plan(doc.as_dict())


def _item_values(item, plan_date, idx, include_name=False):
	hospital = item.hospital
	visit_time = item.visit_time
	if item.doctor and hospital and not visit_time:
		visit_time = _opd_start_time(item.doctor, hospital, plan_date)
	values = {
		"doctor": item.doctor,
		"hospital": hospital,
		"product": item.product,
		"visit_time": visit_time,
		"status": item.status or "Pending",
		"visit": item.visit,
		"sort_order": item.sort_order if item.sort_order not in (None, "") else idx,
	}
	if include_name and item.name:
		values["name"] = item.name
	return values


def _merge_plan_items(doc, items):
	by_name = {row.name: row for row in doc.items}
	seen = set()
	for idx, raw in enumerate(items):
		item = frappe._dict(raw)
		row = by_name.get(item.name) if item.name else None
		if row and plan_row_is_locked(row.status):
			seen.add(row.name)
			row.sort_order = item.sort_order if item.sort_order not in (None, "") else idx
			continue
		values = _item_values(item, doc.plan_date, idx)
		if row:
			row.doctor = values["doctor"]
			row.hospital = values["hospital"]
			row.product = values["product"]
			row.visit_time = values["visit_time"]
			if values.get("visit"):
				row.visit = values["visit"]
			row.sort_order = values["sort_order"]
			seen.add(row.name)
		else:
			doc.append("items", values)
	for row in list(doc.items):
		if row.name in seen or not row.name:
			continue
		if plan_row_is_locked(row.status):
			continue
		doc.remove(row)


@frappe.whitelist()
def delete_plan(name):
	"""Delete a day plan and its Pending/Missed visits. Blocked after check-in."""
	require_login()
	doc = frappe.get_doc("TC Day Plan", name)
	locked = [row for row in doc.items if plan_row_is_locked(row.status)]
	if locked:
		frappe.throw("This day plan has visits that are already in progress or done, so it cannot be deleted.")
	for row in doc.items:
		if row.visit and frappe.db.exists("TC Visit", row.visit):
			frappe.delete_doc("TC Visit", row.visit, ignore_permissions=True, force=True)
	doc.delete(ignore_permissions=True)
	return {"ok": True, "name": name}


@frappe.whitelist()
def end_of_day(plan_date=None, salesperson=None, missed=None, rescheduled=None):
	"""Mark leftover rows Missed (or Rescheduled if listed), copy status onto visits, close the plan."""
	require_login()
	salesperson = salesperson or current_sales_person()
	plan_date = plan_date or today()
	name = frappe.db.exists("TC Day Plan", {"salesperson": salesperson, "plan_date": plan_date})
	if not name:
		frappe.throw("No day plan for this date")
	doc = frappe.get_doc("TC Day Plan", name)
	missed = set(json.loads(missed) if isinstance(missed, str) else (missed or []))
	rescheduled = set(json.loads(rescheduled) if isinstance(rescheduled, str) else (rescheduled or []))
	for row in doc.items:
		if row.status in ("Done", "Missed", "Rescheduled"):
			continue
		if row.name in rescheduled or row.doctor in rescheduled:
			row.status = "Rescheduled"
		else:
			row.status = "Missed"
		if row.visit and frappe.db.exists("TC Visit", row.visit):
			frappe.db.set_value("TC Visit", row.visit, "status", row.status)
	doc.status = "Closed"
	doc.save(ignore_permissions=True)
	return _decorate_plan(doc.as_dict())
