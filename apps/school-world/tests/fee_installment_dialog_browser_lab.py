import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright, expect


BASE_URL = os.environ.get("LAB_WEB_URL", "http://127.0.0.1:5174").rstrip("/") + "/tests/fee-installment-dialog.html"
ARTIFACT_DIR = Path("test-results/installment-dialog-lab")
VIEWPORTS = [
    {"name": "windows-chrome-like", "width": 1366, "height": 768},
    {"name": "desktop-hd", "width": 1920, "height": 1080},
    {"name": "small-laptop", "width": 1280, "height": 720},
    {"name": "mobile", "width": 390, "height": 844},
]


def screenshot(page, name):
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    target = ARTIFACT_DIR / name
    page.screenshot(path=str(target), full_page=True, animations="disabled")
    return str(target)


def hit_test_click_target(page, element, label):
    element.scroll_into_view_if_needed()
    result = element.evaluate(
        """el => {
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          const hit = document.elementFromPoint(x, y);
          const cls = value => typeof value?.className === "string"
            ? value.className : (value?.className?.baseVal || "");
          return {
            button: (el.innerText || el.getAttribute("aria-label") || "").trim(),
            box: { x: r.x, y: r.y, width: r.width, height: r.height },
            hitTag: hit?.tagName || null,
            hitClass: cls(hit),
            hitBelongsToButton: !!hit && (hit === el || el.contains(hit)),
          };
        }"""
    )
    assert result["box"]["width"] > 0 and result["box"]["height"] > 0, (
        f"{label} has no visible clickable area: {result}"
    )
    assert result["hitBelongsToButton"], (
        f"{label} is covered by another element at its center: {result}"
    )
    return result


