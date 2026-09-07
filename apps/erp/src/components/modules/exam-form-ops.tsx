"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "atkt-settings" | "reval-settings" | "atkt-apply" | "reval-apply" | "report";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function ExamFormOps({ mode }: { mode: Mode }) {
  if (mode === "atkt-settings") return <WindowPanel kind="ATKT" />;
  if (mode === "reval-settings") return <WindowPanel kind="REVAL" />;
  if (mode === "atkt-apply") return <ApplyPanel kind="ATKT" />;
  if (mode === "reval-apply") return <ApplyPanel kind="REVAL" />;
  return <ReportPanel />;
}

function WindowPanel({ kind }: { kind: "ATKT" | "REVAL" }) {
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<
    Array<{ id: string; feeAmount: string; opensAt: string; closesAt: string; examGroup: { name: string } }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [g, w] = await Promise.all([
      fetch("/api/v1/exam-groups").then((r) => r.json()),
      fetch(`/api/v1/exam-forms/windows?kind=${kind}`).then((r) => r.json()),
    ]);
    setGroups(g.data ?? []);
    setRows(w.data ?? []);
  }
  useEffect(() => {
    load();
  }, [kind]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/exam-forms/windows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        examGroupId: form.get("examGroupId"),
        opensAt: form.get("opensAt"),
        closesAt: form.get("closesAt"),
        feeAmount: form.get("feeAmount"),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Window saved" : json.message ?? json.error);
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{kind} window</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="examGroupId" className={SELECT} required>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Input name="opensAt" type="datetime-local" required />
        <Input name="closesAt" type="datetime-local" required />
        <Input name="feeAmount" placeholder="Fee (INR)" required />
        <Button type="submit">Open window</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.examGroup.name} · ₹{r.feeAmount} · {new Date(r.opensAt).toLocaleString()} –{" "}
            {new Date(r.closesAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ApplyPanel({ kind }: { kind: "ATKT" | "REVAL" }) {
  const [windows, setWindows] = useState<
    Array<{
      id: string;
      feeAmount: string;
      examGroup: { name: string };
    }>
  >([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [groups, setGroups] = useState<
    Array<{
      id: string;
      name: string;
      exams: Array<{ name: string; subjects: Array<{ id: string }> }>;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/v1/exam-forms/windows?kind=${kind}`)
      .then((r) => r.json())
      .then((j) => setWindows(j.data ?? []));
    fetch("/api/v1/students?pageSize=100")
      .then((r) => r.json())
      .then((j) => setStudents(j.data ?? []));
    fetch("/api/v1/exam-groups")
      .then((r) => r.json())
      .then((j) => setGroups(j.data ?? []));
  }, [kind]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subjectIds = form.getAll("subjectIds").map(String);
    const res = await fetch("/api/v1/exam-forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        windowId: form.get("windowId"),
        studentId: form.get("studentId"),
        subjectIds,
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? `Submitted, fee ₹${json.feeAmount}` : json.message ?? json.error);
  }
  const subjects = groups.flatMap((g) =>
    g.exams.flatMap((e) => e.subjects.map((s) => ({ id: s.id, label: `${g.name} / ${e.name}` }))),
  );
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">{kind} form</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="windowId" className={SELECT} required>
          {windows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.examGroup.name} · ₹{w.feeAmount}
            </option>
          ))}
        </select>
        <select name="studentId" className={SELECT} required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="subjectIds" className={SELECT} multiple required>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <Button type="submit">Submit form</Button>
      </form>
    </div>
  );
}

function ReportPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      kind: string;
      feeAmount: string;
      student: { name: string; admissionNo: string };
      examGroup: { name: string };
    }>
  >([]);
  useEffect(() => {
    fetch("/api/v1/exam-forms")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Exam forms</h1>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.kind} · {r.student.admissionNo} {r.student.name} · {r.examGroup.name} · ₹
            {r.feeAmount}
          </li>
        ))}
        {!rows.length ? <li>No forms yet.</li> : null}
      </ul>
    </div>
  );
}
