"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { REPORT_KEYS, type ReportKey } from "@/lib/reports/keys";

type ReportPayload = {
  title: string;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
};

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function ReportView({ reportKey }: { reportKey: ReportKey }) {
  const [key, setKey] = useState<ReportKey>(reportKey);
  const [data, setData] = useState<ReportPayload | null>(null);
  const [feeGroups, setFeeGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; sections: { id: string; name: string }[] }>>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [feeGroupId, setFeeGroupId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    setKey(reportKey);
  }, [reportKey]);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/fee-groups").then((r) => r.json()),
      fetch("/api/v1/classes").then((r) => r.json()),
    ]).then(([g, c]) => {
      setFeeGroups(g.data ?? []);
      setClasses(c.data ?? []);
    });
  }, []);

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  function query() {
    const params = new URLSearchParams();
    if (classId) params.set("classId", classId);
    if (sectionId) params.set("sectionId", sectionId);
    if (feeGroupId) params.set("feeGroupId", feeGroupId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }

  async function load(event?: FormEvent) {
    event?.preventDefault();
    const qs = query();
    const res = await fetch(`/api/v1/reports/${key}${qs ? `?${qs}` : ""}`);
    setData(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl">{data?.title ?? "Report"}</h1>
        <a
          className="text-sm underline"
          href={`/api/v1/reports/${key}?${query()}&format=csv`}
        >
          Download CSV
        </a>
      </div>
      <form className="grid gap-3 sm:grid-cols-6" onSubmit={load}>
        <div>
          <Label>Report</Label>
          <select
            className={SELECT}
            value={key}
            onChange={(e) => setKey(e.target.value as ReportKey)}
          >
            {REPORT_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Class</Label>
          <select
            className={SELECT}
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId("");
            }}
          >
            <option value="">All</option>
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
            className={SELECT}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            <option value="">All</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Fee group</Label>
          <select
            className={SELECT}
            value={feeGroupId}
            onChange={(e) => setFeeGroupId(e.target.value)}
          >
            <option value="">All</option>
            {feeGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit" className="self-end">
          Run
        </Button>
      </form>
      {data?.columns ? (
        <div className="overflow-x-auto border border-[var(--rule)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[var(--ink)] text-[var(--paper)]">
              <tr>
                {data.columns.map((c) => (
                  <th key={c} className="px-3 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="odd:bg-[var(--paper-2)]">
                  {data.columns.map((c) => (
                    <td key={c} className="px-3 py-2">
                      {row[c] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
              {!data.rows.length ? (
                <tr>
                  <td className="px-3 py-6 text-center text-[var(--muted)]" colSpan={data.columns.length}>
                    No rows
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
