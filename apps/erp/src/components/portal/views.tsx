"use client";

import { usePortal } from "@/lib/use-portal";

export function DashboardView() {
  const { data, error } = usePortal();
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{data.student.name}</h1>
      <p className="text-sm text-[var(--muted)]">
        {data.student.admissionNo} · {data.student.class} / {data.student.section}
      </p>
      <dl className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="border border-[var(--rule)] p-3">
          <dt className="text-[var(--muted)]">Fee balance</dt>
          <dd className="text-xl">{data.dues.balance}</dd>
        </div>
        <div className="border border-[var(--rule)] p-3">
          <dt className="text-[var(--muted)]">Attendance</dt>
          <dd className="text-xl">{data.attendancePercent}%</dd>
        </div>
        <div className="border border-[var(--rule)] p-3">
          <dt className="text-[var(--muted)]">Next class</dt>
          <dd className="text-xl">{data.timetable.nextClass ?? "—"}</dd>
        </div>
      </dl>
      <ul className="text-sm">
        {data.notices.map((n) => (
          <li key={n.id}>{n.title}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProfileView() {
  const { data, error } = usePortal();
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading…</p>;
  return (
    <div>
      <h1 className="font-display text-4xl">Profile</h1>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--muted)]">Student ID</dt>
          <dd>{data.student.admissionNo}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Name</dt>
          <dd>{data.student.name}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Class</dt>
          <dd>
            {data.student.class} / {data.student.section}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function FeesView() {
  const { data, error } = usePortal();
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading…</p>;
  return (
    <div className="space-y-3">
      <h1 className="font-display text-4xl">Fees</h1>
      <p className="text-sm">
        Total {data.dues.total} · Paid {data.dues.paid} · Balance {data.dues.balance}
      </p>
      <p className="text-sm text-[var(--muted)]">
        Online pay is not enabled in v1. Pay at the campus counter, then download
        receipts from the ledger.
      </p>
      <a
        className="text-sm underline"
        href={`/api/v1/students/${data.student.id}/ledger`}
      >
        Open ledger JSON
      </a>
    </div>
  );
}

export function AttendanceView() {
  const { data, error } = usePortal();
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading…</p>;
  return (
    <div>
      <h1 className="font-display text-4xl">Attendance</h1>
      <p className="mt-3 text-3xl">{data.attendancePercent}%</p>
    </div>
  );
}

export function TimetableView() {
  const { data, error } = usePortal();
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading…</p>;
  return (
    <div>
      <h1 className="font-display text-4xl">Timetable</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Class timetable placeholder for {data.timetable.nextClass ?? "your section"}.
      </p>
    </div>
  );
}

export function NoticesView() {
  const { data, error } = usePortal();
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading…</p>;
  return (
    <div>
      <h1 className="font-display text-4xl">Notices</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {data.notices.map((n) => (
          <li key={n.id}>{n.title}</li>
        ))}
        {!data.notices.length ? <li>No notices.</li> : null}
      </ul>
    </div>
  );
}

export function ExamsView() {
  const { data, error } = usePortal();
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading…</p>;
  if (data.exams.status === "withheld") {
    return (
      <div>
        <h1 className="font-display text-4xl">Exams</h1>
        <p className="mt-3 text-sm">Result withheld</p>
      </div>
    );
  }
  return (
    <div>
      <h1 className="font-display text-4xl">Exams</h1>
      <ul className="mt-4 text-sm">
        {data.exams.marks.map((m, i) => (
          <li key={i}>
            {m.exam}: {m.isAbsent ? "AB" : String(m.marks ?? "—")}
          </li>
        ))}
        {!data.exams.marks.length ? <li>No published marks.</li> : null}
      </ul>
      {data.student.id ? (
        <a
          className="mt-3 inline-block text-sm underline"
          href={`/api/v1/students/${data.student.id}/marksheet?format=pdf`}
        >
          Marksheet PDF
        </a>
      ) : null}
    </div>
  );
}
