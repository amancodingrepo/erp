"use client";

import { useEffect, useState } from "react";
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
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading…</p>;

  async function payOnline() {
    setOrderMsg(null);
    const ledger = await fetch(`/api/v1/students/${data!.student.id}/ledger`).then(
      (r) => r.json(),
    );
    const invoice = (ledger.invoices as Array<{ id: string; status: string }> | undefined)?.find(
      (i) => i.status !== "PAID",
    );
    if (!invoice) {
      setOrderMsg("No unpaid invoice");
      return;
    }
    const res = await fetch("/api/v1/fees/online-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: data!.student.id,
        invoiceId: invoice.id,
      }),
    });
    const json = await res.json();
    setOrderMsg(
      res.ok
        ? `Razorpay order ${json.orderId} · ₹${json.amount}. Complete checkout; webhook will post the receipt.`
        : json.message ?? json.error ?? "Could not start payment",
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="font-display text-4xl">Fees</h1>
      <p className="text-sm">
        Total {data.dues.total} · Paid {data.dues.paid} · Balance {data.dues.balance}
      </p>
      <button type="button" className="text-sm underline" onClick={payOnline}>
        Pay online
      </button>
      {orderMsg ? <p className="text-sm text-[var(--muted)]">{orderMsg}</p> : null}
      <a
        className="block text-sm underline"
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
        <ExamFormApply />
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
      <ExamFormApply />
    </div>
  );
}

function ExamFormApply() {
  const [windows, setWindows] = useState<
    Array<{
      id: string;
      kind: string;
      feeAmount: string;
      examGroup: { name: string; subjects: Array<{ id: string; exam: string }> };
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/portal/exam-forms")
      .then((r) => r.json())
      .then((j) => setWindows(j.data ?? []));
  }, []);
  if (!windows.length) return null;
  async function apply(windowId: string, subjectIds: string[]) {
    const res = await fetch("/api/v1/portal/exam-forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ windowId, subjectIds }),
    });
    const json = await res.json();
    setMessage(res.ok ? `Submitted, fee ₹${json.feeAmount}` : json.message ?? json.error);
  }
  return (
    <div className="mt-6 space-y-3">
      <h2 className="font-display text-2xl">ATKT / revaluation</h2>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      {windows.map((w) => (
        <form
          key={w.id}
          className="space-y-2 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const ids = new FormData(event.currentTarget)
              .getAll("subjectIds")
              .map(String);
            apply(w.id, ids);
          }}
        >
          <p>
            {w.kind} · {w.examGroup.name} · ₹{w.feeAmount}
          </p>
          <select name="subjectIds" multiple required className="w-full border px-2 py-1">
            {w.examGroup.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.exam}
              </option>
            ))}
          </select>
          <button type="submit" className="underline">
            Apply
          </button>
        </form>
      ))}
    </div>
  );
}
