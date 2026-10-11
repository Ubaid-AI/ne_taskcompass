import frappe

from ne_taskcompass.seed import seed_products
from ne_taskcompass.seed_demo import seed_demo_data

ROLES = [
	{
		"role_name": "TC Salesperson",
		"desk_access": 0,
		"home_page": "",
	},
	{
		"role_name": "TC Sales Manager",
		"desk_access": 1,
		"home_page": "/livetrack",
	},
	{
		"role_name": "TC Management",
		"desk_access": 1,
		"home_page": "/livetrack",
	},
	{
		"role_name": "TC Super Admin",
		"desk_access": 1,
		"home_page": "/livetrack",
	},
]

# ERPNext masters the four roles need so a manager can work from Desk or the portal.
# Document-level region filters live in ne_taskcompass.permissions (Sales Manager = own territory).
CORE_ROLE_PERMS = {
	"Territory": {
		"TC Super Admin": {"read": 1, "write": 1, "create": 1, "delete": 1, "export": 1, "report": 1},
		"TC Management": {"read": 1, "write": 1, "create": 1, "export": 1, "report": 1},
		"TC Sales Manager": {"read": 1, "export": 1, "report": 1},
		"TC Salesperson": {"read": 1},
	},
	"Sales Person": {
		"TC Super Admin": {"read": 1, "write": 1, "create": 1, "delete": 1, "export": 1, "report": 1},
		"TC Management": {"read": 1, "write": 1, "create": 1, "export": 1, "report": 1},
		"TC Sales Manager": {"read": 1, "write": 1, "export": 1, "report": 1},
		"TC Salesperson": {"read": 1},
	},
	"Employee": {
		"TC Super Admin": {"read": 1, "write": 1, "create": 1, "delete": 1, "export": 1, "report": 1},
		"TC Management": {"read": 1, "write": 1, "create": 1, "export": 1, "report": 1},
		"TC Sales Manager": {"read": 1},
	},
	"User": {
		"TC Super Admin": {"read": 1, "write": 1, "create": 1, "export": 1},
		"TC Management": {"read": 1, "write": 1, "create": 1},
		"TC Sales Manager": {"read": 1},
	},
}


def after_install():
	ensure_roles()
	ensure_core_permissions()
	ensure_sales_person_territory_field()
	ensure_portal_only_user_field()
	ensure_settings()
	ensure_designations()
	seed_products()
	seed_demo_data()
	ensure_workspace()
	frappe.clear_cache()


def after_migrate():
	ensure_roles()
	ensure_core_permissions()
	ensure_sales_person_territory_field()
	ensure_portal_only_user_field()
	ensure_settings()
	# Do not re-seed demo data on every migrate — that locks MariaDB and makes
	# the site look dead until migrate finishes.
	ensure_workspace()
	ensure_designations()
	remap_tender_stages()
	backfill_day_plan_visit_link()
	frappe.clear_cache()


def ensure_roles():
	for role in ROLES:
		if frappe.db.exists("Role", role["role_name"]):
			doc = frappe.get_doc("Role", role["role_name"])
			changed = False
			if cint_changed(doc.desk_access, role["desk_access"]):
				doc.desk_access = role["desk_access"]
				changed = True
			if doc.meta.has_field("home_page") and (doc.home_page or "") != (role.get("home_page") or ""):
				doc.home_page = role.get("home_page") or ""
				changed = True
			if changed:
				doc.save(ignore_permissions=True)
			continue
		payload = {
			"doctype": "Role",
			"role_name": role["role_name"],
			"desk_access": role["desk_access"],
		}
		if role.get("home_page"):
			payload["home_page"] = role["home_page"]
		frappe.get_doc(payload).insert(ignore_permissions=True)


def cint_changed(current, expected):
	return int(current or 0) != int(expected or 0)


def ensure_core_permissions():
	from frappe.permissions import add_permission, update_permission_property

	for doctype, roles in CORE_ROLE_PERMS.items():
		if not frappe.db.exists("DocType", doctype):
			continue
		try:
			for role, flags in roles.items():
				if not frappe.db.exists("Role", role):
					continue
				exists = frappe.db.exists(
					"Custom DocPerm",
					{"parent": doctype, "role": role, "permlevel": 0, "if_owner": 0},
				)
				if not exists:
					add_permission(doctype, role, 0)
				for ptype, value in flags.items():
					update_permission_property(doctype, role, 0, ptype, value, validate=False)
			frappe.clear_cache(doctype=doctype)
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"TC permissions for {doctype}")


def ensure_sales_person_territory_field():
	fieldname = "tc_territory"
	if frappe.db.exists("Custom Field", {"dt": "Sales Person", "fieldname": fieldname}):
		return

	frappe.get_doc(
		{
			"doctype": "Custom Field",
			"dt": "Sales Person",
			"module": "Ne Taskcompass",
			"label": "TaskCompass Territory",
			"fieldname": fieldname,
			"fieldtype": "Link",
			"options": "Territory",
			"insert_after": "employee",
			"in_list_view": 1,
			"translatable": 0,
		}
	).insert(ignore_permissions=True)


def ensure_portal_only_user_field():
	fieldname = "tc_portal_only"
	if frappe.db.exists("Custom Field", {"dt": "User", "fieldname": fieldname}):
		return
	frappe.get_doc(
		{
			"doctype": "Custom Field",
			"dt": "User",
			"module": "Ne Taskcompass",
			"label": "LiveTrack portal only",
			"fieldname": fieldname,
			"fieldtype": "Check",
			"insert_after": "user_type",
			"description": "After login this user always opens LiveTrack, never Desk. Tick this for client staff who should only use the portal.",
			"default": "0",
			"translatable": 0,
		}
	).insert(ignore_permissions=True)


