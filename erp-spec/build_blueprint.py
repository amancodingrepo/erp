#!/usr/bin/env python3
"""Turn the raw MPOnline crawl into a college-ERP blueprint.

This is a domain map (screens + operations), not a clone of their app
and not a dump of HTML/JS. Source paths are kept for traceability.
"""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent

JUNK_EXACT = {
    "/action_page.php",
    "/process.php",
    "/addrequest",
    "/none",
    "/collect",
    "/staff_id",
    "/atkt",
    "/feemaster",
    "/delete_all_remuneration",
    "/delete_remuneration_row",
}
JUNK_PREFIX = (
    "/backend/",
    "/uploads/",
    "/./",
    "/testmail",
)
JUNK_SUFFIX = (".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".php")

# Chrome that is injected on almost every admin page — not a real module API.
GLOBAL_CHROME = {
    "/admin/currency/change_currency",
    "/admin/multibranch/branch/switchbranchlist",
    "/admin/multibranch/branch/switch",
    "/admin/multibranch/branch",
    "/admin/calendar/saveevent",
    "/admin/calendar/updateevent",
    "/admin/calendar/markcomplete/",
    "/admin/calendar/delete_event/",
    "/admin/calendar/getevents",
    "/admin/calendar/view_event/",
    "/admin/calendar/addtodo",
    "/admin/calendar/gettaskbyid/",
    "/admin/calendar/shift_event",
    "/admin/admin/search",
    "/admin/admin/activeSession",
    "/admin/admin/getSession",
    "/admin/admin/updateSession",
    "/admin/alumni/getevent",
    "/admin/language/user_language/",
    "/admin/notification/notification_clear",
    "/admin/notification/notification_read",
    "/welcome/token",
    "/site/logout",
    "/site/login",
    "/report/get_betweendate/",
}

SKIP_SCREENS = {
    "/site/logout",
    "/admin/admin/backup",
    "/admin/admin/changepass",
}

# First matching rule wins.
MODULE_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(p, re.I), mid)
    for p, mid in [
        (r"^/admin/admission", "admission"),
        (r"^/admin/onlineadmission", "admission"),
        (r"^/admin/onlineinternatinaladmission", "admission"),
        (r"^/admin/onlinestudent", "admission"),
        (r"^/admin/admission_transfer", "admission"),
        (r"^/admin/enquiry", "front-office"),
        (r"^/admin/visitors", "front-office"),
        (r"^/admin/generalcall", "front-office"),
        (r"^/admin/dispatch", "front-office"),
        (r"^/admin/receive", "front-office"),
        (r"^/admin/complaint", "front-office"),
        (r"^/admin/inward", "front-office"),
        (r"^/admin/outward", "front-office"),
        (r"^/report/setfrontoffice", "front-office"),
        (r"^/report/inward", "front-office"),
        (r"^/report/outward", "front-office"),
        (r"^/studentfee", "fees"),
        (r"^/admin/fee", "fees"),
        (r"^/admin/assign_variable_fees", "fees"),
        (r"^/admin/offlinepayment", "fees"),
        (r"^/admin/others_fees", "fees"),
        (r"^/admin/paymentcategory", "fees"),
        (r"^/admin/paymentsettings", "fees"),
        (r"^/admin/fine_rules", "fees"),
        (r"^/admin/fees_", "fees"),
        (r"^/admin/income", "finance"),
        (r"^/admin/expense", "finance"),
        (r"^/financereports", "finance"),
        (r"^/admin/stuattendence", "attendance"),
        (r"^/admin/subjectattendence", "attendance"),
        (r"^/admin/staffattendance", "attendance"),
        (r"^/attendencereports", "attendance"),
        (r"^/admin/exam", "examinations"),
        (r"^/admin/atkt", "examinations"),
        (r"^/atkt_form", "examinations"),
        (r"^/atkt/", "examinations"),
        (r"^/admin/revaluation_form", "examinations"),
        (r"^/user/exam", "examinations"),
        (r"^/admin/grade", "examinations"),
        (r"^/admin/mark", "examinations"),
        (r"^/admin/admitcard", "examinations"),
        (r"^/admin/paper", "examinations"),
        (r"^/admin/question", "examinations"),
        (r"^/admin/onlineexam", "examinations"),
        (r"^/admin/result_remark", "examinations"),
        (r"^/seating_arrangement", "examinations"),
        (r"^/admin/staffpayroll", "payroll"),
        (r"^/staffpayrollreports", "payroll"),
        (r"^/admin/payroll", "payroll"),
        (r"^/admin/staff", "hr"),
        (r"^/admin/leaverequest", "hr"),
        (r"^/admin/leavetypes", "hr"),
        (r"^/admin/leave_", "hr"),
        (r"^/admin/approve_leave", "hr"),
        (r"^/admin/designation", "hr"),
        (r"^/admin/department", "hr"),
        (r"^/department$", "hr"),
        (r"^/admin/disable_reason", "hr"),
        (r"^/admin/hr_recruitment", "hr"),
        (r"^/admin/generatestaffidcard", "hr"),
        (r"^/admin/staffidcard", "hr"),
        (r"^/admin/staff_certificate", "hr"),
        (r"^/admin/staff_leave", "hr"),
        (r"^/report/human_resource", "hr"),
        (r"^/teacherlog", "hr"),
        (r"^/admin/teachers_research", "hr"),
        (r"^/report/teacher", "hr"),
        (r"^/admin/holiday", "hr"),
        (r"^/student", "students"),
        (r"^/admin/member", "library"),
        (r"^/admin/book", "library"),
        (r"^/report/library", "library"),
        (r"^/admin/hostel", "hostel"),
        (r"^/admin/roomtype", "hostel"),
        (r"^/admin/vehicle", "transport"),
        (r"^/admin/vehroute", "transport"),
        (r"^/admin/route", "transport"),
        (r"^/admin/pickuppoint", "transport"),
        (r"^/admin/transport", "transport"),
        (r"^/admin/item", "inventory"),
        (r"^/admin/issueitem", "inventory"),
        (r"^/report/inventory", "inventory"),
        (r"^/admin/canteen", "canteen"),
        (r"^/homework", "assignments"),
        (r"^/admin/notification/setting", "system"),
        (r"^/admin/notification", "communicate"),
        (r"^/admin/timeline", "hr"),
        (r"^/admin/teacher", "academics"),
        (r"^/department/", "academics"),
        (r"^/feemaster", "fees"),
        (r"^/admin/mailsms", "communicate"),
        (r"^/admin/chat", "communicate"),
        (r"^/emailconfig", "communicate"),
        (r"^/smsconfig", "communicate"),
        (r"^/admin/lessonplan", "lesson-plan"),
        (r"^/admin/syllabus", "lesson-plan"),
        (r"^/report/lesson_plan", "lesson-plan"),
        (r"^/admin/copo", "outcomes"),
        (r"^/outcome_basis_education", "outcomes"),
        (r"^/admin/subject", "academics"),
        (r"^/admin/timetable", "academics"),
        (r"^/admin/teacher/assign", "academics"),
        (r"^/admin/classroom", "academics"),
        (r"^/admin/batch_settings", "academics"),
        (r"^/admin/schoolhouse", "academics"),
        (r"^/classes", "academics"),
        (r"^/sections", "academics"),
        (r"^/course_master", "academics"),
        (r"^/programintake", "academics"),
        (r"^/sectionwise_specialization", "academics"),
        (r"^/admin/content", "downloads"),
        (r"^/admin/video_tutorial", "downloads"),
        (r"^/admin/certificate", "certificates"),
        (r"^/admin/generatecertificate", "certificates"),
        (r"^/admin/generateidcard", "certificates"),
        (r"^/admin/studentidcard", "certificates"),
        (r"^/admin/alumni", "alumni"),
        (r"^/report/alumni", "alumni"),
        (r"^/admin/naac", "naac"),
        (r"^/feedback", "feedback"),
        (r"^/feedbackreport", "feedback"),
        (r"^/onlinecourse", "lms"),
        (r"^/admin/gmeet", "live-classes"),
        (r"^/admin/conference", "live-classes"),
        (r"^/roombooking", "room-booking"),
        (r"^/admin/tnp", "placements"),
        (r"^/admin/resume", "placements"),
        (r"^/admin/assign_mentor", "mentoring"),
        (r"^/admin/flowmaster", "activities"),
        (r"^/report/flowmaster", "activities"),
        (r"^/admin/calendar", "calendar"),
        (r"^/admin/front", "cms"),
        (r"^/admin/frontcms", "cms"),
        (r"^/admin/multibranch", "multi-campus"),
        (r"^/stdscholarship", "students"),
        (r"^/railway_concession", "students"),
        (r"^/report/railway", "students"),
        (r"^/report/student", "students"),
        (r"^/admin/stdtransfer", "students"),
        (r"^/admin/student", "students"),
        (r"^/admin/audit", "system"),
        (r"^/admin/roles", "system"),
        (r"^/admin/users", "system"),
        (r"^/admin/userlog", "system"),
        (r"^/admin/module", "system"),
        (r"^/admin/sidemenu", "system"),
        (r"^/admin/customfield", "system"),
        (r"^/admin/systemfield", "system"),
        (r"^/admin/captcha", "system"),
        (r"^/admin/language", "system"),
        (r"^/admin/updater", "system"),
        (r"^/admin/admin", "system"),
        (r"^/admin/dashboard", "dashboard"),
        (r"^/schsettings", "system"),
        (r"^/sessions", "system"),
        (r"^/admin/notification/setting", "system"),
        (r"^/admin/print_headerfooter", "system"),
        (r"^/admin/currency", "system"),
        (r"^/admin/attributes", "system"),
        (r"^/category", "system"),
        (r"^/admin/requisitions", "inventory"),
        (r"^/admin/liberal_art", "academics"),
        (r"^/report/", "reports"),
        (r"^/admin/", "misc"),
        (r"^/", "misc"),
    ]
]

