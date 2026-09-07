"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "id-design" | "id-generate" | "cert-design" | "cert-generate" | "staff-id" | "report";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function CertificateOps({ mode }: { mode: Mode }) {
  if (mode === "id-generate") return <GeneratePanel kind="id" />;
  if (mode === "cert-design") return <DesignPanel kind="CERTIFICATE" />;
  if (mode === "cert-generate") return <GeneratePanel kind="certificate" />;
  if (mode === "staff-id") return <GeneratePanel kind="staff" />;
  if (mode === "report") return <ReportPanel />;
  return <DesignPanel kind="ID_CARD" />;
}

function DesignPanel({ kind }: { kind: "CERTIFICATE" | "ID_CARD" }) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; body: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch(`/api/v1/print-templates?kind=${kind}`).then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, [kind]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/print-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        name: form.get("name"),
        body: form.get("body"),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">
        {kind === "CERTIFICATE" ? "Certificate templates" : "ID card templates"}
      </h1>
      <p className="text-sm text-[var(--muted)]">
        Merge fields: {"{{name}} {{admissionNo}} {{class}} {{section}} {{campus}}"}
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Bonafide" required />
        <textarea
          name="body"
          required
          rows={6}
          className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
          defaultValue="This is to certify that {{name}} ({{admissionNo}}) is a bona fide student of {{campus}}, class {{class}} / {{section}}."
        />
        <Button type="submit">Save</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </div>
  );
}

function GeneratePanel({ kind }: { kind: "id" | "certificate" | "staff" }) {
  const [people, setPeople] = useState<Array<{ id: string; name: string; extra?: string }>>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    if (kind === "staff") {
      fetch("/api/v1/staff")
        .then((r) => r.json())
        .then((j) =>
          setPeople(
            (j.data ?? []).map((s: { id: string; firstName: string; lastName?: string; employeeId: string }) => ({
              id: s.id,
              name: [s.firstName, s.lastName].filter(Boolean).join(" "),
              extra: s.employeeId,
            })),
          ),
        );
    } else {
      fetch("/api/v1/students?pageSize=100")
        .then((r) => r.json())
        .then((j) => setPeople(j.data ?? []));
    }
    if (kind === "certificate") {
      fetch("/api/v1/print-templates?kind=CERTIFICATE")
        .then((r) => r.json())
        .then((j) => setTemplates(j.data ?? []));
    }
  }, [kind]);
  return (
    <div>
      <h1 className="font-display text-4xl">
        {kind === "staff" ? "Staff ID cards" : kind === "id" ? "Student ID cards" : "Certificates"}
      </h1>
      <ul className="mt-4 space-y-2 text-sm">
        {people.map((p) => {
          const href =
            kind === "staff"
              ? `/api/v1/staff/${p.id}/id-card?format=pdf`
              : kind === "id"
                ? `/api/v1/students/${p.id}/id-card?format=pdf`
                : `/api/v1/students/${p.id}/certificate?format=pdf${templates[0] ? `&templateId=${templates[0].id}` : ""}`;
          return (
            <li key={p.id}>
              {p.name} {p.extra ? `(${p.extra})` : ""}{" "}
              <a className="underline" href={href} target="_blank" rel="noreferrer">
                PDF
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReportPanel() {
  const [rows, setRows] = useState<Array<{ id: string; title: string; studentId: string | null; createdAt: string }>>(
    [],
  );
  useEffect(() => {
    fetch("/api/v1/print-templates?kind=issues")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);
  return (
    <div>
      <h1 className="font-display text-4xl">Certificate report</h1>
      <ul className="mt-4 text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.title} · {new Date(r.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
