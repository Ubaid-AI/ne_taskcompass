import frappe
from datetime import datetime
from frappe.utils import getdate, get_datetime

from ne_taskcompass.ne_taskcompass.doctype.tc_doctor_schedule.tc_doctor_schedule import format_hhmm
from ne_taskcompass.engine.visit_rules import next_visit_number


WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
EDITABLE_VISIT_STATUSES = ("Pending", "Missed")


def plan_row_is_locked(status):
	return (status or "Pending") not in EDITABLE_VISIT_STATUSES


def weekday_label(plan_date):
	if not plan_date:
		return None
	return WEEKDAYS[getdate(plan_date).weekday()]


def opd_start_time(doctor, hospital, plan_date=None):
	"""Start time from TC Doctor Schedule for this doctor + hospital (prefer that weekday)."""
	if not doctor or not hospital:
		return ""
	filters = {"doctor": doctor, "hospital": hospital}
	day = weekday_label(plan_date)
	if day:
		rows = frappe.get_all(
			"TC Doctor Schedule",
			filters={**filters, "day_of_week": day},
			fields=["start_time"],
			order_by="start_time",
		)
		if rows:
			return format_hhmm(rows[0].start_time)
	rows = frappe.get_all(
		"TC Doctor Schedule",
		filters=filters,
		fields=["start_time"],
		order_by="start_time",
	)
	return format_hhmm(rows[0].start_time) if rows else ""


def parse_visit_hhmm(value):
	"""HH:MM from OPD time, including values like 9:00 AM."""
	if value in (None, ""):
		return ""
	text = str(value).strip().upper().replace(".", "")
	if not text:
		return ""
	for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p", "%I %p"):
		try:
			return datetime.strptime(text, fmt).strftime("%H:%M")
		except ValueError:
			continue
	try:
		return format_hhmm(value)
	except Exception:
		return ""


def planned_visited_at(plan_date, visit_time):
	stamp = parse_visit_hhmm(visit_time) or "09:00"
	return get_datetime(f"{getdate(plan_date)} {stamp}:00")


def rollup_plan_status(plan_name):
	if not plan_name or not frappe.db.exists("TC Day Plan", plan_name):
		return None
	statuses = frappe.get_all(
		"TC Day Plan Item",
		filters={"parent": plan_name},
		pluck="status",
	)
	if not statuses:
		new_status = "Pending"
	elif all(s == "Done" for s in statuses):
		new_status = "Closed"
	elif all(s in ("Missed", "Rescheduled", "Done") for s in statuses):
		new_status = "Closed"
	elif any(s == "In Progress" for s in statuses) or any(s == "Done" for s in statuses):
		new_status = "In Progress"
	else:
		new_status = "Pending"
	current = frappe.db.get_value("TC Day Plan", plan_name, "status")
	if current != new_status:
		frappe.db.set_value("TC Day Plan", plan_name, "status", new_status, update_modified=True)
		frappe.publish_realtime(
			"tc_doc_update",
			{"doctype": "TC Day Plan", "name": plan_name, "status": new_status},
			after_commit=True,
		)
	return new_status


def sync_plan_item_from_visit(visit):
	if not visit.day_plan:
		return
	item_name = visit.day_plan_item
	if not item_name:
		item_name = frappe.db.get_value(
			"TC Day Plan Item",
			{"parent": visit.day_plan, "visit": visit.name},
			"name",
		)
	if not item_name:
		item_name = frappe.db.get_value(
			"TC Day Plan Item",
			{"parent": visit.day_plan, "doctor": visit.doctor, "status": ["in", ["Pending", "In Progress"]]},
			"name",
		)
	if not item_name:
		return
	values = {"status": visit.status or "Pending", "visit": visit.name}
	if visit.doctor:
		values["doctor"] = visit.doctor
	if visit.hospital:
		values["hospital"] = visit.hospital
	if visit.product:
		values["product"] = visit.product
	frappe.db.set_value("TC Day Plan Item", item_name, values, update_modified=True)
	if not visit.day_plan_item:
		frappe.db.set_value("TC Visit", visit.name, "day_plan_item", item_name, update_modified=False)
		visit.day_plan_item = item_name
	rollup_plan_status(visit.day_plan)
	frappe.publish_realtime(
		"tc_doc_update",
		{"doctype": "TC Day Plan", "name": visit.day_plan, "item": item_name, "status": visit.status},
		after_commit=True,
	)