MODULE_META = {
    "dashboard": ("Dashboard", "core", "Home widgets and role landing."),
    "admission": ("Admission", "core", "Applications, merit, cutoff, enrolment."),
    "students": ("Students", "core", "Student records, documents, bulk ops, scholarships."),
    "fees": ("Fees", "core", "Fee masters, collection, receipts, discounts."),
    "attendance": ("Attendance", "core", "Student and staff attendance."),
    "examinations": ("Examinations", "core", "Exam setup, marks, hall tickets, seating, results."),
    "academics": ("Academics", "core", "Programmes, classes, subjects, timetable, classrooms."),
    "hr": ("Human Resource", "core", "Staff, leave, recruitment, IDs."),
    "payroll": ("Payroll", "extended", "Pay elements, tax, salary processing."),
    "finance": ("Income & Expense", "extended", "Income/expense heads and search."),
    "lesson-plan": ("Lesson Plan", "extended", "Syllabus, topics, instruction plans."),
    "outcomes": ("CO-PO / OBE", "extended", "Course outcomes and mappings."),
    "assignments": ("Assignments", "extended", "Homework and evaluation."),
    "library": ("Library", "extended", "Books and members."),
    "hostel": ("Hostel", "extended", "Rooms, allotment, gate pass."),
    "transport": ("Transport", "extended", "Routes, vehicles, pickup points."),
    "inventory": ("Inventory", "extended", "Stores, stock, issue, requisitions."),
    "communicate": ("Communicate", "extended", "Email, SMS, chat, notice."),
    "front-office": ("Front Office", "extended", "Enquiry, visitors, dispatch, complaints."),
    "certificates": ("Certificates", "extended", "ID cards and certificates."),
    "downloads": ("Download Center", "extended", "Shared content and tutorials."),
    "lms": ("Online Courses", "optional", "Course catalog and online learning."),
    "feedback": ("Feedback", "optional", "Forms and NAAC-style surveys."),
    "naac": ("NAAC", "optional", "Accreditation tasks and reports."),
    "alumni": ("Alumni", "optional", "Alumni list and events."),
    "canteen": ("Canteen", "optional", "Menus, coupons, auditor."),
    "room-booking": ("Room Booking", "optional", "Facility booking requests."),
    "live-classes": ("Live Classes", "optional", "Meetings / video class timetable."),
    "placements": ("Training & Placements", "optional", "Companies, TNP, student CV."),
    "mentoring": ("Mentoring", "optional", "Mentor assign, OJT/project approval."),
    "activities": ("Activity Management", "optional", "Campus events / flow master."),
    "calendar": ("Calendar", "optional", "Institution calendar and todos."),
    "cms": ("Public Website CMS", "optional", "Banner, pages, gallery, notices."),
    "multi-campus": ("Multi Campus", "optional", "Branch switch / overview."),
    "reports": ("Reports", "extended", "Cross-module report screens."),
    "system": ("System Settings", "core", "Roles, users, sessions, audit, files."),
    "misc": ("Unsorted", "drop", "Could not classify — review before implementing."),
}


