"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Session = { id: string; name: string; isCurrent: boolean };
type Department = { id: string; name: string };
type Program = { id: string; name: string; departmentId: string };
type Klass = { id: string; name: string; programId: string; sections: { id: string; name: string }[] };
type Subject = { id: string; name: string; code?: string };

export default function AcademicsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [s, d, p, c, sub] = await Promise.all([
      fetch("/api/v1/sessions").then((r) => r.json()),
      fetch("/api/v1/departments").then((r) => r.json()),
      fetch("/api/v1/programs").then((r) => r.json()),
      fetch("/api/v1/classes").then((r) => r.json()),
      fetch("/api/v1/subjects").then((r) => r.json()),
    ]);
    setSessions(s.data ?? []);
    setDepartments(d.data ?? []);
    setPrograms(p.data ?? []);
    setClasses(c.data ?? []);
    setSubjects(sub.data ?? []);
  }

  useEffect(() => {
    reload();
  }, []);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setMessage(res.ok ? "Saved" : "Request failed");
    await reload();
  }

  function onDept(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    post("/api/v1/departments", { name: form.get("name"), code: form.get("code") });
    e.currentTarget.reset();
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl">Academics</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
      </div>
      <section>
        <h2 className="font-display text-2xl">Sessions</h2>
        <ul className="mt-3 space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 text-sm">
              <span>
                {s.name} {s.isCurrent ? "· current" : ""}
              </span>
              {!s.isCurrent ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fetch(`/api/v1/sessions/${s.id}/activate`, { method: "POST" }).then(reload)}
                >
                  Activate
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={onDept} className="space-y-3 border border-[var(--rule)] p-4">
          <h2 className="font-display text-2xl">Department</h2>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" />
          </div>
          <Button type="submit" size="sm">
            Add
          </Button>
          <ul className="text-sm">
            {departments.map((d) => (
              <li key={d.id}>{d.name}</li>
            ))}
          </ul>
        </form>
        <form
          className="space-y-3 border border-[var(--rule)] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            post("/api/v1/programs", {
              departmentId: form.get("departmentId"),
              name: form.get("name"),
            });
            e.currentTarget.reset();
          }}
        >
          <h2 className="font-display text-2xl">Program</h2>
          <select
            name="departmentId"
            required
            className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Input name="name" placeholder="Program name" required />
          <Button type="submit" size="sm">
            Add
          </Button>
          <ul className="text-sm">
            {programs.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </form>
        <form
          className="space-y-3 border border-[var(--rule)] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            post("/api/v1/classes", {
              programId: form.get("programId"),
              name: form.get("name"),
              sectionNames: String(form.get("sections") || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            });
            e.currentTarget.reset();
          }}
        >
          <h2 className="font-display text-2xl">Class + sections</h2>
          <select
            name="programId"
            required
            className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Input name="name" placeholder="FY BCom" required />
          <Input name="sections" placeholder="A, B" />
          <Button type="submit" size="sm">
            Add
          </Button>
          <ul className="text-sm">
            {classes.map((c) => (
              <li key={c.id}>
                {c.name} — {c.sections.map((s) => s.name).join(", ")}
              </li>
            ))}
          </ul>
        </form>
        <form
          className="space-y-3 border border-[var(--rule)] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            post("/api/v1/subjects", {
              name: form.get("name"),
              code: form.get("code"),
            });
            e.currentTarget.reset();
          }}
        >
          <h2 className="font-display text-2xl">Subjects</h2>
          <Input name="name" placeholder="Accountancy" required />
          <Input name="code" placeholder="ACC101" />
          <Button type="submit" size="sm">
            Add
          </Button>
          <ul className="text-sm">
            {subjects.map((s) => (
              <li key={s.id}>
                {s.name} {s.code ? `(${s.code})` : ""}
              </li>
            ))}
          </ul>
        </form>
      </section>
    </div>
  );
}
