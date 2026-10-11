import frappe

from ne_taskcompass.api.utils import require_login
from ne_taskcompass.engine.pipeline import STAGES, build_pipeline


@frappe.whitelist()
def get_pipeline(salesperson=None):
	require_login()
	opps = build_pipeline({"salesperson": salesperson} if salesperson else {})
	counts = {}
	for row in opps:
		counts[row["stage"]] = counts.get(row["stage"], 0) + 1
	return {"stages": STAGES, "counts": counts, "opportunities": opps}
