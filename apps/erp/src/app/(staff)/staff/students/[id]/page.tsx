"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Student = {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName?: string;
  mobile?: string;
  email?: string;
  status: string;
  enrollments: Array<{
    id: string;
    isCurrent: boolean;
    class: { name: string };
    section: { name: string };
    session: { name: string };
  }>;
  guardians: Array<{ relation: string; guardian: { name: string; phone?: string } }>;
};

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [tab, setTab] = useState("profile");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/v1/students/${id}`);
    setStudent(await res.json());
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleDisabled() {
    const path =
      student?.status === "DISABLED"
        ? `/api/v1/students/${id}/enable`
        : `/api/v1/students/${id}/disable`;
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    setMessage(res.ok ? "Updated" : "Could not update");
    load();
  }

  if (!student?.id) {
    return <p className="text-[var(--muted)]">Loading student…</p>;
  }

  const tabs = ["profile", "enrollment", "guardians"] as const;

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
        <Button variant="danger" onClick={toggleDisabled}>
          {student.status === "DISABLED" ? "Enable login" : "Disable student"}
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      <div className="mt-6 flex gap-2">
        {tabs.map((t) => (
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
      <div className="mt-6 border border-[var(--rule)] bg-[var(--paper-2)] p-5">
        {tab === "profile" ? (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Mobile</dt>
              <dd>{student.mobile ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Email</dt>
              <dd>{student.email ?? "—"}</dd>
            </div>
          </dl>
        ) : null}
        {tab === "enrollment" ? (
          <ul className="space-y-2 text-sm">
            {student.enrollments.map((e) => (
              <li key={e.id}>
                {e.session.name} · {e.class.name} / {e.section.name}
                {e.isCurrent ? " (current)" : ""}
              </li>
            ))}
            {!student.enrollments.length ? <li>No enrollment yet.</li> : null}
          </ul>
        ) : null}
        {tab === "guardians" ? (
          <ul className="space-y-2 text-sm">
            {student.guardians.map((g, i) => (
              <li key={i}>
                {g.relation}: {g.guardian.name} {g.guardian.phone ?? ""}
              </li>
            ))}
            {!student.guardians.length ? <li>No guardians on file.</li> : null}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
