"""Smoke-test the real isolated lab API, frontend proxy, and PostgreSQL connection."""
import json
import os
import urllib.request

API_URL = os.environ.get("LAB_API_URL", "http://127.0.0.1:3002").rstrip("/")
WEB_URL = os.environ.get("LAB_WEB_URL", "http://127.0.0.1:5174").rstrip("/")


def fetch(url, accept="application/json"):
    request = urllib.request.Request(url, headers={"Accept": accept})
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.status, response.read()


def fetch_json(url):
    status, raw = fetch(url)
    return status, json.loads(raw.decode("utf-8"))


def main():
    status, payload = fetch_json(API_URL + "/api/health")
    assert status == 200, f"API health status was {status}"
    assert payload.get("ok") is True, f"API did not report ok: {payload}"
    assert payload.get("database") == "connected", (
        "API did not confirm a live PostgreSQL query: " + repr(payload)
    )
    print("PASS full-stack lab: backend health and real PostgreSQL SELECT 1.")

    # Verify the frontend's actual /api proxy reaches the same backend/database.
    proxied_status, proxied_payload = fetch_json(WEB_URL + "/api/health")
    assert proxied_status == 200, f"Vite /api proxy returned HTTP {proxied_status}"
    assert proxied_payload.get("database") == "connected", (
        "Frontend /api proxy did not reach the lab DB: " + repr(proxied_payload)
    )
    web_status, html = fetch(WEB_URL + "/", accept="text/html")
    assert web_status == 200 and b"<html" in html.lower(), (
        "Lab frontend did not serve its entry page."
    )
    print("PASS full-stack lab: Vite frontend and /api proxy communicate with the real lab backend.")
    print("Lab API health:", json.dumps(payload, sort_keys=True))


if __name__ == "__main__":
    main()
