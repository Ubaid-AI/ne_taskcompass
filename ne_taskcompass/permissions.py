import frappe

from ne_taskcompass.engine.people import (
	get_managed_sales_persons,
	get_sales_person,
	get_sales_person_territory,
	is_tc_admin,
	is_tc_manager,
	is_tc_super_admin,
)


def _in_list(names):
	if not names:
		return None
	return ", ".join(frappe.db.escape(n) for n in names)


def doctor_query(user):
	if is_tc_admin(user):
		return ""
	names = get_managed_sales_persons(user)
	escaped = _in_list(names)
	user_esc = frappe.db.escape(user)
	territory = get_sales_person_territory(user=user)
	parts = [f"`tabTC Doctor`.added_by = {user_esc}"]
	if escaped:
		parts.append(f"`tabTC Doctor`.assigned_to in ({escaped})")
		parts.append(
			f"""`tabTC Doctor`.name in (
				select doctor from `tabTC Follow Up`
				where assigned_to in ({escaped}) and status = 'Active'
			)"""
		)
	if territory:
		parts.append(
			f"""(
				ifnull(`tabTC Doctor`.assigned_to, '') = ''
				and `tabTC Doctor`.status = 'Approved'
				and `tabTC Doctor`.hospital in (
					select name from `tabTC Hospital` where territory = {frappe.db.escape(territory)}
				)
			)"""
		)
	return "(" + " or ".join(parts) + ")"


def has_doctor_permission(doc, user=None, ptype="read"):
	user = user or frappe.session.user
	if is_tc_admin(user):
		return True
	if ptype == "delete":
		return is_tc_super_admin(user)
	names = set(get_managed_sales_persons(user) or [])
	if getattr(doc, "assigned_to", None) in names:
		return True
	if getattr(doc, "added_by", None) == user:
		return True
	if names and frappe.db.exists(
		"TC Follow Up",
		{"doctor": doc.name, "assigned_to": ["in", list(names)], "status": "Active"},
	):
		return True
	if ptype == "read" and not doc.assigned_to and doc.status == "Approved":
		territory = get_sales_person_territory(user=user)
		if territory and doc.hospital:
			return frappe.db.get_value("TC Hospital", doc.hospital, "territory") == territory
	return False


def _salesperson_query(doctype, user):
	if is_tc_admin(user):
		return ""
	escaped = _in_list(get_managed_sales_persons(user))
	if not escaped:
		return "1=0"
	return f"`tab{doctype}`.salesperson in ({escaped})"


def visit_query(user):
	return _salesperson_query("TC Visit", user)


def day_plan_query(user):
	return _salesperson_query("TC Day Plan", user)


def monthly_target_query(user):
	return _salesperson_query("TC Monthly Target", user)


def weekly_achievement_query(user):
	return _salesperson_query("TC Weekly Achievement", user)


def performance_event_query(user):
	return _salesperson_query("TC Performance Event", user)


def sales_person_tracker_query(user):
	return _salesperson_query("TC Sales Person Tracker", user)


def has_salesperson_owned_permission(doc, user=None, ptype="read"):
	user = user or frappe.session.user
	if is_tc_admin(user):
		return True
	if ptype == "delete":
		return is_tc_super_admin(user)
	return doc.salesperson in (get_managed_sales_persons(user) or [])


def sample_query(user):
	if is_tc_admin(user):
		return ""
	escaped = _in_list(get_managed_sales_persons(user))
	if not escaped:
		return "1=0"
	return f"`tabTC Sample Order`.requested_by in ({escaped})"


def has_sample_permission(doc, user=None, ptype="read"):
	user = user or frappe.session.user
	if is_tc_admin(user):
		return True
	if ptype == "delete":
		return is_tc_super_admin(user)
	return doc.requested_by in (get_managed_sales_persons(user) or [])


def followup_query(user):
	if is_tc_admin(user):
		return ""
	escaped = _in_list(get_managed_sales_persons(user))
	if not escaped:
		return "1=0"
	return f"`tabTC Follow Up`.assigned_to in ({escaped})"


def has_followup_permission(doc, user=None, ptype="read"):
	user = user or frappe.session.user
	if is_tc_admin(user):
		return True
	if ptype == "delete":
		return is_tc_super_admin(user)
	if ptype in ("create", "write") and not getattr(doc, "assigned_to", None):
		return bool(get_sales_person(user) or is_tc_manager(user))
	return doc.assigned_to in (get_managed_sales_persons(user) or [])


def doctor_linked_query(user):
	if is_tc_admin(user):
		return ""
	escaped = _in_list(get_managed_sales_persons(user))
	if not escaped:
		return "1=0"
	return f"""`tabTC Doctor Monthly Sales`.doctor in (
		select name from `tabTC Doctor` where assigned_to in ({escaped})
		union
		select doctor from `tabTC Follow Up` where assigned_to in ({escaped}) and status = 'Active'
	)"""


def has_doctor_linked_permission(doc, user=None, ptype="read"):
	user = user or frappe.session.user
	if is_tc_admin(user):
		return True
	if ptype == "delete":
		return is_tc_super_admin(user)
	names = set(get_managed_sales_persons(user) or [])
	assigned = frappe.db.get_value("TC Doctor", doc.doctor, "assigned_to")
	if assigned in names:
		return True
	return bool(
		names
		and frappe.db.exists(
			"TC Follow Up",
			{"doctor": doc.doctor, "assigned_to": ["in", list(names)], "status": "Active"},
		)
	)


def edit_request_query(user):
	if is_tc_admin(user):
		return ""
	return f"`tabTC Doctor Edit Request`.requested_by = {frappe.db.escape(user)}"


def has_edit_request_permission(doc, user=None, ptype="read"):
	user = user or frappe.session.user
	if is_tc_admin(user):
		return True
	if ptype == "delete":
		return is_tc_super_admin(user)
	return doc.requested_by == user


def tender_query(user):
	if is_tc_admin(user):
		return ""
	sp = get_sales_person(user)
	if not sp:
		return "1=0"
	return f"`tabTC Tender`.lead = {frappe.db.escape(sp)}"


def has_tender_permission(doc, user=None, ptype="read"):
	user = user or frappe.session.user
	if is_tc_admin(user):
		return True
	if ptype == "delete":
		return is_tc_super_admin(user)
	if ptype in ("create", "write") and not getattr(doc, "lead", None):
		return bool(get_sales_person(user) or is_tc_manager(user))
	return doc.lead == get_sales_person(user) or doc.lead in (get_managed_sales_persons(user) or [])


def notification_query(user):
	if is_tc_super_admin(user):
		return ""
	return f"`tabTC Notification`.user = {frappe.db.escape(user)}"


def has_notification_permission(doc, user=None, ptype="read"):
	user = user or frappe.session.user
	if is_tc_super_admin(user):
		return True
	return doc.user == user
