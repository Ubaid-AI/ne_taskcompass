import frappe
from frappe.utils import today

from ne_taskcompass.api.setup import _parent_sales_person
from ne_taskcompass.api.utils import require_manager
from ne_taskcompass.engine.people import (
	NEEDS_TERRITORY,
	TC_ROLES,
	get_sales_person_territory,
	is_tc_admin,
	is_tc_super_admin,
)


def assignable_roles(user=None):
	if is_tc_super_admin(user):
		return list(TC_ROLES)
	if is_tc_admin(user):
		return [r for r in TC_ROLES if r != "TC Super Admin"]
	return ["TC Salesperson"]


def _tc_roles_for(user_name):
	return frappe.get_all(
		"Has Role",
		filters={"parent": user_name, "parenttype": "User", "role": ["in", list(TC_ROLES)]},
		pluck="role",
	)


def _people_for(user_name):
	employee = frappe.db.get_value("Employee", {"user_id": user_name}, "name")
	sales_person = None
	territory = None
	if employee:
		sales_person = frappe.db.get_value("Sales Person", {"employee": employee}, "name")
		if sales_person and frappe.db.has_column("Sales Person", "tc_territory"):
			territory = frappe.db.get_value("Sales Person", sales_person, "tc_territory")
	return employee, sales_person, territory


def _serialize(user_name):
	doc = frappe.get_doc("User", user_name)
	roles = _tc_roles_for(user_name)
	employee, sales_person, territory = _people_for(user_name)
	return {
		"name": doc.name,
		"email": doc.email or doc.name,
		"full_name": doc.full_name,
		"first_name": doc.first_name,
		"last_name": doc.last_name,
		"enabled": int(doc.enabled or 0),
		"roles": roles,
		"role": roles[0] if roles else "",
		"employee": employee,
		"sales_person": sales_person,
		"territory": territory,
		"portal_only": int(doc.get("tc_portal_only") or 0) if doc.meta.has_field("tc_portal_only") else 0,
	}


def _assert_can_assign(role):
	if role not in TC_ROLES:
		frappe.throw("Pick one of the four TaskCompass roles")
	if role not in assignable_roles():
		frappe.throw(f"You cannot assign {role}")


def _assert_territory(role, territory):
	territory = (territory or "").strip() or None
	if role in NEEDS_TERRITORY and not territory:
		frappe.throw("Pick a city for this salesperson or sales manager")
	if territory and not frappe.db.exists("Territory", territory):
		frappe.throw("That city / territory does not exist")
	if territory and not is_tc_admin():
		own = get_sales_person_territory()
		if own and territory != own:
			frappe.throw("You can only assign users in your own city")
	return territory


def _default_company():
	return (
		frappe.defaults.get_user_default("Company")
		or frappe.db.get_single_value("Global Defaults", "default_company")
		or frappe.db.get_value("Company", {})
	)


def _ensure_gender(name="Male"):
	if frappe.db.exists("Gender", name):
		return name
	frappe.get_doc({"doctype": "Gender", "gender": name}).insert(ignore_permissions=True)
	return name


def _set_tc_role(user_doc, role):
	keep = [row for row in user_doc.roles if row.role not in TC_ROLES]
	user_doc.roles = []
	for row in keep:
		user_doc.append("roles", {"role": row.role})
	user_doc.append("roles", {"role": role})


def _apply_role_and_portal_flag(user_name, role, portal_only=None):
	user = frappe.get_doc("User", user_name)
	if role:
		_set_tc_role(user, role)
	if portal_only is not None and user.meta.has_field("tc_portal_only"):
		user.tc_portal_only = 1 if int(portal_only) else 0
	user.save(ignore_permissions=True)
	if portal_only:
		frappe.db.set_value("User", user_name, "tc_portal_only", 1, update_modified=False)


def _link_employee_and_sales_person(user_name, full_name, territory, role):
	if role not in NEEDS_TERRITORY:
		return
	company = _default_company()
	if not company:
		frappe.throw("Set a default Company in ERP before creating sales users")
	gender = _ensure_gender("Male")
	parts = [p for p in str(full_name or "").strip().split() if p]
	first = parts[0] if parts else user_name.split("@")[0]
	last = " ".join(parts[1:]) if len(parts) > 1 else ""

	employee = frappe.db.get_value("Employee", {"user_id": user_name}, "name")
	if not employee:
		emp = frappe.get_doc(
			{
				"doctype": "Employee",
				"first_name": first,
				"last_name": last,
				"gender": gender,
				"date_of_birth": "1990-01-01",
				"date_of_joining": today(),
				"status": "Active",
				"company": company,
				"user_id": user_name,
			}
		)
		if emp.meta.has_field("create_user_permission"):
			emp.create_user_permission = 0
		if emp.meta.has_field("naming_series"):
			options = emp.meta.get_field("naming_series").options or "HR-EMP-"
			emp.naming_series = str(options).split("\n")[0]
		emp.insert(ignore_permissions=True)
		employee = emp.name

	sp = frappe.db.get_value("Sales Person", {"employee": employee}, "name")
	if not sp:
		existing = frappe.db.exists("Sales Person", full_name) or frappe.db.exists(
			"Sales Person", {"sales_person_name": full_name}
		)
		if existing:
			sp_doc = frappe.get_doc("Sales Person", existing)
			sp_doc.employee = employee
			sp_doc.enabled = 1
			if territory and sp_doc.meta.has_field("tc_territory"):
				sp_doc.tc_territory = territory
			sp_doc.save(ignore_permissions=True)
			return
		sp_doc = frappe.get_doc(
			{
				"doctype": "Sales Person",
				"sales_person_name": full_name,
				"employee": employee,
				"parent_sales_person": _parent_sales_person(),
				"is_group": 0,
				"enabled": 1,
			}
		)
		sp_doc.insert(ignore_permissions=True)
		if territory and frappe.db.has_column("Sales Person", "tc_territory"):
			frappe.db.set_value("Sales Person", sp_doc.name, "tc_territory", territory, update_modified=False)
		return

	if territory and frappe.db.has_column("Sales Person", "tc_territory"):
		frappe.db.set_value("Sales Person", sp, "tc_territory", territory, update_modified=False)


