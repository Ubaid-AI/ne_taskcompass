import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

from ne_taskcompass.engine.sample_rules import other_product_samples, validate_sample_order


class TCSampleOrder(Document):
	def validate(self):
		validate_sample_order(self)
		if self.total_surgeries_pm:
			self.relevance_pct = round((self.related_surgeries_pm or 0) * 100 / self.total_surgeries_pm, 2)
		else:
			self.relevance_pct = 0
		if self.status != "Rejected":
			self.sample_key = f"{self.doctor}::{self.product}"
		else:
			self.sample_key = f"rejected::{self.name or frappe.generate_hash(length=10)}"

		if self.status in ("Approved", "Rejected") and not self.reviewed_by:
			self.reviewed_by = frappe.session.user
			self.reviewed_at = now_datetime()

		others = other_product_samples(self.doctor, exclude_product=self.product, exclude_name=self.name)
		if others:
			self.approval_warning = (
				"This doctor already has sample(s) for: "
				+ ", ".join(f"{r.product} ({r.status})" for r in others)
			)
		else:
			self.approval_warning = ""
