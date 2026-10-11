import frappe
from frappe.model.document import Document

from ne_taskcompass.engine.plan_rules import validate_day_plan
from ne_taskcompass.engine.plan_visits import (
	ensure_visits_for_plan,
	protect_locked_plan_rows,
	rollup_plan_status,
)


class TCDayPlan(Document):
	def validate(self):
		if frappe.db.exists(
			"TC Day Plan",
			{"salesperson": self.salesperson, "plan_date": self.plan_date, "name": ["!=", self.name or "new"]},
		):
			frappe.throw(f"A day plan already exists for {self.salesperson} on {self.plan_date}")
		if not self.status or self.status == "Active":
			self.status = "Pending"
		protect_locked_plan_rows(self)
		validate_day_plan(self)

	def on_update(self):
		if self.flags.in_ensure_visits:
			return
		ensure_visits_for_plan(self)
		if self.status not in ("Closed",):
			rolled = rollup_plan_status(self.name)
			if rolled:
				self.status = rolled


def on_doctype_update():
	frappe.db.add_unique("TC Day Plan", ["salesperson", "plan_date"], "unique_salesperson_plan_date")
