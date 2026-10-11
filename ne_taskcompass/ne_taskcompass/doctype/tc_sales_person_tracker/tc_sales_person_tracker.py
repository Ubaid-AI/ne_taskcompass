import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class TCSalesPersonTracker(Document):
	def validate(self):
		if not self.tracked_at:
			self.tracked_at = now_datetime()
		try:
			lat = float(self.latitude)
			lng = float(self.longitude)
		except (TypeError, ValueError):
			frappe.throw("Latitude and longitude are required")
		if lat < -90 or lat > 90:
			frappe.throw("Latitude must be between -90 and 90")
		if lng < -180 or lng > 180:
			frappe.throw("Longitude must be between -180 and 180")
