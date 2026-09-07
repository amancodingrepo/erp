"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "blocks" | "allocate" | "report";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function SeatingOps({ mode }: { mode: Mode }) {
  if (mode === "allocate") return <AllocatePanel />;
  if (mode === "report") return <ReportPanel />;
  return <BlocksPanel />;
}

function BlocksPanel() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; capacity: number }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/seating/blocks").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/seating/blocks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        capacity: Number(form.get("capacity")),
      }),
    });
    setMessage(res.ok ? "Block saved" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Seating blocks</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Block / room" required />
        <Input name="capacity" type="number" min={1} defaultValue={20} required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.name} · {r.capacity} seats
          </li>
        ))}
      </ul>
    </div>
  );
}

function AllocatePanel() {
  const [blocks, setBlocks] = useState<Array<{ id: string; name: string }>>([]);
  const [papers, setPapers] = useState<Array<{ id: string; label: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/seating/blocks")
      .then((r) => r.json())
      .then((j) => setBlocks(j.data ?? []));
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []));
    fetch("/api/v1/exam-groups")
      .then((r) => r.json())
      .then((j) => {
        const list: Array<{ id: string; label: string }> = [];
        for (const g of j.data ?? []) {
          for (const e of g.exams ?? []) {
            for (const s of e.subjects ?? []) {
              list.push({ id: s.id, label: `${g.name} / ${e.name}` });
            }
          }
        }
        setPapers(list);
      });
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/seating/allocate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        examSubjectId: form.get("examSubjectId"),
        blockIds: form.getAll("blockIds"),
        classId: form.get("classId") || undefined,
      }),
    });
    const json = await res.json();
    setMessage(
      res.ok ? `Seated ${(json.data ?? []).length}` : json.fields?.capacity ?? json.message ?? json.error,
    );
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Assign blocks</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="examSubjectId" className={SELECT} required>
          {papers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select name="classId" className={SELECT}>
          <option value="">All classes in session</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="blockIds" className={SELECT} multiple required>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <Button type="submit">Auto-allocate</Button>
      </form>
    </div>
  );
}

function ReportPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; seatNo: string; block: string; exam: string; student: { name: string; admissionNo: string } }>
  >([]);
  useEffect(() => {
    fetch("/api/v1/seating/assignments")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Seating report</h1>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.exam} · {r.seatNo} ({r.block}) · {r.student.admissionNo} {r.student.name}
          </li>
        ))}
        {!rows.length ? <li>No seats yet.</li> : null}
      </ul>
    </div>
  );
}
