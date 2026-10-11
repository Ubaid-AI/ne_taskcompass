import frappe
from frappe.model.document import Document

from ne_taskcompass.engine.scoring import weeks_per_month


class TCWeeklyAchievement(Document):
	def validate(self):
		if self.month < 1 or self.month > 12:
			frappe.throw("Month must be between 1 and 12")
		weeks = weeks_per_month()
		if self.week_of_month < 1 or self.week_of_month > max(weeks, 5):
			frappe.throw(f"Week of month must be between 1 and {max(weeks, 5)}")
		if (self.achieved_qty or 0) < 0:
			frappe.throw("Achieved quantity cannot be negative")
		if not self.entered_by:
			self.entered_by = frappe.session.user
		duplicate = frappe.db.exists(
			"TC Weekly Achievement",
			{
				"salesperson": self.salesperson,
				"product": self.product,
				"year": self.year,
				"month": self.month,
				"week_of_month": self.week_of_month,
				"name": ["!=", self.name or "new"],
			},
		)
		if duplicate:
			frappe.throw("Achievement for this salesperson, product, month and week already exists")


def on_doctype_update():
	frappe.db.add_unique(
		"TC Weekly Achievement",
		["salesperson", "product", "year", "month", "week_of_month"],
		"unique_weekly_achievement",
	)