def exercise_dialog(browser, viewport):
    page = browser.new_page(
        viewport={"width": viewport["width"], "height": viewport["height"]},
        device_scale_factor=1,
        locale="en-IN",
        color_scheme="light",
    )
    page_errors = []
    console_errors = []
    api_requests = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    # Fonts are bundled by the app's legacy stylesheet from Google; the lab must not
    # depend on external font network availability.
    page.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(status=200, content_type="text/css", body=""))
    page.route("https://fonts.gstatic.com/**", lambda route: route.fulfill(status=200, body=b""))
    page.on(
        "console",
        lambda message: console_errors.append(message.text) if message.type == "error" else None,
    )
    page.on("request", lambda request: api_requests.append(request.url) if "/api/" in request.url else None)
    result = {"viewport": viewport, "checks": [], "pageErrors": page_errors}
    try:
        page.goto(BASE_URL, wait_until="domcontentloaded")
        open_button = page.get_by_role("button", name="Open Dialog")
        expect(open_button).to_be_visible()
        open_button.click()
        dialog = page.get_by_role("dialog", name="Add Fee Installment")
        expect(dialog).to_be_visible()
        result["checks"].append("same installment dialog component rendered in isolated test lab")
        result["screenshots"] = [screenshot(page, f"{viewport['name']}-01-dialog-open.png")]

        # The lab mirrors the production fee page's CSS scope while mounting only this dialog.
        computed = dialog.evaluate(
            """el => {
              const backdrop = el.closest(".fees-setup-modal-backdrop");
              const label = el.querySelector(".fees-installment-schedule-fields label");
              const field = el.querySelector(".fees-installment-schedule-fields select");
              const r = backdrop.getBoundingClientRect();
              const style = getComputedStyle(backdrop);
              return {
                labelFontSize: getComputedStyle(label).fontSize,
                fieldFontSize: getComputedStyle(field).fontSize,
                fieldMinHeight: getComputedStyle(field).minHeight,
                backdrop: {
                  position: style.position,
                  zIndex: style.zIndex,
                  pointerEvents: style.pointerEvents,
                  rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                  viewport: { width: innerWidth, height: innerHeight }
                }
              };
            }"""
        )
        assert computed["labelFontSize"] == "13px", f"Unexpected label font size: {computed}"
        assert computed["fieldFontSize"] == "14px", f"Unexpected field font size: {computed}"
        assert computed["fieldMinHeight"] == "40px", f"Unexpected field min-height: {computed}"
        backdrop = computed["backdrop"]
        assert backdrop["position"] == "fixed", f"Dialog backdrop isn't fixed: {computed}"
        assert backdrop["zIndex"] == "60000", f"Dialog backdrop z-index changed unexpectedly: {computed}"
        assert backdrop["pointerEvents"] != "none", f"Dialog backdrop ignores pointer events: {computed}"
        assert abs(backdrop["rect"]["width"] - viewport["width"]) <= 1, f"Backdrop width mismatch: {computed}"
        assert abs(backdrop["rect"]["height"] - viewport["height"]) <= 1, f"Backdrop height mismatch: {computed}"
        result["computedStyle"] = computed
        result["checks"].append("dialog typography, field sizing, overlay layer and viewport coverage match page CSS")

        close_x = dialog.locator("button.fees-setup-close")
        result.setdefault("hitTests", {})["x"] = hit_test_click_target(page, close_x, "Top-right X")
        close_x.click()
        expect(dialog).to_have_count(0)
        result["checks"].append("top-right X receives a browser click and closes the dialog")
        result["screenshots"].append(screenshot(page, f"{viewport['name']}-02-closed-by-x.png"))

        open_button.click()
        dialog = page.get_by_role("dialog", name="Add Fee Installment")
        footer_close = dialog.locator("footer button.fees-setup-secondary")
        result["hitTests"]["footerClose"] = hit_test_click_target(page, footer_close, "Footer Close")
        footer_close.click()
        expect(dialog).to_have_count(0)
        result["checks"].append("footer Close receives a browser click and closes the dialog")

        open_button.click()
        dialog = page.get_by_role("dialog", name="Add Fee Installment")
        add_fees = dialog.get_by_role("button", name="Add Fees")
        add_fees.click()
        expect(dialog.locator(".fees-installment-line")).to_have_count(2)
        dialog.locator(".fees-installment-line").nth(1).get_by_role("button", name="Remove").click()
        expect(dialog.locator(".fees-installment-line")).to_have_count(1)
        result["checks"].append("Add Fees and Remove line handlers work")

        # Save calls only the harness callback, which marks the submit and closes the dialog.
        save = dialog.get_by_role("button", name="Save Installment")
        result["hitTests"]["saveInstallment"] = hit_test_click_target(page, save, "Save Installment")
        save.click()
        expect(dialog).to_have_count(0)
        expect(page.get_by_test_id("save-status")).to_have_text("Saved")
        expect(page.get_by_test_id("save-count")).to_have_text("1")
        result["checks"].append("Add mode: Save Installment receives a browser click, submits, and closes the dialog")
        result["screenshots"].append(screenshot(page, f"{viewport['name']}-03-add-mode-saved-in-harness.png"))

        # Exercise the same component in Edit mode without creating or saving a Fee Template.
        open_edit_button = page.get_by_role("button", name="Open Edit Dialog")
        open_edit_button.click()
        edit_dialog = page.get_by_role("dialog", name="Edit Fee Installment")
        expect(edit_dialog).to_be_visible()
        edit_x = edit_dialog.locator("button.fees-setup-close")
        result["hitTests"]["editX"] = hit_test_click_target(page, edit_x, "Edit dialog X")
        edit_x.click()
        expect(edit_dialog).to_have_count(0)

        open_edit_button.click()
        edit_dialog = page.get_by_role("dialog", name="Edit Fee Installment")
        edit_close = edit_dialog.locator("footer button.fees-setup-secondary")
        result["hitTests"]["editFooterClose"] = hit_test_click_target(page, edit_close, "Edit dialog footer Close")
        edit_close.click()
        expect(edit_dialog).to_have_count(0)

        open_edit_button.click()
        edit_dialog = page.get_by_role("dialog", name="Edit Fee Installment")
        edit_save = edit_dialog.get_by_role("button", name="Save Installment")
        result["hitTests"]["editSaveInstallment"] = hit_test_click_target(page, edit_save, "Edit Save Installment")
        edit_save.click()
        expect(edit_dialog).to_have_count(0)
        expect(page.get_by_test_id("save-status")).to_have_text("Saved")
        expect(page.get_by_test_id("save-count")).to_have_text("2")
        result["checks"].append("Edit mode: X, footer Close and Save Installment all receive clicks and behave correctly")
        result["screenshots"].append(screenshot(page, f"{viewport['name']}-04-edit-mode-saved-in-harness.png"))

        assert not api_requests, f"Lab unexpectedly called application APIs: {api_requests}"
        assert not page_errors, f"Uncaught browser errors: {page_errors}"
        assert not console_errors, f"Browser console errors: {console_errors}"
        result["checks"].append("no application API requests, database writes, or uncaught browser errors")
        return result
    except Exception:
        try:
            result["failureScreenshot"] = screenshot(page, f"{viewport['name']}-FAILURE.png")
        except Exception:
            pass
        raise
    finally:
        page.close()


