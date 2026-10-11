import frappe
from frappe.model.document import Document
from frappe.utils import cint, now_datetime


class TCFollowUp(Document):
	def validate(self):
		if self.target_share not in (None, ""):
			self.target_share = cint(self.target_share)
			if self.target_share < 0 or self.target_share > 100:
				frappe.throw("Share to win must be between 0 and 100")
		else:
			self.target_share = None
		if not self.assigned_to:
			self.assigned_to = frappe.db.get_value("TC Doctor", self.doctor, "assigned_to")
		if not self.assigned_to:
			frappe.throw("Assign to salesperson is required")
		if not self.assigned_by:
			self.assigned_by = frappe.session.user
		if not self.assigned_at:
			self.assigned_at = now_datetime()
		if self.status == "Active":
			self.followup_key = f"{self.doctor}::{self.product}"
			duplicate = frappe.db.exists(
				"TC Follow Up",
				{
					"doctor": self.doctor,
					"product": self.product,
					"status": "Active",
					"name": ["!=", self.name or "new"],
				},
			)
			if duplicate:
				frappe.throw("This doctor and product already has an active follow up")
		else:
			self.followup_key = f"{self.status}::{self.name or frappe.generate_hash(length=10)}"
			if self.status == "Closed" and not self.closed_at:
				self.closed_at = now_datetime()

	def on_update(self):
		self._sync_doctor_flag()

	def on_trash(self):
		self._sync_doctor_flag()

	def _sync_doctor_flag(self):
		if not self.doctor:
			return
		active = frappe.get_all(
			"TC Follow Up",
			filters={"doctor": self.doctor, "status": "Active"},
			fields=["competitor_name"],
		)
		frappe.db.set_value(
			"TC Doctor",
			self.doctor,
			{
				"uses_competitor": 1 if active else 0,
				"competitor_names": ", ".join({r.competitor_name for r in active if r.competitor_name}),
			},
			update_modified=False,
		)