def ensure_visits_for_plan(plan):
	"""Create a TC Visit for each day-plan row that has doctor, hospital and product."""
	if getattr(plan.flags, "in_ensure_visits", False):
		return
	plan.flags.in_ensure_visits = True
	changed = False
	for row in plan.items:
		if not row.doctor or not row.product:
			continue
		if not row.hospital:
			allowed = frappe.get_all(
				"TC Doctor Hospital",
				filters={"parent": row.doctor},
				pluck="hospital",
				order_by="idx",
			)
			if allowed:
				row.hospital = allowed[0]
				changed = True
		if not row.visit_time:
			row.visit_time = opd_start_time(row.doctor, row.hospital, plan.plan_date)
			if row.visit_time:
				changed = True
		normalized = parse_visit_hhmm(row.visit_time)
		if normalized and normalized != (row.visit_time or ""):
			row.visit_time = normalized
			changed = True
		if row.visit and frappe.db.exists("TC Visit", row.visit):
			if not plan_row_is_locked(row.status):
				_update_planned_visit(row, plan)
			continue
		existing = _find_existing_visit(row, plan)
		if existing:
			row.visit = existing
			changed = True
			_update_planned_visit(row, plan)
			continue
		visit = _create_planned_visit(row, plan)
		row.visit = visit.name
		changed = True
	if changed:
		for row in plan.items:
			if row.name and row.visit:
				frappe.db.set_value(
					"TC Day Plan Item",
					row.name,
					{"visit": row.visit, "hospital": row.hospital, "visit_time": row.visit_time},
					update_modified=False,
				)
		rollup_plan_status(plan.name)
	cleanup_orphan_visits(plan)


def _find_existing_visit(row, plan):
	assigned = {r.visit for r in (plan.items or []) if r.visit and r.name != row.name}
	if row.name:
		linked = frappe.db.get_value(
			"TC Visit",
			{"day_plan": plan.name, "day_plan_item": row.name},
			"name",
		)
		if linked and linked not in assigned:
			return linked
	filters = {"day_plan": plan.name, "doctor": row.doctor}
	if row.product:
		filters["product"] = row.product
	if row.hospital:
		filters["hospital"] = row.hospital
	for visit_name in frappe.get_all("TC Visit", filters=filters, pluck="name", order_by="creation"):
		if visit_name in assigned:
			continue
		item = frappe.db.get_value("TC Visit", visit_name, "day_plan_item")
		if item in (None, "", row.name):
			return visit_name
		already = frappe.db.get_value("TC Day Plan Item", {"parent": plan.name, "visit": visit_name}, "name")
		if not already:
			return visit_name
	return None


def _create_planned_visit(row, plan):
	visit = frappe.new_doc("TC Visit")
	visit.update(
		{
			"salesperson": plan.salesperson,
			"doctor": row.doctor,
			"hospital": row.hospital,
			"product": row.product,
			"status": row.status if row.status in ("Pending", "In Progress", "Done") else "Pending",
			"visited_at": planned_visited_at(plan.plan_date, row.visit_time),
			"visit_number": next_visit_number(row.doctor, row.product),
			"is_followup": 0,
			"day_plan": plan.name,
			"day_plan_item": row.name,
			"showed_brochure": 0,
			"did_demonstration": 0,
		}
	)
	visit.flags.from_day_plan = True
	visit.insert(ignore_permissions=True)
	return visit


def _update_planned_visit(row, plan):
	visit = frappe.get_doc("TC Visit", row.visit)
	visit.day_plan = plan.name
	visit.day_plan_item = row.name
	if not plan_row_is_locked(visit.status):
		visit.salesperson = plan.salesperson
		visit.doctor = row.doctor
		visit.hospital = row.hospital
		visit.product = row.product
		visit.visited_at = planned_visited_at(plan.plan_date, row.visit_time)
	visit.flags.from_day_plan = True
	visit.save(ignore_permissions=True)


def cleanup_orphan_visits(plan):
	kept = {row.visit for row in (plan.items or []) if row.visit}
	for visit in frappe.get_all(
		"TC Visit",
		filters={"day_plan": plan.name},
		fields=["name", "status"],
	):
		if visit.name in kept:
			continue
		if plan_row_is_locked(visit.status):
			continue
		frappe.delete_doc("TC Visit", visit.name, ignore_permissions=True, force=True)


def protect_locked_plan_rows(plan):
	before = plan.get_doc_before_save()
	if not before:
		return
	current = {row.name: row for row in (plan.items or []) if row.name}
	for old in before.items or []:
		if not plan_row_is_locked(old.status):
			continue
		new = current.get(old.name)
		if not new:
			frappe.throw(
				f"Visit for {old.doctor} cannot be removed because the visit is {old.status}."
			)
		for field in ("doctor", "hospital", "product", "visit_time"):
			if (new.get(field) or "") != (old.get(field) or ""):
				frappe.throw(
					f"This visit is {old.status}. Doctor, hospital, product and time cannot be changed."
				)
		new.status = old.status
		new.visit = old.visit
