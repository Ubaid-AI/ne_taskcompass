import frappe
from frappe.model.document import Document


class TCProduct(Document):
	def before_validate(self):
		self.ensure_item()

	def validate(self):
		if self.monthly_target is not None and self.monthly_target < 0:
			frappe.throw("Default Monthly Target cannot be negative")
		if self.unit_price is not None and self.unit_price < 0:
			frappe.throw("Unit Price cannot be negative")
		self.sync_from_item()

	def ensure_item(self):
		if self.item:
			return
		from ne_taskcompass.seed import ensure_item

		self.item = ensure_item(self.product_name, self.category)

	def sync_from_item(self):
		if not self.item or not frappe.db.exists("Item", self.item):
			return
		item_name, rate, item_group = frappe.db.get_value(
			"Item", self.item, ["item_name", "standard_rate", "item_group"]
		)
		if item_name and not self.product_name:
			self.product_name = item_name
		if self.unit_price in (None, "") and rate:
			self.unit_price = rate
		if not self.category and item_group:
			self.category = item_group
