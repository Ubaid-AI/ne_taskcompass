import mimetypes
import os
import re
from urllib.parse import urlparse

import frappe
from frappe.utils.file_manager import get_file_path

FILE_URL_RE = re.compile(r"(/?(?:private/)?files/[^\s\]\"'<>]+)", re.IGNORECASE)
BRACKET_FILE_RE = re.compile(
	r"\[([^\[\]]+?):\s*(/?(?:private/)?files/[^\]]+)\]",
	re.IGNORECASE,
)


def normalize_file_url(url):
	url = (url or "").strip()
	if not url:
		return ""
	if url.startswith("http://") or url.startswith("https://"):
		path = urlparse(url).path or ""
		url = path
	if url.startswith("private/files/") or url.startswith("files/"):
		url = "/" + url
	return url


def extract_note_files(text):
	"""Pull caption + file URL pairs out of notes the mobile app writes."""
	text = text or ""
	found = []
	seen = set()
	for match in BRACKET_FILE_RE.finditer(text):
		url = normalize_file_url(match.group(2))
		if url and url not in seen:
			seen.add(url)
			found.append({"caption": (match.group(1) or "").strip(), "image": url})
	for match in FILE_URL_RE.finditer(text):
		url = normalize_file_url(match.group(1))
		if url and url not in seen:
			seen.add(url)
			found.append({"caption": "", "image": url})
	return found


def strip_file_notes(text):
	text = BRACKET_FILE_RE.sub("", text or "")
	text = FILE_URL_RE.sub("", text)
	return re.sub(r"[ \t]+\n", "\n", text).strip()


def is_public_file_url(url):
	url = normalize_file_url(url)
	return url.startswith("/files/") and not url.startswith("/private/")


def safe_disk_path(file_url):
	if not file_url or ".." in file_url:
		return None
	path = get_file_path(file_url)
	if not path:
		return None
	real = os.path.realpath(path)
	private_root = os.path.realpath(frappe.get_site_path("private", "files"))
	public_root = os.path.realpath(frappe.get_site_path("public", "files"))
	if not (real.startswith(private_root + os.sep) or real.startswith(public_root + os.sep)):
		return None
	if not os.path.isfile(real):
		return None
	return real


def serve_file_url(file_url):
	"""Stream a site file inline so an <img> can display it."""
	file_url = normalize_file_url(file_url)
	if not file_url:
		frappe.throw("File not found")
	filename = os.path.basename(file_url)
	content = None
	disk_path = safe_disk_path(file_url)
	if disk_path:
		filename = os.path.basename(disk_path)
		with open(disk_path, "rb") as handle:
			content = handle.read()
	else:
		file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
		if file_name:
			content = frappe.get_doc("File", file_name).get_content()
			filename = frappe.db.get_value("File", file_name, "file_name") or filename
	if not content:
		frappe.throw("File not found")
	frappe.local.response.filename = filename
	frappe.local.response.filecontent = content
	frappe.local.response.type = "download"
	frappe.local.response.display_content_as = "inline"
	frappe.local.response.content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
