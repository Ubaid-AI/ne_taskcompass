import frappe
from frappe.model.document import Document
from frappe.utils import get_time


class TCSettings(Document):
	def validate(self):
		if self.weeks_per_month and self.weeks_per_month < 1:
			frappe.throw("Weeks Per Month must be at least 1")
		if self.score_floor is not None and (self.score_floor < 0 or self.score_floor > 100):
			frappe.throw("Score Floor must be between 0 and 100")
		if self.location_interval:
			t = get_time(self.location_interval)
			minutes = int(t.hour) * 60 + int(t.minute)
			if minutes < 1:
				frappe.throw("Location Interval must be at least one minute")
