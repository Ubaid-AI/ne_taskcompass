import frappe


def _single(doctype, field):
	try:
		if frappe.db.has_column(doctype, field):
			return frappe.db.get_single_value(doctype, field)
	except Exception:
		return None
	return None


def _hook_logo():
	try:
		urls = frappe.get_hooks("app_logo_url") or []
		if urls:
			return urls[-1]
	except Exception:
		pass
	try:
		ctx = frappe.get_hooks("website_context") or {}
		for key in ("favicon", "splash_image"):
			val = ctx.get(key)
			if isinstance(val, (list, tuple)) and val:
				return val[-1]
			if isinstance(val, str) and val:
				return val
	except Exception:
		pass
	return "/assets/erpnext/images/NE.svg"


def get_branding():
	"""Same logo ERPNext uses on the login card, splash, navbar and favicon."""
	fallback = _hook_logo()
	logo = (
		_single("Navbar Settings", "app_logo")
		or _single("Website Settings", "app_logo")
		or _single("Website Settings", "banner_image")
		or _single("Website Settings", "splash_image")
		or fallback
	)
	splash = _single("Website Settings", "splash_image") or logo
	favicon = _single("Website Settings", "favicon") or logo
	return {"logo": logo, "splash": splash, "favicon": favicon}
