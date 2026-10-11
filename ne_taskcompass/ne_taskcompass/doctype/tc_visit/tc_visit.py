import frappe
from frappe.model.document import Document
from frappe.utils import get_datetime, now_datetime

from ne_taskcompass.engine.plan_visits import sync_plan_item_from_visit
from ne_taskcompass.engine.visit_rules import validate_visit


class TCVisit(Document):
	def validate(self):
		if not self.product:
			frappe.throw("Product is required on every visit (D2)")
		if not self.status:
			self.status = "Pending"
		if self.checkin_latitude not in (None, "") and self.latitude in (None, ""):
			self.latitude = self.checkin_latitude
		if self.checkin_longitude not in (None, "") and self.longitude in (None, ""):
			self.longitude = self.checkin_longitude
		if self.checkin_time and not self.visited_at:
			self.visited_at = self.checkin_time
		if not self.visited_at:
			self.visited_at = now_datetime()
		if self.checkin_time and self.checkout_time:
			if get_datetime(self.checkout_time) < get_datetime(self.checkin_time):
				frappe.throw("Check-out time must be after check-in time")
		validate_visit(self)
		if self.day_plan_item:
			self.cycle_key = f"plan::{self.day_plan}::{self.day_plan_item}"
		elif self.is_followup:
			if not self.cycle_key:
				self.cycle_key = f"fu::{self.doctor}::{self.product}::{frappe.generate_hash(length=10)}"
		else:
			self.cycle_key = f"{self.doctor}::{self.product}::{int(self.visit_number or 0)}"

	def on_update(self):
		if not self.flags.from_day_plan:
			sync_plan_item_from_visit(self)
		if self.is_followup:
			self._upsert_monthly_sales()

	def _upsert_monthly_sales(self):
		visited = get_datetime(self.visited_at)
		year, month = visited.year, visited.month
		existing = frappe.db.exists(
			"TC Doctor Monthly Sales",
			{"doctor": self.doctor, "product": self.product, "year": year, "month": month},
		)
		values = {
			"qty": self.our_units or 0,
			"competitor_qty": self.competitor_units or 0,
			"recorded_by": self.salesperson,
		}
		if existing:
			doc = frappe.get_doc("TC Doctor Monthly Sales", existing)
			doc.update(values)
			doc.save(ignore_permissions=True)
			return
		frappe.get_doc(
			{
				"doctype": "TC Doctor Monthly Sales",
				"doctor": self.doctor,
				"product": self.product,
				"year": year,
				"month": month,
				**values,
			}
		).insert(ignore_permissions=True)
