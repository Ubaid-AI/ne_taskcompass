import frappe
from frappe.model.document import Document
from frappe.utils import flt


STAGE_ALIASES = {
	"Documents Prepared": "Submitted",
	"Technical Evaluation": "Submitted",
	"Awarded": "Won",
}
STAGES = ("Identified", "Submitted", "Won", "Lost", "Closed")


class TCTender(Document):
	def validate(self):
		if self.stage in STAGE_ALIASES:
			self.stage = STAGE_ALIASES[self.stage]
		if self.stage not in STAGES:
			frappe.throw("Stage must be Identified, Submitted, Won, Lost, or Closed")
		if not (self.po_number or "").strip():
			frappe.throw("PO Number is required")
		if not self.po_date:
			frappe.throw("PO Date is required")
		self.po_number = (self.po_number or "").strip()
		total = 0
		for row in self.items or []:
			row.amount = flt(row.qty) * flt(row.unit_price)
			total += row.amount
		if self.items:
			self.value = total
