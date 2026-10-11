import os

import frappe
from frappe import _

from ne_taskcompass.brand import get_branding
from ne_taskcompass.session import is_portal_only

no_cache = 1
sitemap = 0


def get_context(context):
	brand = get_branding()
	context.no_cache = 1
	context.no_header = 1
	context.no_breadcrumbs = 1
	context.full_width = True
	context.app_logo = brand["logo"]
	context.splash_image = brand["splash"]
	context.favicon = brand["favicon"]
	context.brand_json = frappe.as_json(brand)
	js_path = frappe.get_app_path("ne_taskcompass", "public", "frontend", "assets", "index.js")
	context.build_version = (
		str(int(os.path.getmtime(js_path))) if os.path.exists(js_path) else frappe.utils.get_build_version()
	)

	# Guests see the portal sign-in screen. Desk users with the portal-only
	# flag, and managers, see the app. Everyone else is sent to Desk.
	if frappe.session.user == "Guest":
		return

	roles = set(frappe.get_roles())
	allowed = {"System Manager", "TC Super Admin", "TC Management", "TC Sales Manager", "Administrator"}
	if is_portal_only() or frappe.session.user == "Administrator" or (roles & allowed):
		path = (getattr(frappe.local, "request", None) and frappe.request.path or "").rstrip("/")
		if path.startswith("/livetrack/") and path != "/livetrack":
			rest = path[len("/livetrack") :]
			frappe.local.flags.redirect_location = f"/livetrack#{rest}"
			raise frappe.Redirect
		return

	frappe.throw(_("The LiveTrack portal is for management users"), frappe.PermissionError)
