"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
    const ledger = await fetch(`/api/v1/students/${data!.student.id}/fees`).then(
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
            href={`/api/v1/students/${data.student.id}/fees`}
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
  const { data, error, reload } = usePortal();
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;
  const studentId = data.student.id;
  async function markRead(id: string) {
    await fetch(`/api/v1/notices/${id}/read`, { method: "POST" });
    reload();
  }
  async function reply(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "").trim();
    if (!body) return;
    await fetch(`/api/v1/portal/notices/${id}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, studentId }),
    });
    form.reset();
    reload();
  }
  return (
    <Page title="Notices">
      <Card>
        <ul className="space-y-3 text-sm">
          {data.notices.map((n) => (
            <li key={n.id} className="border-b border-[var(--rule)] pb-2 last:border-0">
              <p className="font-medium">
                {n.read ? "" : "● "}
                {n.title}
              </p>
              {n.body ? <p className="mt-1 text-[var(--muted)]">{n.body}</p> : null}
              {n.attachments?.length ? (
                <ul className="mt-1 space-y-1">
                  {n.attachments.map((file) => (
                    <li key={file.id}>
                      <a
                        className="underline underline-offset-4"
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {file.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {n.replies?.length ? (
                <ul className="mt-2 space-y-1 text-[var(--muted)]">
                  {n.replies.map((row) => (
                    <li key={row.id}>
                      {row.authorRole}: {row.body}
                    </li>
                  ))}
                </ul>
              ) : null}
              {n.allowReply ? (
                <form
                  className="mt-2 grid gap-2"
                  onSubmit={(event) => reply(event, n.id)}
                >
                  <textarea
                    name="body"
                    required
                    className="min-h-16 rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
                    placeholder="Reply"
                  />
                  <Button type="submit" variant="ghost">
                    Reply
                  </Button>
                </form>
              ) : null}
              {!n.read ? (
                <Button
                  className="mt-2"
                  variant="ghost"
                  type="button"
                  onClick={() => markRead(n.id)}
                >
                  Mark read
                </Button>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">Read</p>
              )}
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
        {data.exams.coScholastic?.length ? (
          <ul className="mt-4 space-y-1 text-sm">
            {data.exams.coScholastic.map((row, i) => (
              <li key={i}>
                {row.aspect}: {row.grade}
                {row.remark ? ` · ${row.remark}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
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

export function StoreView() {
  const { data, error } = usePortal();
  const [desk, setDesk] = useState<{
    products: Array<{ id: string; name: string; price: number; sku: string }>;
    orders: Array<{ id: string; itemId: string; qty: number; amount: number; status: string }>;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const studentId = data?.student.id;
  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/v1/portal/store?studentId=${studentId}`)
      .then((r) => r.json())
      .then((json) => setDesk({ products: json.products ?? [], orders: json.orders ?? [] }));
  }, [studentId]);
  if (error) return <Status>{error}</Status>;
  if (!data || !desk) return <Status>Loading…</Status>;
  async function order(itemId: string) {
    setMessage(null);
    const res = await fetch("/api/v1/portal/store", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, itemId, qty: 1 }),
    });
    const json = await res.json();
    setMessage(
      res.ok
        ? json.pay
          ? `Razorpay order ${json.pay.orderId} · ₹${json.pay.amount}. Complete checkout; webhook marks the kit paid.`
          : `Ordered · ₹${json.order?.amount ?? 0}`
        : json.message ?? json.error,
    );
    const next = await fetch(`/api/v1/portal/store?studentId=${studentId}`).then((r) =>
      r.json(),
    );
    setDesk({ products: next.products ?? [], orders: next.orders ?? [] });
  }
  return (
    <Page title="Store">
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <Card>
        <ul className="space-y-2 text-sm">
          {desk.products.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <span>
                {p.name} {p.sku ? `· ${p.sku}` : ""} · ₹{p.price}
              </span>
              <Button type="button" size="sm" onClick={() => order(p.id)}>
                Pay and order
              </Button>
            </li>
          ))}
          {!desk.products.length ? (
            <li className="text-[var(--muted)]">No store items yet.</li>
          ) : null}
        </ul>
      </Card>
      <Card>
        <p className="text-sm font-semibold">Your orders</p>
        <ul className="mt-2 space-y-1 text-sm">
          {desk.orders.map((o) => (
            <li key={o.id}>
              {o.qty} × {o.itemId} · ₹{o.amount} · {o.status}
            </li>
          ))}
          {!desk.orders.length ? (
            <li className="text-[var(--muted)]">No orders yet.</li>
          ) : null}
        </ul>
      </Card>
    </Page>
  );
}

export function TransportView() {
  const { data, error } = usePortal();
  const [track, setTrack] = useState<{
    last: { lat: number; lng: number; at: string; tripId: string } | null;
    trip: Array<{ lat: number; lng: number; at: string }>;
  } | null>(null);
  const studentId = data?.student.id;
  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/v1/portal/transport?studentId=${studentId}`)
      .then((r) => r.json())
      .then((json) => setTrack({ last: json.last ?? null, trip: json.trip ?? [] }));
  }, [studentId]);
  if (error) return <Status>{error}</Status>;
  if (!data || !track) return <Status>Loading…</Status>;
  return (
    <Page title="Bus">
      <Card>
        {track.last ? (
          <p className="text-sm">
            Last ping {track.last.lat}, {track.last.lng} at {track.last.at}
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">No ping for this route yet.</p>
        )}
        <ul className="mt-3 space-y-1 text-sm">
          {track.trip.map((p, i) => (
            <li key={`${p.at}-${i}`}>
              {p.at} · {p.lat}, {p.lng}
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}

export function PickupView() {
  const { data, error } = usePortal();
  const [rows, setRows] = useState<
    Array<{ id: string; name: string; phone: string; relation: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const studentId = data?.student.id;
  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/v1/portal/pickup?studentId=${studentId}`)
      .then((r) => r.json())
      .then((json) => setRows(json.data ?? []));
  }, [studentId]);
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/portal/pickup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId,
        name: form.get("name"),
        phone: form.get("phone"),
        relation: form.get("relation"),
        pin: form.get("pin"),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Authorised person saved" : json.message ?? json.error);
    const next = await fetch(`/api/v1/portal/pickup?studentId=${studentId}`).then((r) =>
      r.json(),
    );
    setRows(next.data ?? []);
  }
  return (
    <Page title="Pickup">
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <Card>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <input
            name="name"
            placeholder="Name"
            required
            className="h-10 rounded-md border border-[var(--rule)] px-3"
          />
          <input
            name="phone"
            placeholder="Phone"
            className="h-10 rounded-md border border-[var(--rule)] px-3"
          />
          <input
            name="relation"
            placeholder="Relation"
            className="h-10 rounded-md border border-[var(--rule)] px-3"
          />
          <input
            name="pin"
            placeholder="4-6 digit PIN"
            required
            className="h-10 rounded-md border border-[var(--rule)] px-3"
          />
          <Button type="submit">Authorise pickup</Button>
        </form>
      </Card>
      <Card>
        <ul className="space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.id}>
              {r.name} · {r.relation} · {r.phone}
            </li>
          ))}
          {!rows.length ? (
            <li className="text-[var(--muted)]">No authorised people yet.</li>
          ) : null}
        </ul>
      </Card>
    </Page>
  );
}

export function CctvView() {
  const { data, error } = usePortal();
  const [desk, setDesk] = useState<{
    allowed: boolean;
    cameras: Array<{ id: string; name: string; room: string; url: string }>;
  } | null>(null);
  const studentId = data?.student.id;
  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/v1/portal/cctv?studentId=${studentId}`)
      .then((r) => r.json())
      .then((json) =>
        setDesk({ allowed: Boolean(json.allowed), cameras: json.cameras ?? [] }),
      );
  }, [studentId]);
  if (error) return <Status>{error}</Status>;
  if (!data || !desk) return <Status>Loading…</Status>;
  return (
    <Page title="CCTV">
      <Card>
        {!desk.allowed ? (
          <p className="text-sm text-[var(--muted)]">
            CCTV is off for this child. Ask the campus to record consent.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {desk.cameras.map((c) => (
              <li key={c.id}>
                <a
                  className="underline underline-offset-4"
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {c.name}
                </a>
                {c.room ? ` · ${c.room}` : ""}
              </li>
            ))}
            {!desk.cameras.length ? (
              <li className="text-[var(--muted)]">No cameras listed.</li>
            ) : null}
          </ul>
        )}
      </Card>
    </Page>
  );
}

export function DiaryView() {
  const { data, error } = usePortal();
  const [rows, setRows] = useState<
    Array<{
      id: string;
      kind: string;
      channel?: string;
      url: string;
      caption: string;
      at: string;
    }>
  >([]);
  const studentId = data?.student.id;
  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/v1/portal/diary?studentId=${studentId}`)
      .then((r) => r.json())
      .then((json) => setRows(json.data ?? []));
  }, [studentId]);
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;
  return (
    <Page title="Diary">
      <Card>
        <ul className="space-y-3 text-sm">
          {rows.map((row) => (
            <li key={row.id}>
              <p className="font-medium">
                {row.channel === "daycare" ? "Daycare" : "Student"} · {row.kind}
                {row.caption ? ` · ${row.caption}` : ""}
              </p>
              {row.url ? (
                <a
                  className="underline underline-offset-4"
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              ) : null}
            </li>
          ))}
          {!rows.length ? (
            <li className="text-[var(--muted)]">No diary posts yet.</li>
          ) : null}
        </ul>
      </Card>
    </Page>
  );
}

export function EyfsView() {
  const { data, error } = usePortal();
  const [rows, setRows] = useState<
    Array<{ id: string; area?: string; note: string; url: string; at: string }>
  >([]);
  const studentId = data?.student.id;
  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/v1/portal/eyfs?studentId=${studentId}`)
      .then((r) => r.json())
      .then((json) => setRows(json.data ?? []));
  }, [studentId]);
  if (error) return <Status>{error}</Status>;
  if (!data) return <Status>Loading…</Status>;
  return (
    <Page title="EYFS">
      <Card>
        <ul className="space-y-3 text-sm">
          {rows.map((row) => (
            <li key={row.id}>
              <p className="font-medium">
                {row.area ?? "Area"}
                {row.note ? ` · ${row.note}` : ""}
              </p>
              {row.url ? (
                <a
                  className="underline underline-offset-4"
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              ) : null}
            </li>
          ))}
          {!rows.length ? (
            <li className="text-[var(--muted)]">No EYFS observations yet.</li>
          ) : null}
        </ul>
      </Card>
    </Page>
  );
}
