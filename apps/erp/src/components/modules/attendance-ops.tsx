"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode = "leaves" | "approve" | "staff";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";
const STATUSES = ["PRESENT", "ABSENT", "LATE", "HALFDAY", "LEAVE"] as const;

export default function AttendanceOps({ mode }: { mode: Mode }) {
  if (mode === "leaves") return <LeaveTypes />;
  if (mode === "staff") return <StaffAttendance />;
  return <ApproveLeave />;
}

function LeaveTypes() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; daysYear: number }>>([]);
  async function load() {
    setRows(((await (await fetch("/api/v1/leave-types")).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/leave-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        daysYear: Number(form.get("daysYear") || 0),
      }),
    });
    event.currentTarget.reset();
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Leave types</h1>
      <form className="flex flex-wrap gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Name" required />
        <Input name="daysYear" type="number" min="0" placeholder="Days / year" />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.name} · {r.daysYear} days
          </li>
        ))}
      </ul>
    </div>
  );
}

function ApproveLeave() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      status: string;
      fromDate: string;
      toDate: string;
      reason?: string | null;
      studentId?: string | null;
      staffId?: string | null;
      leaveType: { name: string };
    }>
  >([]);
  async function load() {
    setRows(((await (await fetch("/api/v1/leave-requests")).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function act(id: string, action: "approve" | "reject") {
    await fetch(`/api/v1/leave-requests/${id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Approve leave</h1>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--rule)] p-3">
            <span>
              {r.leaveType.name} · {String(r.fromDate).slice(0, 10)}–{String(r.toDate).slice(0, 10)} · {r.status}
            </span>
            {r.status === "pending" ? (
              <span className="flex gap-2">
                <Button size="sm" type="button" onClick={() => act(r.id, "approve")}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" type="button" onClick={() => act(r.id, "reject")}>
                  Reject
                </Button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StaffAttendance() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<
    Array<{ staffId: string; employeeId: string; name: string; status: string | null }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load(event?: FormEvent) {
    event?.preventDefault();
    const json = await (await fetch(`/api/v1/attendance/staff?date=${date}`)).json();
    setRows(json.data ?? []);
  }
  async function save() {
    const res = await fetch("/api/v1/attendance/staff", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date,
        entries: rows.map((r) => ({ staffId: r.staffId, status: r.status ?? "PRESENT" })),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Staff attendance</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="flex gap-3" onSubmit={load}>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button className="self-end" type="submit">
          Load
        </Button>
      </form>
      <table className="w-full text-left text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.staffId}>
              <td className="py-1">
                {row.employeeId} · {row.name}
              </td>
              <td>
                <select
                  className={SELECT}
                  value={row.status ?? "PRESENT"}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, status: e.target.value };
                    setRows(next);
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button type="button" onClick={save} disabled={!rows.length}>
        Save
      </Button>
    </div>
  );
}