def normalize_source(raw: str) -> str | None:
    if not raw:
        return None
    u = raw.strip()
    u = u.replace("\\", "/")
    u = re.sub(r"^https?://demoerp\.mponline\.gov\.in", "", u, flags=re.I)
    if u.startswith("//"):
        u = u[1:]
    u = u.replace("/./", "/")
    u = re.sub(r"/{2,}", "/", u)
    u = u.split("#")[0].split("?")[0]
    if not u.startswith("/"):
        u = "/" + u
    if len(u) > 1:
        u = u.rstrip("/")
    low = u.lower()
    if low in JUNK_EXACT or any(low.startswith(p) for p in JUNK_PREFIX):
        return None
    if any(low.endswith(s) for s in JUNK_SUFFIX):
        return None
    if low in {p.rstrip("/").lower() for p in GLOBAL_CHROME}:
        return None
    if low.startswith("/site/"):
        return None
    return u


def kebab_seg(seg: str) -> str:
    if re.fullmatch(r"\d+", seg):
        return ":id"
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", seg)
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1-\2", s)
    s = s.replace("_", "-")
    s = re.sub(r"[^a-zA-Z0-9:-]+", "-", s)
    s = re.sub(r"-{2,}", "-", s)
    return s.strip("-").lower()


def to_our_route(source: str) -> str:
    parts = [p for p in source.split("/") if p]
    if parts and parts[0].lower() == "admin":
        parts = parts[1:]
    parts = [kebab_seg(p) for p in parts if kebab_seg(p)]
    if not parts:
        return "/"
    if len(parts) >= 2 and parts[-1] == parts[0] + "-dashboard":
        parts[-1] = "dashboard"
    if len(parts) >= 2 and parts[-1] == "index":
        parts = parts[:-1]
    if len(parts) >= 2 and parts[-1] == parts[0]:
        parts = parts[:-1]
    return "/" + "/".join(parts)


