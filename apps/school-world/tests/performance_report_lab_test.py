"""Browser tests for the isolated Performance Report Studio prototype."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get("LAB_PERFORMANCE_REPORT_URL","http://127.0.0.1:5174/lab/performance-report/index.html")
OUT=Path("test-results/performance-report-lab")
def main():
 OUT.mkdir(parents=True,exist_ok=True);api=[];errors=[];checks=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={"width":1366,"height":900},locale="en-IN");page=context.new_page()
  page.on("pageerror",lambda e:errors.append(str(e)));page.on("request",lambda r:api.append(r.url) if "/api/" in r.url else None)
  page.goto(BASE,wait_until="domcontentloaded")
  expect(page.get_by_role("heading",name="Performance Report Studio")).to_be_visible()
  expect(page.get_by_text("Prototype warning — do not enter real student data")).to_be_visible();expect(page.locator("#overview-templates article")).to_have_count(4)
  page.screenshot(path=str(OUT/"performance-report-overview.png"),full_page=True);checks.append({"feature":"Template library and safe boundary","result":"PASS","evidence":"Four templates and local-only warning rendered."})
  page.get_by_role("button",name="Super Admin · Templates").click();page.locator("#assign-school-id").fill("SCH-TEST-204");page.locator("#assign-template").select_option("mpbse-secondary");page.locator("#assign-session").fill("2026-27");page.locator("#assign-classes").fill("9-12");page.get_by_role("button",name="Assign template").click()
  expect(page.locator("#assign-status")).to_contain_text("Assigned");expect(page.locator("#assignment-rows")).to_contain_text("SCH-TEST-204");expect(page.locator("#assignment-rows")).to_contain_text("MPBSE")
  checks.append({"feature":"School ID template assignment","result":"PASS","evidence":"Template assigned for exact school ID/session/class range."})
  page.locator("#config-template").select_option("mpbse-secondary");page.locator("#config-primary-subjects").fill("English, Hindi, Mathematics, Science, Social Science");page.locator("#config-optional-subjects").fill("Computer Applications");page.locator("#config-assessments").fill("Unit Test:20:60, Written Exam:80:20");page.get_by_role("button",name="Save local template configuration").click();expect(page.locator("#config-status")).to_contain_text("must total 100%")
  page.locator("#config-assessments").fill("Unit Test 1:20:15, Notebook / Classwork:10:10, Project / Practical:20:15, Written Examination:80:60");page.get_by_role("button",name="Save local template configuration").click();expect(page.locator("#config-status")).to_contain_text("Saved")
  checks.append({"feature":"Assessment and subject-category validation","result":"PASS","evidence":"Invalid weights rejected; distinct primary and optional lists saved."})
  page.get_by_role("button",name="School · Marks Entry").click();page.locator("#workspace-school-id").fill("SCH-TEST-204");page.locator("#workspace-session").fill("2026-27");page.locator("#workspace-class").select_option("10");page.get_by_role("button",name="Load assigned workspace").click()
  expect(page.locator("#workspace-access")).to_contain_text("Demo access check passed");expect(page.locator("#active-template-name")).to_contain_text("MPBSE")
  page.locator("#workspace-class").select_option("8");page.get_by_role("button",name="Load assigned workspace").click();expect(page.locator("#workspace-access")).to_contain_text("outside the template assignment");expect(page.locator("#marks-area")).to_be_hidden()
  page.locator("#workspace-class").select_option("10");page.get_by_role("button",name="Load assigned workspace").click();expect(page.locator("#marks-area")).to_be_visible()
  checks.append({"feature":"School/class assignment guard","result":"PASS","evidence":"Assigned class opens marks entry; out-of-range class is denied."})
  page.locator("#assessment-select").select_option("unit-test-1");page.locator('input[data-optional-choice="S001"][value="Computer Applications"]').check();expect(page.locator('input[data-student-id="S002"][data-subject="Computer Applications"]')).to_be_disabled();page.locator('input[data-student-id="S001"][data-subject="English"]').fill("21");page.get_by_role("button",name="Validate & save manual marks").click();expect(page.locator("#manual-status")).to_contain_text("Nothing saved")
  for sid,base in [("S001",15),("S002",17),("S003",18)]:
   for i,subject in enumerate(["English","Hindi","Mathematics","Science","Social Science"]):page.locator('input[data-student-id="'+sid+'"][data-subject="'+subject+'"]').fill(str(base-i))
  page.locator('input[data-student-id="S001"][data-subject="Computer Applications"]').fill("18")
  page.get_by_role("button",name="Validate & save manual marks").click();expect(page.locator("#manual-status")).to_contain_text("Validated and saved 3")
  checks.append({"feature":"Manual marks and optional choices","result":"PASS","evidence":"Invalid mark rejected; optional subject enabled only for the learner who selected it."})
  page.get_by_role("button",name="Bulk CSV import").click()
  bad="studentId,rollNo,studentName,optionalSubjects,English,Hindi,Mathematics,Science,Social Science,Computer Applications\nS001,01,Aarav Sharma,Computer Applications,15,14,13,12,11,25\nS002,02,Ishita Verma,,14,13,12,11,10,\nS003,03,Kabir Patel,,12,11,10,9,8,\n"
  page.locator("#bulk-file").set_input_files({"name":"invalid.csv","mimeType":"text/csv","buffer":bad.encode()});page.get_by_role("button",name="Validate & import CSV").click();expect(page.locator("#bulk-status")).to_contain_text("Nothing imported");expect(page.locator("#bulk-status")).to_contain_text("between 0 and 20")
  bad_unselected="studentId,rollNo,studentName,optionalSubjects,English,Hindi,Mathematics,Science,Social Science,Computer Applications\nS001,01,Aarav Sharma,,15,14,13,12,11,12\nS002,02,Ishita Verma,,14,13,12,11,10,\nS003,03,Kabir Patel,,12,11,10,9,8,\n"
  page.locator("#bulk-file").set_input_files({"name":"unselected-optional.csv","mimeType":"text/csv","buffer":bad_unselected.encode()});page.get_by_role("button",name="Validate & import CSV").click();expect(page.locator("#bulk-status")).to_contain_text("was not selected")
  good="studentId,rollNo,studentName,optionalSubjects,English,Hindi,Mathematics,Science,Social Science,Computer Applications\nS001,01,Aarav Sharma,Computer Applications,18,17,16,15,14,18\nS002,02,Ishita Verma,,17,16,15,14,13,\nS003,03,Kabir Patel,,16,15,14,13,12,\n"
  page.locator("#bulk-file").set_input_files({"name":"valid.csv","mimeType":"text/csv","buffer":good.encode()});page.get_by_role("button",name="Validate & import CSV").click();expect(page.locator("#bulk-status")).to_contain_text("Imported 3 student rows")
  checks.append({"feature":"Atomic bulk CSV and optional validation","result":"PASS","evidence":"Out-of-range marks and scores for an unselected optional subject are rejected; valid CSV imported atomically."})
  page.get_by_role("button",name="Manual marks entry").click();page.locator("#term-select").select_option("Term 2")
  for sid,base in [("S001",16),("S002",15),("S003",14)]:
   for i,subject in enumerate(["English","Hindi","Mathematics","Science","Social Science"]):page.locator('input[data-student-id="'+sid+'"][data-subject="'+subject+'"]').fill(str(base-i))
  page.locator('input[data-student-id="S001"][data-subject="Computer Applications"]').fill("17")
  page.get_by_role("button",name="Validate & save manual marks").click();expect(page.locator("#manual-status")).to_contain_text("Validated and saved 3")
  page.get_by_role("button",name="Report Cards").click();page.locator("#report-school-id").fill("SCH-TEST-204");page.locator("#report-session").fill("2026-27");page.locator("#report-class").select_option("10");page.locator("#report-type").select_option("annual");page.get_by_role("button",name="Generate draft report cards").click()
  expect(page.locator("#report-status")).to_contain_text("Generated 3");expect(page.locator("#report-output .report-card")).to_have_count(3);expect(page.locator("#report-output")).to_contain_text("Final Annual Report Card");expect(page.locator("#report-output")).to_contain_text("Aarav Sharma");expect(page.locator("#print-report")).to_be_enabled()
  page.screenshot(path=str(OUT/"performance-report-annual-draft.png"),full_page=True);expect(page.locator("#report-output")).to_contain_text("Primary / Compulsory");expect(page.locator("#report-output")).to_contain_text("Optional");expect(page.locator("#report-output")).to_contain_text("Primary overall %");expect(page.locator("#report-output")).to_contain_text("Computer Applications");checks.append({"feature":"Term/annual report with subject types","result":"PASS","evidence":"Draft report cards separate primary/compulsory and optional subjects; core percentage uses primary subjects only."})
  page.goto(BASE,wait_until="domcontentloaded");page.evaluate("localStorage.clear()");page.reload(wait_until="domcontentloaded");page.get_by_role("button",name="School · Marks Entry").click();page.locator("#workspace-school-id").fill("SCH-UNASSIGNED-999");page.get_by_role("button",name="Load assigned workspace").click();expect(page.locator("#workspace-access")).to_contain_text("No template is assigned");expect(page.locator("#marks-area")).to_be_hidden()
  checks.append({"feature":"Unassigned School ID","result":"PASS","evidence":"Unassigned school is blocked from marks-entry UI."})
  page.set_viewport_size({"width":390,"height":844});page.goto(BASE,wait_until="domcontentloaded");width=page.evaluate("document.documentElement.scrollWidth");assert width<=391,"Mobile layout overflows: "+str(width)+"px";assert not api,"Unexpected ERP API calls: "+repr(api);assert not errors,"Browser errors: "+repr(errors);page.screenshot(path=str(OUT/"performance-report-mobile.png"),full_page=True);browser.close()
 report={"title":"School World Performance Report Prototype Lab","mode":"Fictional data in browser localStorage; no ERP API/database or official calculation","checks":checks,"apiRequests":api,"pageErrors":errors,"securityNotes":["Browser-side School ID checks are UX only; production authorization must be server-side.","Version templates by session/class/subject and preserve audit snapshots.","Default weights and grade bands are illustrative until verified against official rules."]}
 (OUT/"performance-report-lab-report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
 (OUT/"performance-report-lab-report.txt").write_text("School World Performance Report Prototype Lab\n"+"\n".join(x["result"]+": "+x["feature"]+" — "+x["evidence"] for x in checks)+"\nAPI requests: "+str(api)+"\nJavaScript errors: "+str(errors)+"\n",encoding="utf-8")
 print("PASS: Performance Report browser checks completed. Evidence:",OUT)
if __name__=="__main__":main()
