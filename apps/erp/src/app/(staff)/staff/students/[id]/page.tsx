"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Tab =
  | "profile"
  | "guardians"
  | "documents"
  | "fees"
  | "attendance"
  | "exams"
  | "timeline";

type Student = {
  id: string;
  admissionNo: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  mobile?: string | null;
  email?: string | null;
  gender?: string | null;
  dob?: string | null;
  status: string;
  aadhaarMasked?: string | null;
  panMasked?: string | null;
  category?: { name: string } | null;
  enrollments: Array<{
    id: string;
    isCurrent: boolean;
    rollNo?: string | null;
    class: { name: string };
    section: { name: string };
    session: { name: string };
  }>;
  guardians: Array<{
    relation: string;
    guardian: { name: string; phone?: string | null };
  }>;
  addresses: Array<{ kind: string; line1?: string | null; city?: string | null; state?: string | null }>;
  documents: Array<{ id: string; title: string; fileUrl: string; createdAt: string }>;
  invoicesSummary: {
    count: number;
    total: number;
    paid: number;
    balance: number;
    rows: Array<{ id: string; status: string; total: number; paid: number }>;
  };
  attendance: Array<{ id: string; date: string; status: string }>;
  exams: {
    withheld: boolean;
    marks: Array<{
      id: string;
      exam: string;
      group: string;
      status: string;
      marks: number | null;
    }>;
  };
  timeline: Array<{ at: string; event: string; detail: string }>;
};

const TABS: Tab[] = [
  "profile",
  "guardians",
  "documents",
  "fees",
  "attendance",
  "exams",
  "timeline",
];

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [tab, setTab] = useState<Tab>("profile");
  const [message, setMessage] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Array<{ id: string; name: string }>>([]);
  const [reasonId, setReasonId] = useState("");

  async function load() {
    const res = await fetch(`/api/v1/students/${id}`);
    setStudent(await res.json());
  }

  useEffect(() => {
    if (id) load();
    fetch("/api/v1/disable-reasons")
      .then((r) => r.json())
      .then((j) => setReasons(j.data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleDisabled() {
    if (student?.status !== "DISABLED" && !reasonId) {
      setMessage("Select a disable reason");
      return;
    }
    const path =
      student?.status === "DISABLED"
        ? `/api/v1/students/${id}/enable`
        : `/api/v1/students/${id}/disable`;
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        student?.status === "DISABLED" ? {} : { reasonId },
      ),
    });
    setMessage(res.ok ? "Updated" : "Could not update");
    load();
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const res = await fetch(`/api/v1/students/${id}/documents`, {
      method: "POST",
      body: data,
    });
    setMessage(res.ok ? "Document saved" : "Upload failed");
    if (res.ok) form.reset();
    load();
  }

  if (!student?.id) {
    return <p className="text-[var(--muted)]">Loading student…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--brass)]">
            {student.admissionNo} · {student.status}
          </p>
          <h1 className="font-display text-4xl">
            {student.firstName} {student.lastName}
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {student.status !== "DISABLED" ? (
            <select
              className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
              value={reasonId}
              onChange={(e) => setReasonId(e.target.value)}
            >
              <option value="">Disable reason</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button variant="danger" onClick={toggleDisabled}>
            {student.status === "DISABLED" ? "Enable login" : "Disable student"}
          </Button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              tab === t ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-2)]"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6 border border-[var(--rule)] bg-[var(--paper-2)] p-5 text-sm">
        {tab === "profile" ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Item label="Mobile" value={student.mobile} />
            <Item label="Email" value={student.email} />
            <Item label="Gender" value={student.gender} />
            <Item label="DOB" value={student.dob?.slice(0, 10)} />
            <Item label="Category" value={student.category?.name} />
            <Item label="Aadhaar" value={student.aadhaarMasked} />
            <Item label="PAN" value={student.panMasked} />
            {student.enrollments.map((e) => (
              <Item
                key={e.id}
                label={e.isCurrent ? "Current class" : "Previous"}
                value={`${e.session.name} · ${e.class.name} / ${e.section.name}`}
              />
            ))}
            {student.addresses.map((a) => (
              <Item
                key={a.kind}
                label={a.kind}
                value={[a.line1, a.city, a.state].filter(Boolean).join(", ")}
              />
            ))}
          </dl>
        ) : null}
        {tab === "guardians" ? (
          <ul className="space-y-2">
            {student.guardians.map((g, i) => (
              <li key={i}>
                {g.relation}: {g.guardian.name} {g.guardian.phone ?? ""}
              </li>
            ))}
            {!student.guardians.length ? <li>No guardians on file.</li> : null}
          </ul>
        ) : null}
        {tab === "documents" ? (
          <div className="space-y-4">
            <form className="flex flex-wrap items-end gap-3" onSubmit={onUpload}>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div>
                <Label htmlFor="file">File (jpg/png/pdf, 5MB)</Label>
                <Input id="file" name="file" type="file" required />
              </div>
              <Button type="submit">Upload</Button>
            </form>
            <ul className="space-y-1">
              {student.documents.map((d) => (
                <li key={d.id}>
                  {d.title} · {d.fileUrl}
                </li>
              ))}
              {!student.documents.length ? <li>No documents.</li> : null}
            </ul>
          </div>
        ) : null}
        {tab === "fees" ? (
          <div>
            <p>
              {student.invoicesSummary.count} invoices · due{" "}
              {student.invoicesSummary.balance}
            </p>
            <ul className="mt-3 space-y-1">
              {student.invoicesSummary.rows.map((row) => (
                <li key={row.id}>
                  {row.status} · {row.paid}/{row.total}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {tab === "attendance" ? (
          <ul className="space-y-1">
            {student.attendance.map((a) => (
              <li key={a.id}>
                {String(a.date).slice(0, 10)} · {a.status}
              </li>
            ))}
            {!student.attendance.length ? <li>No recent attendance.</li> : null}
          </ul>
        ) : null}
        {tab === "exams" ? (
          <ul className="space-y-1">
            {student.exams.marks.map((m) => (
              <li key={m.id}>
                {m.group} / {m.exam}:{" "}
                {m.status === "withheld" ? "Result withheld" : m.marks}
              </li>
            ))}
            {!student.exams.marks.length ? <li>No marks.</li> : null}
          </ul>
        ) : null}
        {tab === "timeline" ? (
          <ul className="space-y-1">
            {student.timeline.map((t, i) => (
              <li key={i}>
                {String(t.at).slice(0, 10)} · {t.event} · {t.detail}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
