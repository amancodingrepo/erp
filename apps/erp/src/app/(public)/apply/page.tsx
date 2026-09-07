"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Catalog = {
  campus: { name: string };
  applicationFee: string;
  programs: Array<{ id: string; name: string; level: string }>;
};

export default function ApplyPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/public/apply")
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/public/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        mobile: form.get("mobile"),
        dob: form.get("dob"),
        gender: form.get("gender") || undefined,
        fatherName: form.get("fatherName"),
        programId: form.get("programId") || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message ?? json.error ?? "Could not submit");
      return;
    }
    setRef(json.applicationNo);
    setAppId(json.id);
    event.currentTarget.reset();
  }

  async function onLookup(event: FormEvent) {
    event.preventDefault();
    const res = await fetch(
      `/api/v1/public/applications?ref=${encodeURIComponent(lookup)}`,
    );
    const json = await res.json();
    setStatus(
      json.data
        ? `${json.data.applicationNo}: ${json.data.status} · fee ${json.data.paymentStatus}`
        : "No application with that reference",
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">
        {catalog?.campus.name ?? "College"}
      </p>
      <h1 className="font-display mt-2 text-4xl">Online admission</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Application fee ₹{catalog?.applicationFee ?? "—"}. Pay at the campus
        counter. Staff will enroll you after the fee is recorded.
      </p>
      {ref ? (
        <p className="mt-4 border border-[var(--rule)] bg-[var(--paper-2)] p-4 text-sm">
          Submitted. Keep this reference number: <strong>{ref}</strong>
          {appId ? (
            <>
              {" "}
              <button
                type="button"
                className="underline"
                onClick={async () => {
                  const res = await fetch(
                    `/api/v1/public/applications/${appId}/pay-online`,
                    { method: "POST" },
                  );
                  const json = await res.json();
                  setMessage(
                    res.ok
                      ? `Pay ₹${json.amount} with order ${json.orderId}`
                      : json.message ?? "Online pay unavailable",
                  );
                }}
              >
                Pay application fee online
              </button>
            </>
          ) : null}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-[var(--stamp)]" role="alert">
          {message}
        </p>
      ) : null}
      <form className="mt-8 grid gap-3" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" />
        </div>
        <div>
          <Label htmlFor="fatherName">Father / spouse name</Label>
          <Input id="fatherName" name="fatherName" />
        </div>
        <div>
          <Label htmlFor="mobile">Mobile</Label>
          <Input id="mobile" name="mobile" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" name="dob" type="date" />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            name="gender"
            className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          >
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <Label htmlFor="programId">Program</Label>
          <select
            id="programId"
            name="programId"
            className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          >
            <option value="">—</option>
            {(catalog?.programs ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Submit application</Button>
      </form>
      <form className="mt-10 space-y-3 border-t border-[var(--rule)] pt-6" onSubmit={onLookup}>
        <Label htmlFor="lookup">Check status</Label>
        <div className="flex gap-3">
          <Input
            id="lookup"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="APP-2026-0001"
          />
          <Button type="submit" variant="ghost">
            Look up
          </Button>
        </div>
        {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
      </form>
      <p className="mt-8 text-sm">
        <Link href="/login" className="underline-offset-4 hover:underline">
          Staff / student login
        </Link>
      </p>
    </div>
  );
}