@frappe.whitelist()
def list_roles():
	require_manager()
	return {
		"roles": list(TC_ROLES),
		"assignable": assignable_roles(),
	}


@frappe.whitelist()
def list_portal_users():
	require_manager()
	if not frappe.db.has_column("User", "tc_portal_only"):
		from ne_taskcompass.install import ensure_portal_only_user_field

		ensure_portal_only_user_field()
		frappe.clear_cache(doctype="User")
	names = frappe.get_all(
		"User",
		filters={
			"tc_portal_only": 1,
			"name": ["not in", ["Guest", "Administrator"]],
		},
		pluck="name",
		order_by="full_name",
	)
	return [_serialize(name) for name in names]


@frappe.whitelist()
def create_portal_user(**kwargs):
	require_manager()
	payload = frappe._dict(kwargs)
	email = (payload.email or "").strip().lower()
	first_name = (payload.first_name or "").strip()
	last_name = (payload.last_name or "").strip()
	password = payload.password or ""
	role = (payload.role or "").strip()
	if not email or "@" not in email:
		frappe.throw("Enter a valid email")
	if not first_name:
		frappe.throw("Enter a first name")
	if len(str(password)) < 8:
		frappe.throw("Password must be at least 8 characters")
	_assert_can_assign(role)
	territory = _assert_territory(role, payload.territory)
	if frappe.db.exists("User", email):
		frappe.throw("A user with that email already exists")

	full_name = " ".join([first_name, last_name]).strip()

	user = frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": first_name,
			"last_name": last_name,
			"enabled": 1,
			"send_welcome_email": 0,
			"user_type": "System User",
			"new_password": password,
		}
	)
	if user.meta.has_field("tc_portal_only"):
		user.tc_portal_only = 1
	_set_tc_role(user, role)
	user.flags.ignore_password_policy = True
	user.flags.no_welcome_mail = True
	frappe.flags.mute_emails = True
	user.insert(ignore_permissions=True)
	_link_employee_and_sales_person(user.name, full_name, territory, role)
	# Employee/User hooks can drop child roles or the custom flag — set both again.
	_apply_role_and_portal_flag(user.name, role, portal_only=1)
	frappe.clear_cache(user=user.name)
	return _serialize(user.name)


@frappe.whitelist()
def update_portal_user(name, **kwargs):
	require_manager()
	if name in ("Administrator", "Guest"):
		frappe.throw("That account cannot be changed from the portal")
	if not frappe.db.exists("User", name):
		frappe.throw("User not found")
	payload = frappe._dict(kwargs)
	doc = frappe.get_doc("User", name)
	current_roles = _tc_roles_for(name)
	if not current_roles and not int(doc.get("tc_portal_only") or 0):
		frappe.throw("That user is not a TaskCompass login")

	role = (payload.role or "").strip() or (current_roles[0] if current_roles else "")
	if payload.get("role") not in (None, ""):
		_assert_can_assign(role)
		if name == frappe.session.user and role != "TC Super Admin" and "TC Super Admin" in current_roles:
			frappe.throw("You cannot remove your own super admin role")
		_set_tc_role(doc, role)

	if payload.get("first_name") not in (None, ""):
		doc.first_name = payload.first_name.strip()
	if payload.get("last_name") not in (None,):
		doc.last_name = (payload.last_name or "").strip()
	if payload.get("enabled") not in (None, ""):
		enabled = int(payload.enabled)
		if name == frappe.session.user and not enabled:
			frappe.throw("You cannot disable your own login")
		doc.enabled = enabled
	if doc.meta.has_field("tc_portal_only") and payload.get("portal_only") not in (None, ""):
		doc.tc_portal_only = 1 if int(payload.portal_only) else 0

	password = payload.get("password")
	if password:
		if len(str(password)) < 8:
			frappe.throw("Password must be at least 8 characters")
		doc.new_password = password
		doc.flags.ignore_password_policy = True

	doc.save(ignore_permissions=True)

	full_name = doc.full_name or " ".join([doc.first_name or "", doc.last_name or ""]).strip()
	territory = _assert_territory(role, payload.territory) if payload.get("territory") not in (None, "") else None
	if territory is None:
		_, _, territory = _people_for(name)
		if role in NEEDS_TERRITORY:
			territory = _assert_territory(role, territory)
	if role in NEEDS_TERRITORY:
		_link_employee_and_sales_person(name, full_name, territory, role)
	if role:
		_apply_role_and_portal_flag(name, role)
	frappe.clear_cache(user=name)
	return _serialize(name)
