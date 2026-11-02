"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "forms" | "fields" | "assign" | "fill" | "submitted" | "report";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function FeedbackOps({ mode }: { mode: Mode }) {
  if (mode === "fields") return <FieldsPanel />;
  if (mode === "assign") return <AssignPanel />;
  if (mode === "fill") return <FillPanel />;
  if (mode === "submitted") return <SubmittedPanel />;
  if (mode === "report") return <ReportPanel />;
  return <FormsPanel />;
}

function FormsPanel() {
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/feedback/forms").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/feedback/forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    setMessage(res.ok ? "Form saved" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Feedback forms</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="flex max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Form name" required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </div>
  );
}

function FieldsPanel() {
  const [forms, setForms] = useState<
    Array<{ id: string; name: string; fields: Array<{ id: string; label: string; kind: string }> }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/feedback/forms").then((r) => r.json());
    setForms(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const options = String(form.get("options") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/v1/feedback/fields", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        formId: form.get("formId"),
        label: form.get("label"),
        kind: form.get("kind"),
        options: options.length ? options : undefined,
      }),
    });
    setMessage(res.ok ? "Field saved" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Feedback fields</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="formId" className={SELECT} required>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <Input name="label" placeholder="Question" required />
        <select name="kind" className={SELECT}>
          <option value="RATING">Rating 1–5</option>
          <option value="TEXT">Text</option>
          <option value="MCQ">MCQ</option>
        </select>
        <Input name="options" placeholder="MCQ options, comma separated" />
        <Button type="submit">Add field</Button>
      </form>
      <ul className="text-sm">
        {forms.flatMap((f) =>
          f.fields.map((field) => (
            <li key={field.id}>
              {f.name} · {field.kind} · {field.label}
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

function AssignPanel() {
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/feedback/forms")
      .then((r) => r.json())
      .then((j) => setForms(j.data ?? []));
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/feedback/assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        formId: form.get("formId"),
        classId: form.get("classId") || undefined,
        opensAt: form.get("opensAt"),
        closesAt: form.get("closesAt"),
      }),
    });
    setMessage(res.ok ? "Window opened" : "Could not assign");
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Assign feedback</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="formId" className={SELECT} required>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select name="classId" className={SELECT}>
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Input name="opensAt" type="datetime-local" required />
        <Input name="closesAt" type="datetime-local" required />
        <Button type="submit">Open window</Button>
      </form>
    </div>
  );
}

function FillPanel() {
  const [assignments, setAssignments] = useState<
    Array<{
      id: string;
      form: { name: string; fields: Array<{ id: string; label: string; kind: string; options?: string[] }> };
    }>
  >([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/feedback/assignments")
      .then((r) => r.json())
      .then((j) => setAssignments(j.data ?? []));
    fetch("/api/v1/students?pageSize=100")
      .then((r) => r.json())
      .then((j) => setStudents(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>, assignmentId: string, fieldIds: string[]) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const answers: Record<string, string> = {};
    for (const id of fieldIds) answers[id] = String(form.get(id) ?? "");
    const res = await fetch("/api/v1/feedback/responses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        respondentId: form.get("respondentId"),
        answers,
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Submitted" : json.message ?? json.error);
  }
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Fill feedback</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      {assignments.map((a) => (
        <form
          key={a.id}
          className="grid max-w-xl gap-3"
          onSubmit={(event) => onSubmit(event, a.id, a.form.fields.map((f) => f.id))}
        >
          <p className="font-medium">{a.form.name}</p>
          <select name="respondentId" className={SELECT} required>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {a.form.fields.map((f) => (
            <Input
              key={f.id}
              name={f.id}
              placeholder={
                f.kind === "RATING" ? `${f.label} (1-5)` : f.label
              }
              required
            />
          ))}
          <Button type="submit">Submit</Button>
        </form>
      ))}
      {!assignments.length ? <p className="text-sm">No open windows.</p> : null}
    </div>
  );
}

function SubmittedPanel() {
  const [rows, setRows] = useState<Array<{ id: string; form: string; respondentId: string }>>([]);
  useEffect(() => {
    fetch("/api/v1/feedback/responses")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Submitted feedback</h1>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.form} · {r.respondentId}
          </li>
        ))}
        {!rows.length ? <li>None yet.</li> : null}
      </ul>
    </div>
  );
}

function ReportPanel() {
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [report, setReport] = useState<{
    responses: number;
    fields: Array<{ label: string; kind: string; average?: number }>;
  } | null>(null);
  useEffect(() => {
    fetch("/api/v1/feedback/forms")
      .then((r) => r.json())
      .then((j) => setForms(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const j = await fetch(
      `/api/v1/feedback/report?formId=${form.get("formId")}`,
    ).then((r) => r.json());
    setReport(j);
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Feedback report</h1>
      <form className="flex max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="formId" className={SELECT} required>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <Button type="submit">Run</Button>
      </form>
      {report ? (
        <ul className="text-sm">
          <li>{report.responses} responses</li>
          {report.fields.map((f) => (
            <li key={f.label}>
              {f.label}
              {f.average !== undefined ? ` · avg ${f.average}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
