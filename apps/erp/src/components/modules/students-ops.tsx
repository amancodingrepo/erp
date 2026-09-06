"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode = "rolls" | "import" | "categories" | "disableReasons";
type Option = { id: string; name: string };
type Klass = Option & { sections: Option[] };

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function StudentsOps({ mode }: { mode: Mode }) {
  if (mode === "rolls") return <RollsPanel />;
  if (mode === "import") return <ImportPanel />;
  if (mode === "categories") return <MasterPanel kind="categories" title="Student categories" />;
  return <MasterPanel kind="disable-reasons" title="Disable reasons" />;
}

function RollsPanel() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  useEffect(() => {
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/students/roll-numbers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classId: form.get("classId"),
        sectionId: form.get("sectionId"),
        startFrom: Number(form.get("startFrom")),
        arrangement: form.get("arrangement"),
        sort: form.get("sort"),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? `Updated ${json.updated} rolls` : json.message ?? json.error);
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Generate roll numbers</h1>
      <form className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="classId">Class</Label>
          <select
            id="classId"
            name="classId"
            className={SELECT}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            required
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
          <Label htmlFor="sectionId">Section</Label>
          <select id="sectionId" name="sectionId" className={SELECT} required>
            <option value="">—</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="startFrom">Starting roll</Label>
          <Input id="startFrom" name="startFrom" defaultValue="101" required />
        </div>
        <div>
          <Label htmlFor="arrangement">Arrangement</Label>
          <select id="arrangement" name="arrangement" className={SELECT}>
            <option value="mix">Mix</option>
            <option value="boys_first">First boys</option>
            <option value="girls_first">First girls</option>
          </select>
        </div>
        <div>
          <Label htmlFor="sort">Sort as</Label>
          <select id="sort" name="sort" className={SELECT}>
            <option value="last">Last name</option>
            <option value="first">First name</option>
            <option value="id">ID</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Assign rolls</Button>
        </div>
      </form>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </div>
  );
}

function ImportPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Array<{ line: number; fields: Record<string, string> }>>(
    [],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch("/api/v1/students/import", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const json = await res.json();
    if (res.ok) {
      setErrors([]);
      setMessage(`Inserted ${json.inserted} students`);
      return;
    }
    setMessage(json.message ?? json.error ?? "Import failed");
    setErrors(json.errors ?? []);
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Bulk upload</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        CSV header must include Student ID and First Name. One bad row rolls back the
        whole file.
      </p>
      <form className="mt-6 max-w-xl space-y-4" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="file">CSV file</Label>
          <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        <Button type="submit">Import</Button>
      </form>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      {errors.length ? (
        <ul className="mt-3 space-y-1 text-sm text-[var(--stamp)]">
          {errors.map((e) => (
            <li key={e.line}>
              Line {e.line}: {Object.entries(e.fields).map(([k, v]) => `${k} ${v}`).join(", ")}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MasterPanel({
  kind,
  title,
}: {
  kind: "categories" | "disable-reasons";
  title: string;
}) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; code?: string | null }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  const path = kind === "categories" ? "/api/v1/categories" : "/api/v1/disable-reasons";

  async function load() {
    const res = await fetch(path);
    const json = await res.json();
    setRows(json.data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        code: data.get("code") || undefined,
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    if (res.ok) form.reset();
    load();
  }

  return (
    <div>
      <h1 className="font-display text-4xl">{title}</h1>
      <form className="mt-6 flex max-w-xl flex-wrap gap-3" onSubmit={onSubmit}>
        <div className="min-w-48 flex-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        {kind === "categories" ? (
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" />
          </div>
        ) : null}
        <Button type="submit" className="self-end">
          Add
        </Button>
      </form>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      <ul className="mt-6 space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.name}
            {r.code ? ` (${r.code})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
