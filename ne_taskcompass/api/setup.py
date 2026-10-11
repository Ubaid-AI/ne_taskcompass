import frappe
from frappe.utils import cint

from ne_taskcompass.api.tracker import tracker_settings
from ne_taskcompass.api.utils import require_login, require_manager
from ne_taskcompass.engine.people import get_sales_person_territory, is_tc_admin


def _parent_territory():
	name = frappe.db.get_value("Territory", {"is_group": 1}, "name")
	if name:
		return name
	if not frappe.db.exists("Territory", "All Territories"):
		frappe.get_doc(
			{"doctype": "Territory", "territory_name": "All Territories", "is_group": 1}
		).insert(ignore_permissions=True)
	return "All Territories"


def _parent_sales_person():
	name = frappe.db.get_value("Sales Person", {"is_group": 1}, "name")
	if name:
		return name
	if not frappe.db.exists("Sales Person", "Sales Team"):
		frappe.get_doc(
			{
				"doctype": "Sales Person",
				"sales_person_name": "Sales Team",
				"is_group": 1,
				"enabled": 1,
			}
		).insert(ignore_permissions=True)
	return "Sales Team"


@frappe.whitelist()
def list_territories():
	require_login()
	filters = {"is_group": 0}
	if not is_tc_admin():
		own = get_sales_person_territory()
		if own:
			filters["name"] = own
		else:
			return []
	return frappe.get_all(
		"Territory",
		filters=filters,
		fields=["name", "territory_name", "parent_territory"],
		order_by="territory_name",
	)


@frappe.whitelist()
def create_territory(territory_name):
	require_manager()
	name = (territory_name or "").strip()
	if not name:
		frappe.throw("City / territory name is required")
	if frappe.db.exists("Territory", name):
		return frappe.get_doc("Territory", name).as_dict()
	doc = frappe.get_doc(
		{
			"doctype": "Territory",
			"territory_name": name,
			"parent_territory": _parent_territory(),
			"is_group": 0,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def create_sales_person(sales_person_name, territory=None):
	require_manager()
	name = (sales_person_name or "").strip()
	if not name:
		frappe.throw("Salesperson name is required")
	existing = frappe.db.exists("Sales Person", name) or frappe.db.exists(
		"Sales Person", {"sales_person_name": name}
	)
	if existing:
		doc = frappe.get_doc("Sales Person", existing)
		if territory and frappe.db.has_column("Sales Person", "tc_territory"):
			doc.tc_territory = territory
			doc.save(ignore_permissions=True)
		return doc.as_dict()
	doc = frappe.get_doc(
		{
			"doctype": "Sales Person",
			"sales_person_name": name,
			"parent_sales_person": _parent_sales_person(),
			"is_group": 0,
			"enabled": 1,
		}
	)
	doc.insert(ignore_permissions=True)
	if territory and frappe.db.has_column("Sales Person", "tc_territory"):
		frappe.db.set_value("Sales Person", doc.name, "tc_territory", territory, update_modified=False)
		doc.tc_territory = territory
	return doc.as_dict()


@frappe.whitelist()
def list_designations():
	require_login()
	if not frappe.db.exists("DocType", "TC Designation"):
		return []
	rows = frappe.get_all(
		"TC Designation",
		fields=["name", "designation_name", "sort_order"],
		order_by="sort_order asc, designation_name asc",
	)
	rows.sort(key=lambda row: (row.designation_name == "Other", row.sort_order or 0, row.designation_name or ""))
	return rows


@frappe.whitelist()
def create_designation(designation_name):
	require_manager()
	name = (designation_name or "").strip()
	if not name:
		frappe.throw("Designation name is required")
	if frappe.db.exists("TC Designation", name):
		return frappe.get_doc("TC Designation", name).as_dict()
	max_order = frappe.db.sql(
		"select coalesce(max(sort_order), 0) from `tabTC Designation` where designation_name != 'Other'"
	)[0][0]
	doc = frappe.get_doc(
		{
			"doctype": "TC Designation",
			"designation_name": name,
			"sort_order": int(max_order or 0) + 1,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def get_settings():
	require_login()
	if not frappe.db.exists("TC Settings", "TC Settings"):
		return {
			"score_floor": 30,
			"weeks_per_month": 4,
			"warn_additional_sample": 1,
			"gps_retention_days": 90,
			"gps_check_meters": 200,
			**tracker_settings(),
		}
	doc = frappe.get_single("TC Settings")
	return {
		"score_floor": doc.score_floor,
		"weeks_per_month": doc.weeks_per_month,
		"warn_additional_sample": doc.warn_additional_sample,
		"gps_retention_days": doc.gps_retention_days,
		"gps_check_meters": cint(doc.get("gps_check_meters") or 200),
		**tracker_settings(),
	}


@frappe.whitelist()
def save_settings(**kwargs):
	require_manager()
	doc = frappe.get_single("TC Settings")
	for key in (
		"score_floor",
		"weeks_per_month",
		"warn_additional_sample",
		"gps_retention_days",
		"gps_check_meters",
		"tracker_start_time",
		"tracker_end_time",
		"location_interval",
	):
		if key in kwargs and kwargs.get(key) not in (None,):
			if doc.meta.has_field(key):
				doc.set(key, kwargs.get(key))
	doc.save(ignore_permissions=True)
	return get_settings()
