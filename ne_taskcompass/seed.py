import frappe
from frappe.utils import cstr

PRODUCTS = [
	("Glubran 0.5 ml", "Adhesives & Sealants", 50),
	("Glubran 1 ml", "Adhesives & Sealants", 50),
	("ImmiSeal", "Adhesives & Sealants", 25),
	("Stypcel", "Haemostats", 700),
	("Raney Clips", "Disposables", 300),
	("Perforators", "Power Tools", 100),
	("Burs", "Power Tools", 100),
	("Dura Patch (RDS/RDP)", "Implants", 25),
	("Surgical Patties", "Disposables", 700),
	("Programmable Shunts", "Shunts", 14),
	("Ommaya Reservoir / Connector", "Shunts", 7),
	("EVD", "Drainage", 20),
	("VP Shunts", "Shunts", 20),
	("LP Shunts", "Shunts", 7),
	("Pana Spray", "Disposables", 14),
	("Cotton Balls", "Disposables", 70),
]

ITEM_GROUP = "NE TaskCompass"


def seed_products():
	if not frappe.db.exists("DocType", "TC Product"):
		return
	try:
		ensure_item_group()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "NE TaskCompass Item Group seed")
	for name, category, monthly_target in PRODUCTS:
		item_code = None
		try:
			item_code = ensure_item(name, category)
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"NE TaskCompass Item seed: {name}")
		if frappe.db.exists("TC Product", name):
			if item_code and not frappe.db.get_value("TC Product", name, "item"):
				frappe.db.set_value("TC Product", name, "item", item_code, update_modified=False)
			continue
		doc = {
			"doctype": "TC Product",
			"product_name": name,
			"category": category,
			"monthly_target": monthly_target,
			"currency": "PKR",
		}
		if item_code:
			doc["item"] = item_code
		frappe.get_doc(doc).insert(ignore_permissions=True)


def item_code_for(product_name):
	return " ".join(cstr(product_name).replace("/", "-").split())


def ensure_item_group():
	if frappe.db.exists("Item Group", ITEM_GROUP):
		return ITEM_GROUP
	parent = "All Item Groups"
	if not frappe.db.exists("Item Group", parent):
		parent = frappe.db.get_value("Item Group", {"is_group": 1}, "name") or parent
	frappe.get_doc(
		{
			"doctype": "Item Group",
			"item_group_name": ITEM_GROUP,
			"parent_item_group": parent,
			"is_group": 0,
		}
	).insert(ignore_permissions=True)
	return ITEM_GROUP


def ensure_item(product_name, category=None):
	if not product_name:
		return None
	ensure_item_group()
	code = item_code_for(product_name)
	if frappe.db.exists("Item", code):
		return code
	existing = frappe.db.get_value("Item", {"item_name": product_name}, "name")
	if existing:
		return existing
	uom = "Nos"
	if not frappe.db.exists("UOM", uom):
		uom = frappe.db.get_single_value("Stock Settings", "stock_uom") or uom
	doc = frappe.get_doc(
		{
			"doctype": "Item",
			"item_code": code,
			"item_name": product_name,
			"item_group": ITEM_GROUP,
			"stock_uom": uom,
			"is_stock_item": 0,
			"is_sales_item": 1,
			"is_purchase_item": 1,
			"description": category or product_name,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name
