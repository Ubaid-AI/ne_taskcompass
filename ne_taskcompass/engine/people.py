import frappe

TC_ROLES = (
	"TC Salesperson",
	"TC Sales Manager",
	"TC Management",
	"TC Super Admin",
)
PORTAL_ROLES = ("TC Sales Manager", "TC Management", "TC Super Admin")
NEEDS_TERRITORY = {"TC Salesperson", "TC Sales Manager"}

ADMIN_ROLES = {"System Manager", "TC Super Admin", "TC Management"}
MANAGER_ROLES = ADMIN_ROLES | {"TC Sales Manager"}


def is_tc_super_admin(user=None):
	user = user or frappe.session.user
	if user == "Administrator":
		return True
	return bool(set(frappe.get_roles(user)) & {"System Manager", "TC Super Admin"})


def is_tc_admin(user=None):
	user = user or frappe.session.user
	if user == "Administrator":
		return True
	return bool(set(frappe.get_roles(user)) & ADMIN_ROLES)


def is_tc_manager(user=None):
	user = user or frappe.session.user
	if user == "Administrator":
		return True
	return bool(set(frappe.get_roles(user)) & MANAGER_ROLES)


def get_employee(user=None):
	user = user or frappe.session.user
	return frappe.db.get_value("Employee", {"user_id": user}, "name")


def get_sales_person(user=None):
	employee = get_employee(user)
	if not employee:
		return None
	return frappe.db.get_value("Sales Person", {"employee": employee, "enabled": 1}, "name")


def get_sales_person_territory(sales_person=None, user=None):
	sp = sales_person or get_sales_person(user)
	if not sp:
		return None
	if frappe.db.has_column("Sales Person", "tc_territory"):
		return frappe.db.get_value("Sales Person", sp, "tc_territory")
	return None


def get_managed_sales_persons(user=None):
	"""Sales Person names this user may see: self, nested-set descendants, same territory for managers."""
	user = user or frappe.session.user
	if is_tc_admin(user):
		return frappe.get_all("Sales Person", filters={"enabled": 1}, pluck="name")

	sp = get_sales_person(user)
	if not sp:
		return []

	lft, rgt = frappe.db.get_value("Sales Person", sp, ["lft", "rgt"]) or (None, None)
	names = set()
	if lft is not None and rgt is not None:
		names.update(
			frappe.get_all(
				"Sales Person",
				filters={"enabled": 1, "lft": [">=", lft], "rgt": ["<=", rgt]},
				pluck="name",
			)
		)
	else:
		names.add(sp)

	if "TC Sales Manager" in frappe.get_roles(user):
		territory = get_sales_person_territory(sp)
		if territory:
			names.update(
				frappe.get_all(
					"Sales Person",
					filters={"enabled": 1, "tc_territory": territory},
					pluck="name",
				)
			)
	return list(names)


def resolve_sales_person(value):
	"""Accept a Sales Person name or display name from the portal picker."""
	if not value or str(value).strip() in ("", "Doctor's own rep"):
		return None
	value = str(value).strip()
	if frappe.db.exists("Sales Person", value):
		return value
	return frappe.db.get_value("Sales Person", {"sales_person_name": value, "enabled": 1}, "name")


def require_sales_person(user=None):
	sp = get_sales_person(user)
	if not sp:
		frappe.throw(
			"No Sales Person is linked to your Employee record. Ask an admin to set Employee on Sales Person and User ID on Employee.",
			frappe.PermissionError,
		)
	return sp
