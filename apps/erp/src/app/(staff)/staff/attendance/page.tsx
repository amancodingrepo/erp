"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Klass = { id: string; name: string; sections: { id: string; name: string }[] };
type Row = { studentId: string; admissionNo: string; name: string; status: string | null };

const STATUSES = ["PRESENT", "ABSENT", "LATE", "HALFDAY", "LEAVE"] as const;

export default function AttendancePage() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [report, setReport] = useState<Array<{ studentId: string; name: string; percent: number }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [override, setOverride] = useState(false);

  useEffect(() => {
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []));
  }, []);

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  async function loadRoster(event?: FormEvent) {
    event?.preventDefault();
    const res = await fetch(
      `/api/v1/attendance/students?sectionId=${sectionId}&date=${date}`,
    );
    const json = await res.json();
    setRows(json.data ?? []);
  }

  async function save() {
    const res = await fetch("/api/v1/attendance/students", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date,
        sectionId,
        override,
        entries: rows.map((r) => ({
          studentId: r.studentId,
          status: r.status ?? "PRESENT",
        })),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setMessage(
      res.ok
        ? "Attendance saved"
        : json.fields?.date === "holiday"
          ? "Holiday — enable override to mark"
          : json.message ?? "Save failed",
    );
  }

  async function loadReport() {
    const res = await fetch(
      `/api/v1/attendance/students/report?sectionId=${sectionId}`,
    );
    const json = await res.json();
    setReport(json.data ?? []);
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Attendance</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
      <form className="mt-6 flex flex-wrap gap-3" onSubmit={loadRoster}>
        <div>
          <Label>Class</Label>
          <select
            className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId("");
            }}
          >
            <option value="">—</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Section</Label>
          <select
            className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            <option value="">—</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
          />
          Override holiday
        </label>
        <Button type="submit" className="self-end">
          Load
        </Button>
      </form>
      <div className="mt-6 overflow-x-auto border border-[var(--rule)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--ink)] text-[var(--paper)]">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Mark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.studentId} className="odd:bg-[var(--paper-2)]">
                <td className="px-3 py-2">
                  {row.admissionNo} · {row.name}
                </td>
                <td className="px-3 py-2">
                  <select
                    className="h-9 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-2"
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
      </div>
      <div className="mt-4 flex gap-3">
        <Button onClick={save} disabled={!rows.length}>
          Save marks
        </Button>
        <Button variant="ghost" onClick={loadReport} disabled={!sectionId}>
          Section report
        </Button>
      </div>
      {report.length ? (
        <ul className="mt-6 text-sm">
          {report.map((r) => (
            <li key={r.studentId}>
              {r.name}: {r.percent}%
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
