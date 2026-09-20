"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { usePortal } from "@/lib/use-portal";

function Status({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--muted)]">{children}</p>;
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="em-card p-5">
      {children}
    </div>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl sm:text-4xl">{t(title)}</h1>
      {children}
    </div>
  );
}

export function DashboardView() {
  const { t } = useI18n();
  const { data, error } = usePortal();
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>{t("Loading")}</Status>;
  return (
    <Page title={`${t("Hello")}, ${data.student.name}`}>
      <p className="text-sm text-[var(--muted)]">
        {data.student.admissionNo} · {data.student.class} / {data.student.section}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Fee balance")}</p>
          <p className="mt-1 font-display text-3xl">₹{data.dues.balance}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Attendance")}</p>
          <p className="mt-1 font-display text-3xl">{data.attendancePercent}%</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Class")}</p>
          <p className="mt-1 font-display text-2xl">
            {data.timetable.nextClass ?? "—"}
          </p>
        </Card>
      </div>
      <Card>
        <p className="text-sm font-semibold">{t("Notices")}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {data.notices.map((n) => (
            <li key={n.id}>{n.title}</li>
          ))}
          {!data.notices.length ? (
            <li className="text-[var(--muted)]">{t("No notices yet.")}</li>
          ) : null}
        </ul>
      </Card>
    </Page>
  );
}

export function ProfileView() {
  const { data, error } = usePortal();
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;
  return (
    <Page title="Profile">
      <Card>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">Student ID</dt>
            <dd className="mt-1 font-medium">{data.student.admissionNo}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Name</dt>
            <dd className="mt-1 font-medium">{data.student.name}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Class</dt>
            <dd className="mt-1 font-medium">
              {data.student.class} / {data.student.section}
            </dd>
          </div>
        </dl>
      </Card>
    </Page>
  );
}

export function FeesView() {
  const { data, error } = usePortal();
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;

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
    <Page title="Fees">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--muted)]">Total</p>
          <p className="mt-1 text-2xl">₹{data.dues.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Paid</p>
          <p className="mt-1 text-2xl">₹{data.dues.paid}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Balance</p>
          <p className="mt-1 text-2xl">₹{data.dues.balance}</p>
        </Card>
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={payOnline}>
            Pay online
          </Button>
          <a
            className="text-sm underline underline-offset-4"
            href={`/api/v1/students/${data.student.id}/ledger`}
          >
            Open ledger
          </a>
        </div>
        {orderMsg ? <p className="mt-3 text-sm text-[var(--muted)]">{orderMsg}</p> : null}
      </Card>
    </Page>
  );
}

export function AttendanceView() {
  const { data, error } = usePortal();
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;
  return (
    <Page title="Attendance">
      <Card>
        <p className="text-sm text-[var(--muted)]">This month</p>
        <p className="mt-1 font-display text-5xl">{data.attendancePercent}%</p>
      </Card>
    </Page>
  );
}

export function TimetableView() {
  const { data, error } = usePortal();
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;
  return (
    <Page title="Timetable">
      <Card>
        <p className="text-sm text-[var(--muted)]">
          Class timetable for {data.timetable.nextClass ?? "your section"} will
          show here when the weekly grid is published.
        </p>
      </Card>
    </Page>
  );
}

export function NoticesView() {
  const { data, error } = usePortal();
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;
  return (
    <Page title="Notices">
      <Card>
        <ul className="space-y-3 text-sm">
          {data.notices.map((n) => (
            <li key={n.id} className="border-b border-[var(--rule)] pb-2 last:border-0">
              {n.title}
            </li>
          ))}
          {!data.notices.length ? (
            <li className="text-[var(--muted)]">No notices.</li>
          ) : null}
        </ul>
      </Card>
    </Page>
  );
}

export function ExamsView() {
  const { data, error } = usePortal();
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;
  if (data.exams.status === "withheld") {
    return (
      <Page title="Exams">
        <Card>
          <p className="text-sm">Result withheld. Contact the college office.</p>
        </Card>
        <ExamFormApply />
      </Page>
    );
  }
  return (
    <Page title="Exams">
      <Card>
        <ul className="space-y-2 text-sm">
          {data.exams.marks.map((m, i) => (
            <li key={i} className="flex justify-between gap-4">
              <span>{m.exam}</span>
              <span className="font-medium">
                {m.isAbsent ? "Absent" : String(m.marks ?? "—")}
              </span>
            </li>
          ))}
          {!data.exams.marks.length ? (
            <li className="text-[var(--muted)]">No published marks.</li>
          ) : null}
        </ul>
        {data.student.id ? (
          <a
            className="mt-4 inline-block text-sm underline underline-offset-4"
            href={`/api/v1/students/${data.student.id}/marksheet?format=pdf`}
          >
            Download marksheet PDF
          </a>
        ) : null}
      </Card>
      <ExamFormApply />
    </Page>
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
    <Card>
      <h2 className="font-display text-2xl">ATKT / revaluation</h2>
      {message ? <p className="mt-2 text-sm text-[var(--muted)]">{message}</p> : null}
      {windows.map((w) => (
        <form
          key={w.id}
          className="mt-4 space-y-2 text-sm"
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
          <select
            name="subjectIds"
            multiple
            required
            className="h-24 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-2 py-1"
          >
            {w.examGroup.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.exam}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      ))}
    </Card>
  );
}
