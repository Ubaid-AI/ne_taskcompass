import frappe
from frappe.model.document import Document


class TCDoctorMonthlySales(Document):
	def validate(self):
		if self.month < 1 or self.month > 12:
			frappe.throw("Month must be between 1 and 12")
		if (self.qty or 0) < 0 or (self.competitor_qty or 0) < 0:
			frappe.throw("Quantities cannot be negative")
		duplicate = frappe.db.exists(
			"TC Doctor Monthly Sales",
			{
				"doctor": self.doctor,
				"product": self.product,
				"year": self.year,
				"month": self.month,
				"name": ["!=", self.name or "new"],
			},
		)
		if duplicate:
			frappe.throw("Sales for this doctor, product and month already exist")


def on_doctype_update():
	frappe.db.add_unique(
		"TC Doctor Monthly Sales",
		["doctor", "product", "year", "month"],
		"unique_doctor_product_month",
	)
