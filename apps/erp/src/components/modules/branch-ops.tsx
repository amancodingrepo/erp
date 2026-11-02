"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode =
  | "birthdays"
  | "eligibility"
  | "one-way"
  | "links"
  | "principals"
  | "attendance-modes"
  | "subject-categories"
  | "subject-types"
  | "leave-marks"
  | "website";

const SELECT =
  "h-10 w-full rounded-xl border border-[var(--rule)] bg-white px-3 text-sm";

export default function BranchOps({ mode }: { mode: Mode }) {
  if (mode === "birthdays") return <BirthdaysPanel />;
  if (mode === "eligibility") return <EligibilityPanel />;
  if (mode === "one-way") return <OneWayPanel />;
  if (mode === "links") return <LinksPanel />;
  if (mode === "principals") return <PrincipalsPanel />;
  if (mode === "subject-categories") return <NamedMasterPanel kind="categories" />;
  if (mode === "subject-types") return <NamedMasterPanel kind="types" />;
  if (mode === "leave-marks") return <LeaveMarksPanel />;
  if (mode === "website") return <WebsitePanel />;
  return <AttendanceModesPanel />;
}

function BirthdaysPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      kind: string;
      name: string;
      dob: string;
      when: string;
      className: string;
    }>
  >([]);
  useEffect(() => {
    fetch("/api/v1/birthdays")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Birthdays</h1>
      <p className="text-sm text-[var(--muted)]">
        Live student dates of birth plus staff extras dob, for the next and past week.
      </p>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={`${row.kind}-${row.id}`}>
            {row.name} · {row.kind}
            {row.className ? ` · ${row.className}` : ""} · {row.dob} · {row.when}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EligibilityPanel() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<
    Array<{ id: string; classId: string; fromBirthDate: string; toBirthDate: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [c, e] = await Promise.all([
      fetch("/api/v1/classes").then((r) => r.json()),
      fetch("/api/v1/grade-eligibility").then((r) => r.json()),
    ]);
    setClasses(c.data ?? []);
    setRows(e.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/grade-eligibility", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classId: form.get("classId"),
        fromBirthDate: form.get("fromBirthDate"),
        toBirthDate: form.get("toBirthDate"),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Class eligibility</h1>
      <p className="text-sm text-[var(--muted)]">
        Birth-date window per class for admission age gates.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="classId" className={SELECT} required>
          {classes.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <div>
          <Label htmlFor="fromBirthDate">From birth date</Label>
          <Input id="fromBirthDate" name="fromBirthDate" type="date" required />
        </div>
        <div>
          <Label htmlFor="toBirthDate">To birth date</Label>
          <Input id="toBirthDate" name="toBirthDate" type="date" required />
        </div>
        <Button type="submit">Save window</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {classes.find((c) => c.id === row.classId)?.name ?? row.classId} ·{" "}
              {row.fromBirthDate} – {row.toBirthDate}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/grade-eligibility/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OneWayPanel() {
  const [roles, setRoles] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/messages/policies").then((r) => r.json());
    setRoles(j.data?.roles ?? []);
    setBlocked(new Set(j.data?.blocked ?? []));
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/v1/messages/policies", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roles: [...blocked] }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">One-way communication</h1>
      <p className="text-sm text-[var(--muted)]">
        Parents cannot send private messages to the selected roles.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <ul className="text-sm">
          {roles.map((name) => (
            <li key={name}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={blocked.has(name)}
                  onChange={(event) => {
                    const next = new Set(blocked);
                    if (event.target.checked) next.add(name);
                    else next.delete(name);
                    setBlocked(next);
                  }}
                />
                Parent can&apos;t message {name}
              </label>
            </li>
          ))}
        </ul>
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}

function LinksPanel() {
  const [rows, setRows] = useState<Array<{ id: string; title: string; url: string }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/links").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        url: form.get("url"),
      }),
    });
    setMessage(res.ok ? "Saved" : "HTTPS URL required");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">External links</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="title" placeholder="School website" required />
        <Input name="url" placeholder="https://…" required />
        <Button type="submit">Save link</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3">
            {row.title} · {row.url}
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/links/${row.id}`, { method: "DELETE" });
                setMessage(res.ok ? "Link removed" : "Could not remove link");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WebsitePanel() {
  const [site, setSite] = useState({
    published: false,
    tagline: "",
    about: "",
    logoUrl: "",
    phone: "",
    email: "",
    address: "",
  });
  const [code, setCode] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [w, me] = await Promise.all([
      fetch("/api/v1/website").then((r) => r.json()),
      fetch("/api/v1/auth/me").then((r) => r.json()),
    ]);
    setSite({
      published: Boolean(w.published),
      tagline: w.tagline ?? "",
      about: w.about ?? "",
      logoUrl: w.logoUrl ?? "",
      phone: w.phone ?? "",
      email: w.email ?? "",
      address: w.address ?? "",
    });
    setCode(me.campus?.code ?? "");
    setLoaded(true);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/website", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        published: form.get("published") === "on",
        tagline: form.get("tagline"),
        about: form.get("about"),
        logoUrl: form.get("logoUrl"),
        phone: form.get("phone"),
        email: form.get("email"),
        address: form.get("address"),
      }),
    });
    setMessage(res.ok ? "Saved" : "HTTPS logo required");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">School website</h1>
      <p className="text-sm text-[var(--muted)]">
        Public page at /s/{code || "CODE"}. About text is plain text. Logo must be HTTPS.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      {loaded ? (
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Input name="tagline" placeholder="Tagline" defaultValue={site.tagline} />
          <textarea
            name="about"
            defaultValue={site.about}
            className="min-h-24 rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
            placeholder="About the school"
          />
          <Input name="logoUrl" placeholder="https://logo…" defaultValue={site.logoUrl} />
          <Input name="address" placeholder="Address" defaultValue={site.address} />
          <Input name="phone" placeholder="Phone" defaultValue={site.phone} />
          <Input name="email" placeholder="Email" defaultValue={site.email} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" defaultChecked={site.published} />
            Publish public page
          </label>
          <Button type="submit">Save website</Button>
        </form>
      ) : null}
    </div>
  );
}

function PrincipalsPanel() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [staff, setStaff] = useState<
    Array<{ id: string; firstName: string; lastName?: string }>
  >([]);
  const [rows, setRows] = useState<
    Array<{ id: string; classId: string; staffId: string; signatureUrl: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [c, s, p] = await Promise.all([
      fetch("/api/v1/classes").then((r) => r.json()),
      fetch("/api/v1/staff").then((r) => r.json()),
      fetch("/api/v1/principals").then((r) => r.json()),
    ]);
    setClasses(c.data ?? []);
    setStaff(s.data ?? []);
    setRows(p.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/principals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classId: form.get("classId"),
        staffId: form.get("staffId"),
        signatureUrl: form.get("signatureUrl"),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Principal details</h1>
      <p className="text-sm text-[var(--muted)]">
        Assign a live staff member as principal for a class, with optional signature URL.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="classId" className={SELECT} required>
          {classes.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select name="staffId" className={SELECT} required>
          {staff.map((row) => (
            <option key={row.id} value={row.id}>
              {[row.firstName, row.lastName].filter(Boolean).join(" ")}
            </option>
          ))}
        </select>
        <Input name="signatureUrl" placeholder="https://signature…" />
        <Button type="submit">Assign principal</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            {classes.find((c) => c.id === row.classId)?.name ?? row.classId} ·{" "}
            {staff.find((s) => s.id === row.staffId)?.firstName ?? row.staffId}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AttendanceModesPanel() {
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/attendance/modes").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/attendance/modes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    event.currentTarget.reset();
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Attendance modes</h1>
      <p className="text-sm text-[var(--muted)]">
        How attendance is captured (manual, RFID, biometric). Names only — no device stream.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="flex gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="RFID" required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>{row.name}</span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/attendance/modes/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NamedMasterPanel({ kind }: { kind: "categories" | "types" }) {
  const path =
    kind === "categories" ? "/api/v1/subject-categories" : "/api/v1/subject-types";
  const title = kind === "categories" ? "Subject categories" : "Subject types";
  const hint =
    kind === "categories"
      ? "Skill buckets used as sub-subject groups (Listening, Reading, Speaking, Writing)."
      : "Assessment component types (Activity, Project, Practical, Behaviour, ASL).";
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch(path).then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, [path]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    event.currentTarget.reset();
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="text-sm text-[var(--muted)]">{hint}</p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="flex gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder={kind === "categories" ? "Listening" : "Practical"} required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>{row.name}</span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`${path}/${row.id}`, { method: "DELETE" });
                setMessage(res.ok ? "Removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeaveMarksPanel() {
  const [types, setTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<
    Array<{ id: string; leaveTypeId: string; percent: number }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [t, p] = await Promise.all([
      fetch("/api/v1/leave-types").then((r) => r.json()),
      fetch("/api/v1/leave-mark-percents").then((r) => r.json()),
    ]);
    setTypes(t.data ?? []);
    setRows(p.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/leave-mark-percents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        leave_type_id: form.get("leaveTypeId"),
        percent: Number(form.get("percent")),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    event.currentTarget.reset();
    load();
  }
  const nameOf = (id: string) => types.find((row) => row.id === id)?.name ?? id;
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Leave marks percent</h1>
      <p className="text-sm text-[var(--muted)]">
        Students on approved leave on the exam date receive this percent of entered marks.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]" onSubmit={onSubmit}>
        <select name="leaveTypeId" className={SELECT} required>
          <option value="">Leave type</option>
          {types.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Input name="percent" type="number" min={0} max={100} step="1" placeholder="75" required />
        <Button type="submit">Save</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {nameOf(row.leaveTypeId)} · {row.percent}%
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/leave-mark-percents/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