def main():
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    failures = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for viewport in VIEWPORTS:
            try:
                item = exercise_dialog(browser, viewport)
                results.append(item)
                print(
                    f"PASS {viewport['name']} {viewport['width']}x{viewport['height']}: "
                    + "; ".join(item["checks"])
                )
            except Exception as error:
                failures.append({"viewport": viewport, "error": str(error)})
                print(f"FAIL {viewport['name']} {viewport['width']}x{viewport['height']}: {error}")
        browser.close()

    alternatives = [
        {
            "failure": "A button's browser hit-test lands on another element",
            "preferredAlternative": "Keep the dialog inline in its existing page context; identify the exact element returned by elementFromPoint and repair only that overlay/stacking owner.",
            "avoid": "Do not raise global z-index values or add a portal before the actual intercepting element is known."
        },
        {
            "failure": "Dialog label/input styles differ from the existing page",
            "preferredAlternative": "Preserve the fees-setup-page CSS scope. If a portal is ever proven necessary, reproduce that exact scope and assert computed styles in this lab.",
            "avoid": "Do not compensate with global form selectors or change the entire page theme."
        },
        {
            "failure": "Save Installment click or local state transition fails",
            "preferredAlternative": "Isolate the component callback and parent's installment-draft update, then test their handoff separately with the smallest local reproduction.",
            "avoid": "This dialog regression must not submit/save an entire Fee Template."
        }
    ]
    revision = {
        "branch": os.environ.get("LAB_GIT_BRANCH", "unknown"),
        "commit": os.environ.get("LAB_GIT_SHA", "unknown")
    }
    report = {
        "title": "School World Installment Dialog Browser Lab",
        "browser": "Playwright Chromium",
        "scope": "FeeTemplateInstallmentDialog component only",
        "cssScope": "Matches legacy-app my-branch-page / fees-setup-page selectors",
        "saveBehavior": "Harness callback only; no Fee Template is created or saved",
        "networkSafety": "Application API calls are prohibited by assertion; no database is connected",
        "gitRevision": revision,
        "viewports": VIEWPORTS,
        "results": results,
        "failures": failures,
        "nextBestAlternativesByFailure": alternatives
    }
    (ARTIFACT_DIR / "browser-lab-report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    text_report = [
        "School World Installment Dialog Browser Lab",
        "Component: FeeTemplateInstallmentDialog only",
        "API/database: none; Save button uses local test callback",
        f"Git branch: {revision['branch']} | commit: {revision['commit']}",
        "",
        "Next-best alternatives if a test fails:",
        *[
            f"- {item['failure']}: {item['preferredAlternative']} Avoid: {item['avoid']}"
            for item in alternatives
        ],
        "",
        *[
            f"PASS {item['viewport']['name']} {item['viewport']['width']}x{item['viewport']['height']}: "
            + "; ".join(item["checks"])
            for item in results
        ],
        *[
            f"FAIL {item['viewport']['name']} {item['viewport']['width']}x{item['viewport']['height']}: "
            + item["error"]
            for item in failures
        ],
    ]
    (ARTIFACT_DIR / "browser-lab-report.txt").write_text(
        "\n".join(text_report), encoding="utf-8"
    )
    if failures:
        raise SystemExit(
            f"{len(failures)} viewport(s) failed; see {ARTIFACT_DIR / 'browser-lab-report.json'}"
        )
    print(f"PASS: all {len(results)} viewports passed.")
    print(f"Screenshots and diagnostics saved to {ARTIFACT_DIR}.")


if __name__ == "__main__":
    main()