def module_for(source: str) -> str:
    for rx, mid in MODULE_RULES:
        if rx.search(source):
            return mid
    return "misc"


def humanize(seg: str) -> str:
    if seg == ":id":
        return "By ID"
    s = re.sub(r"[-_]+", " ", seg)
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)
    s = re.sub(r"\s+", " ", s).strip()
    acronyms = {"id", "hr", "naac", "obe", "co", "po", "atkt", "ojt", "sip", "cv", "tnp", "lms", "cms", "sms"}
    words = []
    for w in s.split(" "):
        lw = w.lower()
        if lw in acronyms:
            words.append(lw.upper())
        else:
            words.append(w[:1].upper() + w[1:] if w else w)
    return " ".join(words)


def infer_kind_method(source: str) -> tuple[str, str, str]:
    last = source.rstrip("/").split("/")[-1]
    l = last.lower()
    if re.search(
        r"delete|remove|destroy",
        l,
    ):
        return "command", "DELETE", humanize(last)
    if re.search(
        r"^(add|save|create|insert|update|edit|assign|approve|reject|import|upload|bulk|generate_|status$)",
        l,
    ) or re.search(r"(save|update|create|add|assign|approve|reject|import|upload)", l):
        return "command", "POST", humanize(last)
    if re.search(r"datatable|ajaxsearch|searchuser|getchat|newmessage", l):
        return "query", "POST", humanize(last)
    if re.search(r"^(get|fetch|list|view|search|details|report|pdf|export|print|download)", l) or re.search(
        r"(get|fetch|list|view|search|report|pdf|export)", l
    ):
        return "query", "GET", humanize(last)
    if "ajax" in l:
        return "query", "POST", humanize(last)
    return "query", "POST", humanize(last)


