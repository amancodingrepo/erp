"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Row = {
  id: string;
  admissionNo: string;
  name: string;
  class: string | null;
  section: string | null;
  rollNo: string | null;
  enrollmentNo: string | null;
  fatherName: string | null;
  dob: string | null;
  gender: string | null;
  category: string | null;
  mobile: string | null;
  status: string;
};

const COLUMNS = [
  "Student ID",
  "Name",
  "Class",
  "Roll",
  "Enrollment No",
  "Father/Spouse",
  "DOB",
  "Gender",
  "Category",
  "Mobile",
];

export default function StudentsPage({
  defaultStatus = "ACTIVE",
}: {
  defaultStatus?: string;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);

  async function load(query = q, st = status) {
    const params = new URLSearchParams({ q: query, status: st, pageSize: "50" });
    const res = await fetch(`/api/v1/students?${params}`);
    const json = await res.json();
    setRows(json.data ?? []);
    setTotal(json.total ?? 0);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStatus]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    load();
  }

  function fmtDate(value: string | null) {
    if (!value) return "—";
    return String(value).slice(0, 10);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">
            {defaultStatus === "DISABLED" ? "Disabled students" : "Students"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{total} in this filter</p>
        </div>
        <Link href="/staff/student/create">
          <Button variant="brass">Admit student</Button>
        </Link>
      </div>
      <form className="mt-6 flex flex-wrap gap-3" onSubmit={onSearch}>
        <div className="min-w-56 flex-1">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or admission no"
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
            <option value="all">All</option>
          </select>
        </div>
        <Button type="submit" className="self-end">
          Filter
        </Button>
      </form>
      <div className="mt-6 overflow-x-auto border border-[var(--rule)]">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-[var(--ink)] text-[var(--paper)]">
            <tr>
              {COLUMNS.map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="odd:bg-[var(--paper-2)]">
                <td className="px-3 py-2">
                  <Link className="underline" href={`/staff/students/${row.id}`}>
                    {row.admissionNo}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">
                  {[row.class, row.section].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-3 py-2">{row.rollNo ?? "—"}</td>
                <td className="px-3 py-2">{row.enrollmentNo ?? "—"}</td>
                <td className="px-3 py-2">{row.fatherName ?? "—"}</td>
                <td className="px-3 py-2">{fmtDate(row.dob)}</td>
                <td className="px-3 py-2">{row.gender ?? "—"}</td>
                <td className="px-3 py-2">{row.category ?? "—"}</td>
                <td className="px-3 py-2">{row.mobile ?? "—"}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[var(--muted)]"
                  colSpan={COLUMNS.length}
                >
                  No students match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