DEFAULT_DESIGNATIONS = (
	("Professor", 1),
	("Associate Professor", 2),
	("Assistant Professor", 3),
	("Consultant Surgeon", 4),
	("Other", 100),
)


def ensure_designations():
	"""Seed the designation master and keep values already stored on sample orders."""
	if not frappe.db.exists("DocType", "TC Designation"):
		return
	names = [name for name, _order in DEFAULT_DESIGNATIONS]
	orders = {name: order for name, order in DEFAULT_DESIGNATIONS}
	if frappe.db.table_exists("TC Sample Order") and frappe.db.has_column("TC Sample Order", "designation"):
		for (value,) in frappe.db.sql(
			"select distinct designation from `tabTC Sample Order` where ifnull(designation, '') != ''"
		):
			if value not in orders:
				names.append(value)
				orders[value] = 50
	for name in names:
		if frappe.db.exists("TC Designation", name):
			if name in ("Professor", "Associate Professor", "Assistant Professor", "Consultant Surgeon", "Other"):
				frappe.db.set_value(
					"TC Designation", name, "sort_order", orders[name], update_modified=False
				)
			continue
		frappe.get_doc(
			{
				"doctype": "TC Designation",
				"designation_name": name,
				"sort_order": orders.get(name) or 50,
			}
		).insert(ignore_permissions=True)


def remap_tender_stages():
	if not frappe.db.has_column("TC Tender", "stage"):
		return
	frappe.db.sql(
		"""
		update `tabTC Tender`
		set stage = case stage
			when 'Documents Prepared' then 'Submitted'
			when 'Technical Evaluation' then 'Submitted'
			when 'Awarded' then 'Won'
			else stage
		end
		where stage in ('Documents Prepared', 'Technical Evaluation', 'Awarded')
		"""
	)


def ensure_settings():
	defaults = {
		"score_floor": 30,
		"weeks_per_month": 4,
		"warn_additional_sample": 1,
		"gps_retention_days": 90,
		"gps_check_meters": 200,
		"tracker_start_time": "08:00:00",
		"tracker_end_time": "18:00:00",
		"location_interval": "00:15:00",
	}
	if not frappe.db.exists("TC Settings", "TC Settings"):
		doc = frappe.new_doc("TC Settings")
		doc.update(defaults)
		doc.insert(ignore_permissions=True)
		return
	doc = frappe.get_single("TC Settings")
	changed = False
	for key, value in defaults.items():
		if doc.meta.has_field(key) and doc.get(key) in (None, ""):
			doc.set(key, value)
			changed = True
	if changed:
		doc.save(ignore_permissions=True)


def ensure_workspace():
	"""Force-reload the Desk workspace so card sections are not stuck on an older copy."""
	from frappe.modules.import_file import import_file_by_path

	path = frappe.get_app_path(
		"ne_taskcompass",
		"ne_taskcompass",
		"workspace",
		"ne_taskcompass",
		"ne_taskcompass.json",
	)
	import_file_by_path(path, force=True)


def backfill_day_plan_visit_link():
	"""Map old Active plans and fill hospital/product on existing visit rows so required fields do not block saves."""
	if frappe.db.has_column("TC Day Plan", "status"):
		frappe.db.sql("update `tabTC Day Plan` set status='Pending' where status='Active'")
	if frappe.db.has_column("TC Visit", "status"):
		frappe.db.sql(
			"""
			update `tabTC Visit`
			set status='Done'
			where ifnull(status,'') in ('', 'Pending')
			  and ifnull(day_plan_item,'')=''
			  and ifnull(checkin_time,'')=''
			"""
		)
	if not frappe.db.has_column("TC Day Plan Item", "hospital"):
		return
	from ne_taskcompass.ne_taskcompass.doctype.tc_doctor_schedule.tc_doctor_schedule import (
		get_doctor_hospital_names,
	)

	product = frappe.db.get_value("TC Product", {"disabled": 0}, "name") or frappe.db.get_value("TC Product", {}, "name")
	for row in frappe.get_all("TC Day Plan Item", fields=["name", "doctor", "hospital", "product"]):
		values = {}
		if not row.hospital and row.doctor:
			names = get_doctor_hospital_names(row.doctor)
			if not names:
				primary = frappe.db.get_value("TC Doctor", row.doctor, "hospital")
				names = [primary] if primary else []
			if names:
				values["hospital"] = names[0]
		if not row.product and product:
			values["product"] = product
		if values:
			frappe.db.set_value("TC Day Plan Item", row.name, values, update_modified=False)

	from ne_taskcompass.engine.plan_visits import ensure_visits_for_plan, opd_start_time

	for plan_name in frappe.get_all("TC Day Plan", pluck="name"):
		try:
			plan = frappe.get_doc("TC Day Plan", plan_name)
			for row in plan.items:
				if row.doctor and row.hospital and not row.visit_time:
					row.visit_time = opd_start_time(row.doctor, row.hospital, plan.plan_date)
			ensure_visits_for_plan(plan)
			frappe.db.commit()
		except Exception:
			frappe.db.rollback()
			frappe.log_error(frappe.get_traceback(), f"TC day plan visit backfill {plan_name}")

