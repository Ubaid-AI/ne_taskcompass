app_name = "ne_taskcompass"
app_title = "NE TaskCompass"
app_publisher = "Ubaid Khanzada"
app_description = "Field force automation and CRM for National Enterprises"
app_email = "ubaidkhanzada8@gmail.com"
app_license = "MIT"

required_apps = ["erpnext"]

after_install = "ne_taskcompass.install.after_install"
after_migrate = "ne_taskcompass.install.after_migrate"

app_include_css = "/assets/ne_taskcompass/css/ne_taskcompass.css"

website_route_rules = [
	{"from_route": "/livetrack/<path:app_path>", "to_route": "livetrack"},
]

on_session_creation = "ne_taskcompass.session.on_session_creation"
before_request = ["ne_taskcompass.session.before_request"]
get_website_user_home_page = "ne_taskcompass.session.get_website_user_home_page"

permission_query_conditions = {
	"TC Doctor": "ne_taskcompass.permissions.doctor_query",
	"TC Visit": "ne_taskcompass.permissions.visit_query",
	"TC Day Plan": "ne_taskcompass.permissions.day_plan_query",
	"TC Sample Order": "ne_taskcompass.permissions.sample_query",
	"TC Follow Up": "ne_taskcompass.permissions.followup_query",
	"TC Monthly Target": "ne_taskcompass.permissions.monthly_target_query",
	"TC Weekly Achievement": "ne_taskcompass.permissions.weekly_achievement_query",
	"TC Doctor Monthly Sales": "ne_taskcompass.permissions.doctor_linked_query",
	"TC Doctor Edit Request": "ne_taskcompass.permissions.edit_request_query",
	"TC Performance Event": "ne_taskcompass.permissions.performance_event_query",
	"TC Tender": "ne_taskcompass.permissions.tender_query",
	"TC Notification": "ne_taskcompass.permissions.notification_query",
	"TC Sales Person Tracker": "ne_taskcompass.permissions.sales_person_tracker_query",
}

has_permission = {
	"TC Doctor": "ne_taskcompass.permissions.has_doctor_permission",
	"TC Visit": "ne_taskcompass.permissions.has_salesperson_owned_permission",
	"TC Day Plan": "ne_taskcompass.permissions.has_salesperson_owned_permission",
	"TC Sample Order": "ne_taskcompass.permissions.has_sample_permission",
	"TC Follow Up": "ne_taskcompass.permissions.has_followup_permission",
	"TC Monthly Target": "ne_taskcompass.permissions.has_salesperson_owned_permission",
	"TC Weekly Achievement": "ne_taskcompass.permissions.has_salesperson_owned_permission",
	"TC Doctor Monthly Sales": "ne_taskcompass.permissions.has_doctor_linked_permission",
	"TC Doctor Edit Request": "ne_taskcompass.permissions.has_edit_request_permission",
	"TC Performance Event": "ne_taskcompass.permissions.has_salesperson_owned_permission",
	"TC Tender": "ne_taskcompass.permissions.has_tender_permission",
	"TC Notification": "ne_taskcompass.permissions.has_notification_permission",
	"TC Sales Person Tracker": "ne_taskcompass.permissions.has_salesperson_owned_permission",
}

doc_events = {
	"TC Doctor": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
		"on_trash": "ne_taskcompass.realtime.emit_doc_change",
	},
	"TC Visit": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
		"on_trash": "ne_taskcompass.realtime.emit_doc_change",
	},
	"TC Day Plan": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
	},
	"TC Sample Order": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
	},
	"TC Follow Up": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
	},
	"TC Monthly Target": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
	},
	"TC Weekly Achievement": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
	},
	"TC Tender": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
	},
	"TC Doctor Edit Request": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
	},
	"TC Performance Event": {
		"on_update": "ne_taskcompass.realtime.emit_doc_change",
	},
	"User": {
		"on_update": "ne_taskcompass.session.on_user_update",
	},
}

fixtures = [
	{"dt": "TC Designation"},
]

scheduler_events = {
	"hourly": [
		"ne_taskcompass.notifications.expire_stale_checks",
	],
}
