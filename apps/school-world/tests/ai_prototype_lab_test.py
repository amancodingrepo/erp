"""Browser tests for the isolated, local-only AI education prototype page."""
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

AI_URL = os.environ.get(
    "LAB_AI_URL",
    "http://127.0.0.1:5174/lab/ai-innovation/index.html",
)
ARTIFACT_DIR = Path("test-results/ai-prototype-lab")


def main():
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    app_requests = []
    page_errors = []
    checks = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 768})
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("request", lambda request: app_requests.append(request.url) if "/api/" in request.url else None)
        page.goto(AI_URL, wait_until="domcontentloaded")

        expect(page.get_by_role("heading", name="AI features, tested safely first.")).to_be_visible()
        expect(page.get_by_text("No school API, student database, or external AI provider is contacted.")).to_be_visible()
        page.screenshot(path=str(ARTIFACT_DIR / "ai-lab-home.png"), full_page=True)

        # Lesson studio produces a local, reviewable draft.
        page.get_by_role("button", name="Generate sample draft").click()
        lesson = page.locator("#lesson-output")
        expect(lesson).to_contain_text("Water cycle")
        expect(lesson).to_contain_text("Teacher review checklist")
        checks.append({"feature": "Lesson & Worksheet Studio", "result": "PASS", "evidence": "Output includes Water cycle and teacher review checklist."})
        print("PASS AI prototype: lesson/worksheet draft generates with a teacher-review checklist.")

        # Parent message is only drafted; it is not sent.
        page.get_by_role("tab", name="Parent copilot").click()
        page.get_by_role("button", name="Draft message").click()
        parent = page.locator("#parent-output")
        expect(parent).to_contain_text("Aarav")
        expect(parent).to_contain_text("Review recipient")
        page.locator("#parent-language").select_option("hi")
        page.get_by_role("button", name="Draft message").click()
        expect(parent).to_contain_text("नमस्ते")
        checks.append({"feature": "Parent Communication Copilot", "result": "PASS", "evidence": "English and Hindi drafts are shown locally; no message is sent."})
        print("PASS AI prototype: parent communication produces English/Hindi drafts, with manual-review warnings.")

        # Attendance signals are explainable sample thresholds, not model predictions.
        page.get_by_role("tab", name="Attendance review").click()
        page.get_by_role("button", name="Analyse sample patterns").click()
        expect(page.locator("#attendance-count")).to_have_text("2")
        expect(page.locator("#attendance-results .signal")).to_have_count(4)
        expect(page.locator("#attendance-results")).to_contain_text("fictional")
        expect(page.locator("#attendance-results")).to_contain_text("Confirm records")
        checks.append({"feature": "Attendance Pattern Review", "result": "PASS", "evidence": "Four fictional learners; two sample threshold flags; reason and staff-review next step shown."})
        print("PASS AI prototype: attendance flags show reasons and staff-review actions for fictional learners.")

        # Practice builder generates a sample set without publishing or saving it.
        page.get_by_role("tab", name="Practice builder").click()
        page.get_by_role("button", name="Generate sample set").click()
        questions = page.locator("#practice-output")
        expect(questions).to_contain_text("Fractions")
        expect(questions).to_contain_text("Teacher checks")
        assert questions.inner_text().count("\n\n") >= 4
        checks.append({"feature": "Practice Question Builder", "result": "PASS", "evidence": "Sample question set and teacher-checklist shown; nothing published or saved."})
        print("PASS AI prototype: practice builder generates teacher-reviewable sample questions.")

        # These prototypes must remain independent of the real ERP/backend.
        assert not app_requests, f"AI prototype unexpectedly called application APIs: {app_requests}"
        assert not page_errors, f"JavaScript errors in AI prototype page: {page_errors}"
        page.screenshot(path=str(ARTIFACT_DIR / "ai-lab-final.png"), full_page=True)
        browser.close()

    report = {
        "title": "School World AI Prototype Lab",
        "mode": "Local rule-based prototypes; no LLM, ERP API, or database connection",
        "results": checks,
        "apiRequests": app_requests,
        "pageErrors": page_errors,
        "betterAlternatives": [
            {"feature": "Lesson & Worksheet Studio", "alternative": "Compare approved curriculum templates against an authorised model grounded only in teacher-provided objectives; measure syllabus alignment, factuality and editing time."},
            {"feature": "Parent Communication Copilot", "alternative": "Start with approved school templates and translation memory; allow AI to suggest tone/translation only, with staff approval before sending."},
            {"feature": "Attendance Pattern Review", "alternative": "Compare transparent school policy thresholds against a validated predictor, evaluate false positives across groups, and require human review."},
            {"feature": "Practice Question Builder", "alternative": "Retrieve teacher-approved question-bank items, draft variations only as a suggestion, then check answer keys, age suitability and accessibility."}
        ]
    }
    (ARTIFACT_DIR / "ai-prototype-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    (ARTIFACT_DIR / "ai-prototype-report.txt").write_text(
        "School World AI Prototype Lab\\n" +
        "No LLM/API/database connected\\n" +
        "\\n".join([f"{item['result']}: {item['feature']} — {item['evidence']}" for item in checks]) +
        "\\n\\nBetter alternatives to evaluate:\\n" +
        "\\n".join([f"- {item['feature']}: {item['alternative']}" for item in report["betterAlternatives"]]),
        encoding="utf-8"
    )
    print("PASS: all AI sandbox browser checks completed without API calls or uncaught browser errors.")
    print(f"AI prototype report and screenshots saved to {ARTIFACT_DIR}.")


if __name__ == "__main__":
    main()
