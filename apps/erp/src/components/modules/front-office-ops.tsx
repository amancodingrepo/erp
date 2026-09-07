"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "enquiry" | "visitors" | "setup";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function FrontOfficeOps({ mode }: { mode: Mode }) {
  if (mode === "visitors") return <VisitorsPanel />;
  if (mode === "setup") return <SetupPanel />;
  return <EnquiryPanel />;
}

function EnquiryPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      name: string;
      phone: string | null;
      source: string | null;
      status: string;
      applicationId: string | null;
    }>
  >([]);
  const [sources, setSources] = useState<Array<{ name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [e, s] = await Promise.all([
      fetch("/api/v1/enquiries").then((r) => r.json()),
      fetch("/api/v1/front-office-types?kind=source").then((r) => r.json()),
    ]);
    setRows(e.data ?? []);
    setSources(s.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/enquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone") || undefined,
        email: form.get("email") || undefined,
        source: form.get("source") || undefined,
        classInterested: form.get("classInterested") || undefined,
        followUpOn: form.get("followUpOn") || undefined,
        remarks: form.get("remarks") || undefined,
      }),
    });
    setMessage(res.ok ? "Enquiry saved" : "Could not save");
    load();
  }
  async function patch(id: string, body: object) {
    const res = await fetch(`/api/v1/enquiries/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setMessage(
      res.ok
        ? json.applicationNo
          ? `Converted ${json.applicationNo}`
          : "Updated"
        : json.message ?? json.error,
    );
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Admission enquiry</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Name" required />
        <Input name="phone" placeholder="Phone" />
        <Input name="email" type="email" placeholder="Email" />
        <select name="source" className={SELECT}>
          <option value="">Source</option>
          {sources.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <Input name="classInterested" placeholder="Class / program interested" />
        <Input name="followUpOn" type="date" />
        <Input name="remarks" placeholder="Remarks" />
        <Button type="submit">Add enquiry</Button>
      </form>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[var(--ink)] text-[var(--paper)]">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="odd:bg-[var(--paper-2)]">
              <td className="px-3 py-2">{r.name}</td>
              <td className="px-3 py-2">{r.phone ?? "—"}</td>
              <td className="px-3 py-2">{r.status}</td>
              <td className="px-3 py-2">
                {r.applicationId ? (
                  "Application created"
                ) : (
                  <span className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => patch(r.id, { convert: true })}>
                      Convert
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patch(r.id, { status: "LOST" })}
                    >
                      Lost
                    </Button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VisitorsPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; name: string; purpose: string | null; inAt: string; outAt: string | null }>
  >([]);
  const [purposes, setPurposes] = useState<Array<{ name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [v, p] = await Promise.all([
      fetch("/api/v1/visitors").then((r) => r.json()),
      fetch("/api/v1/front-office-types?kind=purpose").then((r) => r.json()),
    ]);
    setRows(v.data ?? []);
    setPurposes(p.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/visitors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone") || undefined,
        purpose: form.get("purpose") || undefined,
        toMeet: form.get("toMeet") || undefined,
      }),
    });
    load();
  }
  async function checkout(id: string) {
    const res = await fetch(`/api/v1/visitors/${id}/checkout`, { method: "POST" });
    setMessage(res.ok ? "Checked out" : "Already out");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Visitor book</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Visitor name" required />
        <Input name="phone" placeholder="Phone" />
        <Input name="toMeet" placeholder="To meet" />
        <select name="purpose" className={SELECT}>
          <option value="">Purpose</option>
          {purposes.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <Button type="submit">Check in</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            {r.name} · {r.purpose ?? "—"} · in {new Date(r.inAt).toLocaleTimeString()}
            {r.outAt ? (
              ` · out ${new Date(r.outAt).toLocaleTimeString()}`
            ) : (
              <Button size="sm" variant="ghost" onClick={() => checkout(r.id)}>
                Check out
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SetupPanel() {
  const [rows, setRows] = useState<Array<{ id: string; kind: string; name: string }>>([]);
  async function load() {
    const j = await fetch("/api/v1/front-office-types").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/front-office-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: form.get("kind"),
        name: form.get("name"),
      }),
    });
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Front office setup</h1>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="kind" className={SELECT} defaultValue="source">
          <option value="source">Source</option>
          <option value="purpose">Purpose</option>
          <option value="complaint">Complaint type</option>
        </select>
        <Input name="name" required placeholder="Walk-in / Admission / ..." />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.kind}: {r.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