def load_labels() -> dict[str, str]:
    labels = {}
    with (ROOT / "erp-routes.csv").open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            p = (row.get("path") or "").strip()
            lab = (row.get("label") or "").strip()
            if p and lab:
                labels[p.rstrip("/")] = lab
    return labels


def load_latest_pages() -> dict[str, dict]:
    latest = {}
    with (ROOT / "erp-crawl" / "pages.jsonl").open(encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip().lstrip("\ufeff")
            if not line:
                continue
            rec = json.loads(line)
            latest[rec["path"]] = rec
    return latest


def load_usage() -> dict[str, set[str]]:
    used_by: dict[str, set[str]] = defaultdict(set)
    with (ROOT / "erp-ajax-endpoints.csv").open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            page = normalize_source(row.get("page") or "")
            ep = normalize_source(row.get("endpoint") or "")
            if page and ep:
                used_by[ep].add(page)
    return used_by


def main() -> None:
    labels = load_labels()
    pages = load_latest_pages()
    usage = load_usage()

    modules: dict[str, dict] = {}
    for mid, (name, priority, desc) in MODULE_META.items():
        modules[mid] = {
            "id": mid,
            "name": name,
            "priority": priority,
            "description": desc,
            "screens": [],
            "operations": [],
        }

    dropped = []
    screen_seen = set()

    for src, rec in sorted(pages.items()):
        nsrc = normalize_source(src)
        if src in SKIP_SCREENS:
            dropped.append({"source": src, "reason": "out-of-scope"})
            continue
        if nsrc is None:
            dropped.append({"source": src, "reason": "chrome-or-junk"})
            continue
        status = int(rec.get("status") or 0)
        if status == 404:
            dropped.append({"source": src, "reason": "http-404"})
            continue
        route = to_our_route(nsrc)
        mid = module_for(nsrc)
        key = (mid, route)
        if key in screen_seen:
            continue
        screen_seen.add(key)
        title = labels.get(src.rstrip("/")) or humanize(route.split("/")[-1])
        screen = {
            "id": f"{mid}.{route.strip('/').replace('/', '.')}",
            "title": title,
            "route": route,
            "source": nsrc,
            "httpStatus": status,
            "availableOnDemo": status == 200,
        }
        modules[mid]["screens"].append(screen)

    op_seen: dict[tuple[str, str], dict] = {}
    for src, callers in usage.items():
        nsrc = src
        route = to_our_route(nsrc)
        mid = module_for(nsrc)
        kind, method, title = infer_kind_method(nsrc)
        # If this path is already a screen in the same module, skip duplicating as op
        # unless the name looks like an action.
        is_screen = any(s["route"] == route for s in modules[mid]["screens"])
        last = nsrc.split("/")[-1].lower()
        looks_action = bool(
            re.search(
                r"add|save|update|delete|remove|get|fetch|ajax|search|import|export|assign|approve|status|list",
                last,
            )
        )
        if is_screen and not looks_action:
            continue
        key = (mid, route, method)
        caller_routes = sorted(
            {to_our_route(c) for c in callers if normalize_source(c)}
        )
        if key in op_seen:
            existing = op_seen[key]
            existing["usedBy"] = sorted(set(existing["usedBy"]) | set(caller_routes))
            continue
        op = {
            "id": f"{mid}.{method.lower()}.{route.strip('/').replace('/', '.')}",
            "title": title,
            "kind": kind,
            "method": method,
            "route": route,
            "source": nsrc,
            "usedBy": caller_routes,
        }
        op_seen[key] = op
        modules[mid]["operations"].append(op)

    # Drop empty drop-priority noise if both lists empty
    kept = []
    empty = []
    for mid, mod in modules.items():
        mod["screens"].sort(key=lambda s: s["route"])
        mod["operations"].sort(key=lambda o: (o["route"], o["method"]))
        mod["screenCount"] = len(mod["screens"])
        mod["operationCount"] = len(mod["operations"])
        if mod["screenCount"] == 0 and mod["operationCount"] == 0:
            empty.append(mid)
            continue
        kept.append(mod)

    blueprint = {
        "name": "College ERP domain blueprint",
        "version": 1,
        "assumptions": [
            "Built from an admin-role crawl of a public college-ERP demo. Student/parent/teacher portals are not in this map.",
            "Routes are redesigned for a new app (kebab-case, /admin prefix removed, numeric ids → :id). source keeps the original path.",
            "HTTP methods are inferred from function names, not from a real OpenAPI file. Treat them as a starting contract.",
            "Do not copy vendor UI, copy, or proprietary business rules. Use this as a module checklist and API sketch.",
            "Core modules are the ones to implement first. Optional modules can wait.",
        ],
        "stats": {
            "modules": len(kept),
            "screens": sum(m["screenCount"] for m in kept),
            "operations": sum(m["operationCount"] for m in kept),
            "dropped": len(dropped),
        },
        "modules": kept,
        "dropped": dropped,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "blueprint.json").write_text(
        json.dumps(blueprint, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    with (OUT / "screens.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(
            f, fieldnames=["module", "priority", "title", "route", "source", "httpStatus"]
        )
        w.writeheader()
        for m in kept:
            for s in m["screens"]:
                w.writerow(
                    {
                        "module": m["id"],
                        "priority": m["priority"],
                        "title": s["title"],
                        "route": s["route"],
                        "source": s["source"],
                        "httpStatus": s["httpStatus"],
                    }
                )

    with (OUT / "operations.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "module",
                "priority",
                "title",
                "kind",
                "method",
                "route",
                "source",
                "usedBy",
            ],
        )
        w.writeheader()
        for m in kept:
            for o in m["operations"]:
                w.writerow(
                    {
                        "module": m["id"],
                        "priority": m["priority"],
                        "title": o["title"],
                        "kind": o["kind"],
                        "method": o["method"],
                        "route": o["route"],
                        "source": o["source"],
                        "usedBy": " ".join(o["usedBy"]),
                    }
                )

    lines = [
        "# College ERP blueprint",
        "",
        "Cleaned crawl of the MPOnline **demo** admin UI, rewritten as a domain map for a **new** college ERP.",
        "Not a clone spec. Not their HTML/JS. Source paths are kept only so we can see where an idea came from.",
        "",
        f"- **{blueprint['stats']['modules']} modules**",
        f"- **{blueprint['stats']['screens']} screens**",
        f"- **{blueprint['stats']['operations']} operations** (inferred GET/POST/DELETE)",
        "",
        "## Build order",
        "",
        "1. **core** — dashboard, students, admission, fees, attendance, examinations, academics, hr, system",
        "2. **extended** — payroll, finance, library, hostel, transport, inventory, communicate, reports, …",
        "3. **optional** — NAAC, LMS, canteen, live classes, CMS, multi-campus",
        "",
        "Skip `misc` until reviewed.",
        "",
        "## Files",
        "",
        "- `blueprint.json` — canonical machine-readable spec",
        "- `screens.csv` — one row per screen",
        "- `operations.csv` — one row per inferred API operation",
        "",
        "## Modules",
        "",
        "| Priority | Module | Screens | Operations |",
        "|---|---|---:|---:|",
    ]
    order = {"core": 0, "extended": 1, "optional": 2, "drop": 3}
    for m in sorted(kept, key=lambda x: (order.get(x["priority"], 9), x["name"].lower())):
        lines.append(
            f"| {m['priority']} | {m['name']} (`{m['id']}`) | {m['screenCount']} | {m['operationCount']} |"
        )

    lines += [
        "",
        "## Route conventions (ours)",
        "",
        "- No `/admin` prefix — auth/roles live in the app, not the URL",
        "- kebab-case: `markEntrySubjectwise` → `/examgroup/mark-entry-subjectwise`",
        "- numeric ids → `:id`",
        "- operations inferred: `get*`/`search*` → GET, `save*`/`add*`/`update*` → POST, `delete*` → DELETE",
        "",
        "## Do not implement from this file",
        "",
        "- Captcha, session-cookie names, CSRF field names from the vendor app",
        "- Their chatbot / Gemini key wiring",
        "- Backup/restore of their database",
        "- Pixel-copy of their UI",
        "",
    ]
    (OUT / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps(blueprint["stats"], indent=2))
    print("wrote", OUT / "blueprint.json")
    print("modules", ", ".join(f"{m['id']}={m['screenCount']}/{m['operationCount']}" for m in kept))


if __name__ == "__main__":
    main()
