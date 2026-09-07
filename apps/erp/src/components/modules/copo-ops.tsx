"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode =
  | "po"
  | "co"
  | "mapping"
  | "indirect"
  | "attainment"
  | "lesson"
  | "tlp";

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function CopoOps({ mode }: { mode: Mode }) {
  if (mode === "co") return <CoPanel />;
  if (mode === "mapping") return <MapPanel />;
  if (mode === "indirect") return <IndirectPanel />;
  if (mode === "attainment") return <AttainmentPanel />;
  if (mode === "lesson") return <LessonPanel />;
  if (mode === "tlp") return <TlpPanel />;
  return <PoPanel />;
}

function PoPanel() {
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<Array<{ id: string; code: string; title: string; kind: string }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [p, o] = await Promise.all([
      fetch("/api/v1/programs").then((r) => r.json()),
      fetch("/api/v1/copo/program-outcomes").then((r) => r.json()),
    ]);
    setPrograms(p.data ?? []);
    setRows(o.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/copo/program-outcomes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        programId: form.get("programId"),
        code: form.get("code"),
        title: form.get("title"),
        kind: form.get("kind"),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Program outcomes</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="programId" className={SELECT} required>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select name="kind" className={SELECT}>
          <option value="PO">PO</option>
          <option value="PSO">PSO</option>
        </select>
        <Input name="code" placeholder="PO1" required />
        <Input name="title" placeholder="Title" required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.kind} {r.code} · {r.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CoPanel() {
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<Array<{ id: string; code: string; title: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [s, c] = await Promise.all([
      fetch("/api/v1/subjects").then((r) => r.json()),
      fetch("/api/v1/copo/course-outcomes").then((r) => r.json()),
    ]);
    setSubjects(s.data ?? []);
    setRows(c.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/copo/course-outcomes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subjectId: form.get("subjectId"),
        code: form.get("code"),
        title: form.get("title"),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Course outcomes</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="subjectId" className={SELECT} required>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input name="code" placeholder="CO1" required />
        <Input name="title" placeholder="Title" required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.code} · {r.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MapPanel() {
  const [cos, setCos] = useState<Array<{ id: string; code: string }>>([]);
  const [pos, setPos] = useState<Array<{ id: string; code: string }>>([]);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      weight: number;
      courseOutcome: { code: string };
      programOutcome: { code: string };
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [c, p, m] = await Promise.all([
      fetch("/api/v1/copo/course-outcomes").then((r) => r.json()),
      fetch("/api/v1/copo/program-outcomes").then((r) => r.json()),
      fetch("/api/v1/copo/mappings").then((r) => r.json()),
    ]);
    setCos(c.data ?? []);
    setPos(p.data ?? []);
    setRows(m.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/copo/mappings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        courseOutcomeId: form.get("courseOutcomeId"),
        programOutcomeId: form.get("programOutcomeId"),
        weight: Number(form.get("weight")),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Mapped" : json.fields?.weight ?? json.message ?? json.error);
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">CO-PO mapping</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="courseOutcomeId" className={SELECT} required>
          {cos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <select name="programOutcomeId" className={SELECT} required>
          {pos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code}
            </option>
          ))}
        </select>
        <Input name="weight" type="number" min={0} max={3} defaultValue={1} required />
        <Button type="submit">Save weight 0–3</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.courseOutcome.code} → {r.programOutcome.code} · {r.weight}
          </li>
        ))}
      </ul>
    </div>
  );
}

function IndirectPanel() {
  const [pos, setPos] = useState<Array<{ id: string; code: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/copo/program-outcomes")
      .then((r) => r.json())
      .then((j) => setPos(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/copo/indirect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        programOutcomeId: form.get("programOutcomeId"),
        percent: form.get("percent"),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Indirect PO</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="programOutcomeId" className={SELECT} required>
          {pos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code}
            </option>
          ))}
        </select>
        <Input name="percent" placeholder="Percent 0-100" required />
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}

function AttainmentPanel() {
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<
    Array<{ code: string; direct: number; indirect: number | null; overall: number }>
  >([]);
  useEffect(() => {
    fetch("/api/v1/programs")
      .then((r) => r.json())
      .then((j) => setPrograms(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch(
      `/api/v1/copo/attainment?programId=${form.get("programId")}`,
    );
    const json = await res.json();
    setRows(json.data ?? []);
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">OBE attainment</h1>
      <form className="flex max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="programId" className={SELECT} required>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button type="submit">Compute</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.code}>
            {r.code}: direct {r.direct}%
            {r.indirect !== null ? ` · indirect ${r.indirect}%` : ""} · overall {r.overall}%
          </li>
        ))}
      </ul>
    </div>
  );
}

function LessonPanel() {
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [cos, setCos] = useState<Array<{ id: string; code: string }>>([]);
  const [rows, setRows] = useState<
    Array<{ id: string; title: string; status: string; subject: { name: string } }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [s, c, l] = await Promise.all([
      fetch("/api/v1/subjects").then((r) => r.json()),
      fetch("/api/v1/copo/course-outcomes").then((r) => r.json()),
      fetch("/api/v1/copo/lessons").then((r) => r.json()),
    ]);
    setSubjects(s.data ?? []);
    setCos(c.data ?? []);
    setRows(l.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/copo/lessons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subjectId: form.get("subjectId"),
        title: form.get("title"),
        courseOutcomeId: form.get("courseOutcomeId") || undefined,
      }),
    });
    setMessage(res.ok ? "Plan submitted" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Teaching plan</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="subjectId" className={SELECT} required>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="courseOutcomeId" className={SELECT}>
          <option value="">No CO</option>
          {cos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <Input name="title" placeholder="Lesson title" required />
        <Button type="submit">Submit plan</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.subject.name} · {r.title} · {r.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TlpPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; title: string; status: string; subject: { name: string } }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/copo/lessons").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function review(id: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/v1/copo/lessons/${id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setMessage(res.ok ? status : "Could not review");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">TLP approve</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.subject.name} · {r.title} · {r.status}{" "}
            {r.status === "SUBMITTED" ? (
              <>
                <button type="button" className="underline" onClick={() => review(r.id, "APPROVED")}>
                  Approve
                </button>{" "}
                <button type="button" className="underline" onClick={() => review(r.id, "REJECTED")}>
                  Reject
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
