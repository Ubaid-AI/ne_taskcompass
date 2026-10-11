import json

import frappe
from frappe import _

from ne_taskcompass.engine.people import (
	get_sales_person,
	is_tc_admin,
	is_tc_manager,
	is_tc_super_admin,
	require_sales_person,
)


def payload_list(payload, key):
	"""Read a list from a frappe._dict without hitting dict.items / other methods.

	`payload.items` is dict.items when the caller did not send an `items` key.
	Iterating that method raises TypeError: 'builtin_function_or_method' object is not iterable.
	"""
	if payload is None:
		return []
	value = payload.get(key) if hasattr(payload, "get") else None
	if value is None or callable(value):
		return []
	if isinstance(value, str):
		value = json.loads(value) if value.strip() else []
	if isinstance(value, dict):
		return [value]
	if isinstance(value, (list, tuple)):
		return [frappe._dict(v) if isinstance(v, dict) else v for v in value]
	return []


def payload_number(value):
	if value in (None, ""):
		return None
	try:
		return float(value)
	except (TypeError, ValueError):
		return None


def require_login():
	if frappe.session.user in ("Guest", "guest"):
		frappe.throw(_("Please log in"), frappe.AuthenticationError)


def require_manager():
	require_login()
	if not is_tc_manager():
		frappe.throw(_("This action is for management users"), frappe.PermissionError)


def require_admin():
	require_login()
	if not is_tc_admin():
		frappe.throw(_("This action is for management or super admin"), frappe.PermissionError)


def require_super_admin():
	require_login()
	if not is_tc_super_admin():
		frappe.throw(_("Only a super admin can do this"), frappe.PermissionError)


def current_sales_person(required=True):
	if required:
		return require_sales_person()
	return get_sales_person()


def assert_own_or_manager(owner_sp, label="record"):
	"""Managers may change any row. A salesperson may only change their own."""
	if is_tc_manager():
		return
	me = current_sales_person(required=False)
	if me and owner_sp == me:
		return
	frappe.throw(f"You can only change your own {label}", frappe.PermissionError)


def as_dict(doc, fields=None):
	if isinstance(doc, dict):
		data = doc
	else:
		data = doc.as_dict()
	if fields:
		return {k: data.get(k) for k in fields}
	return data


def json_error(exc):
	frappe.local.response.http_status_code = getattr(exc, "http_status_code", 400)
	return {"ok": False, "error": str(exc)}
