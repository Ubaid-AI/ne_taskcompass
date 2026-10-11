import json

import frappe
from frappe.utils import getdate

from ne_taskcompass.api.utils import current_sales_person, require_login, require_manager
from ne_taskcompass.engine.people import resolve_sales_person
from ne_taskcompass.engine.scoring import salesperson_score, weeks_per_month


@frappe.whitelist()
def list_targets(salesperson=None, year=None, month=None, history=0):
	require_login()
	today = getdate()
	history = int(history or 0)
	salesperson = salesperson or (None if history else current_sales_person(required=False))
	target_fields = ["name", "salesperson", "product", "year", "month", "target_qty", "weekly_target"]
	achieved_fields = ["salesperson", "product", "year", "month", "week_of_month", "achieved_qty"]
	if history:
		from frappe.utils import add_months, get_first_day

		start = add_months(get_first_day(today), -(history - 1))
		filters = {}
		if salesperson:
			filters["salesperson"] = salesperson
		rows = frappe.get_all("TC Monthly Target", filters=filters, fields=target_fields, limit=2000)
		achieved = frappe.get_all("TC Weekly Achievement", filters=filters, fields=achieved_fields, limit=5000)

		def in_window(y, m):
			return (int(y or 0), int(m or 0)) >= (start.year, start.month)

		rows = [r for r in rows if in_window(r.year, r.month)]
		achieved = [r for r in achieved if in_window(r.year, r.month)]
		return {"targets": rows, "achievements": achieved, "weeks_per_month": weeks_per_month()}

	year = int(year or today.year)
	month = int(month or today.month)
	filters = {"year": year, "month": month}
	if salesperson:
		filters["salesperson"] = salesperson
	rows = frappe.get_all("TC Monthly Target", filters=filters, fields=target_fields)
	achieved = frappe.get_all("TC Weekly Achievement", filters=filters, fields=achieved_fields)
	return {"targets": rows, "achievements": achieved, "weeks_per_month": weeks_per_month()}


@frappe.whitelist()
def set_monthly_targets(salesperson, year, month, lines):
	require_manager()
	if isinstance(lines, str):
		lines = json.loads(lines)
	salesperson = resolve_sales_person(salesperson) or salesperson
	year, month = int(year), int(month)
	saved = []
	for line in lines:
		product = line.get("product")
		qty = int(line.get("target_qty") or 0)
		existing = frappe.db.exists(
			"TC Monthly Target",
			{"salesperson": salesperson, "product": product, "year": year, "month": month},
		)
		if existing:
			doc = frappe.get_doc("TC Monthly Target", existing)
			doc.target_qty = qty
			doc.save(ignore_permissions=True)
		else:
			doc = frappe.get_doc(
				{
					"doctype": "TC Monthly Target",
					"salesperson": salesperson,
					"product": product,
					"year": year,
					"month": month,
					"target_qty": qty,
				}
			)
			doc.insert(ignore_permissions=True)
		saved.append(doc.as_dict())
	return saved


@frappe.whitelist()
def set_weekly_achieved(salesperson, year, month, week_of_month, lines):
	require_manager()
	if isinstance(lines, str):
		lines = json.loads(lines)
	salesperson = resolve_sales_person(salesperson) or salesperson
	year, month, week_of_month = int(year), int(month), int(week_of_month)
	saved = []
	for line in lines:
		product = line.get("product")
		qty = int(line.get("achieved_qty") or 0)
		existing = frappe.db.exists(
			"TC Weekly Achievement",
			{
				"salesperson": salesperson,
				"product": product,
				"year": year,
				"month": month,
				"week_of_month": week_of_month,
			},
		)
		if existing:
			doc = frappe.get_doc("TC Weekly Achievement", existing)
			doc.achieved_qty = qty
			doc.save(ignore_permissions=True)
		else:
			doc = frappe.get_doc(
				{
					"doctype": "TC Weekly Achievement",
					"salesperson": salesperson,
					"product": product,
					"year": year,
					"month": month,
					"week_of_month": week_of_month,
					"achieved_qty": qty,
				}
			)
			doc.insert(ignore_permissions=True)
		saved.append(doc.as_dict())
	return saved


@frappe.whitelist()
def my_score(year=None, month=None, salesperson=None):
	require_login()
	today = getdate()
	salesperson = salesperson or current_sales_person()
	return salesperson_score(salesperson, int(year or today.year), int(month or today.month))
