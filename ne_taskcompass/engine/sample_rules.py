import frappe


def other_product_samples(doctor, exclude_product=None, exclude_name=None):
	filters = {"doctor": doctor, "status": ["in", ["Pending", "Approved", "Delivered"]]}
	if exclude_product:
		filters["product"] = ["!=", exclude_product]
	if exclude_name:
		filters["name"] = ["!=", exclude_name]
	return frappe.get_all("TC Sample Order", filters=filters, fields=["name", "product", "status"])


def validate_sample_order(order):
	for field in ("related_surgeries_pm", "total_surgeries_pm", "expected_consumption_pm"):
		value = order.get(field)
		if value is None or value < 0:
			frappe.throw(f"{order.meta.get_label(field)} must be 0 or more")
	if order.related_surgeries_pm > order.total_surgeries_pm:
		frappe.throw("Related surgeries cannot exceed total surgeries")
	if order.status != "Rejected":
		duplicate = frappe.db.exists(
			"TC Sample Order",
			{
				"doctor": order.doctor,
				"product": order.product,
				"status": ["in", ["Pending", "Approved", "Delivered"]],
				"name": ["!=", order.name or "new"],
			},
		)
		if duplicate:
			frappe.throw("This doctor already has a sample order for this product (R4)")
