import frappe


PORTAL_PATH = "/livetrack"


def is_portal_only(user=None):
	user = user or frappe.session.user
	if not user or user in ("Guest", "Administrator"):
		return False
	try:
		if not frappe.db.has_column("User", "tc_portal_only"):
			return False
		return bool(frappe.db.get_value("User", user, "tc_portal_only"))
	except Exception:
		return False


def get_website_user_home_page(user):
	if is_portal_only(user):
		return "livetrack"
	return None


def on_session_creation(login_manager=None):
	"""Send portal-only users to LiveTrack and desk users to Desk after any login page."""
	if frappe.session.user in ("Guest",):
		return
	if is_portal_only():
		frappe.local.response["home_page"] = PORTAL_PATH
		frappe.local.response["redirect_to"] = PORTAL_PATH


def on_user_update(doc, method=None):
	"""Frappe 14 User has no home_page field. Routing is handled in on_session_creation / before_request."""
	try:
		frappe.cache().hdel("home_page", doc.name)
		frappe.clear_cache(user=doc.name)
	except Exception:
		pass


def before_request():
	"""Keep portal-only users on LiveTrack if they open Desk while signed in.

	Must never raise except Redirect — this runs on every page, including login.
	"""
	try:
		user = getattr(frappe.session, "user", None)
		if not user or user in ("Guest", "Administrator"):
			return
		request = getattr(frappe.local, "request", None)
		if not request:
			return
		path = (request.path or "").split("?")[0]
		if path.startswith("/api") or path.startswith("/assets") or path.startswith("/files"):
			return
		if path.startswith("/app") or path.startswith("/desk"):
			if is_portal_only():
				frappe.local.flags.redirect_location = PORTAL_PATH
				raise frappe.Redirect
	except frappe.Redirect:
		raise
	except Exception:
		return
