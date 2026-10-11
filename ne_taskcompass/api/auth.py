import frappe
from frappe.auth import LoginManager

from ne_taskcompass.api.tracker import tracker_settings
from ne_taskcompass.api.utils import require_login
from ne_taskcompass.brand import get_branding
from ne_taskcompass.engine.people import get_employee, get_sales_person, get_sales_person_territory, is_tc_admin, is_tc_manager, is_tc_super_admin


@frappe.whitelist(allow_guest=True)
def login(usr, pwd):
	frappe.local.login_manager = LoginManager()
	frappe.local.login_manager.authenticate(usr, pwd)
	frappe.local.login_manager.post_login()
	return me()


@frappe.whitelist()
def logout():
	frappe.local.login_manager.logout()
	return {"ok": True}


@frappe.whitelist()
def me():
	require_login()
	user = frappe.session.user
	user_doc = frappe.get_cached_doc("User", user)
	roles = frappe.get_roles(user)
	sp = get_sales_person(user)
	return {
		"ok": True,
		"user": user,
		"full_name": user_doc.full_name,
		"email": user_doc.email or user,
		"phone": user_doc.phone or user_doc.mobile_no,
		"user_image": user_doc.user_image,
		"roles": roles,
		"is_manager": is_tc_manager(user),
		"is_admin": is_tc_admin(user),
		"is_super_admin": is_tc_super_admin(user),
		"portal_only": bool(user_doc.get("tc_portal_only") if user_doc.meta.has_field("tc_portal_only") else 0),
		"brand": get_branding(),
		"employee": get_employee(user),
		"sales_person": sp,
		"territory": get_sales_person_territory(sp) if sp else None,
		"tracker": tracker_settings(),
	}


@frappe.whitelist()
def generate_keys():
	"""Create or rotate API keys for the logged-in user (mobile clients)."""
	require_login()
	user = frappe.get_doc("User", frappe.session.user)
	api_secret = frappe.generate_hash(length=15)
	if not user.api_key:
		user.api_key = frappe.generate_hash(length=15)
	user.api_secret = api_secret
	user.save(ignore_permissions=True)
	return {"ok": True, "api_key": user.api_key, "api_secret": api_secret}
