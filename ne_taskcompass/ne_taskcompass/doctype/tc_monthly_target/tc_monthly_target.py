import math

import frappe
from frappe.model.document import Document

from ne_taskcompass.engine.scoring import weeks_per_month


class TCMonthlyTarget(Document):
	def validate(self):
		if self.month < 1 or self.month > 12:
			frappe.throw("Month must be between 1 and 12")
		if (self.target_qty or 0) < 0:
			frappe.throw("Target cannot be negative")
		self.weekly_target = math.ceil((self.target_qty or 0) / weeks_per_month())
		if not self.assigned_by:
			self.assigned_by = frappe.session.user
		duplicate = frappe.db.exists(
			"TC Monthly Target",
			{
				"salesperson": self.salesperson,
				"product": self.product,
				"year": self.year,
				"month": self.month,
				"name": ["!=", self.name or "new"],
			},
		)
		if duplicate:
			frappe.throw("A target already exists for this salesperson, product and month")


def on_doctype_update():
	frappe.db.add_unique(
		"TC Monthly Target",
		["salesperson", "product", "year", "month"],
		"unique_target_person_product_month",
	)
