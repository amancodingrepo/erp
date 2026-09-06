"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode = "staff" | "designations" | "notices" | "settings";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function CampusOps({ mode }: { mode: Mode }) {
  if (mode === "staff") return <StaffPanel />;
  if (mode === "designations") return <NamedMaster path="/api/v1/designations" title="Designations" />;
  if (mode === "notices") return <NoticesPanel />;
  return <SettingsPanel />;
}

function NamedMaster({ path, title }: { path: string; title: string }) {
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([]);
  async function load() {
    setRows(((await (await fetch(path)).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    event.currentTarget.reset();
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{title}</h1>
      <form className="flex gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Name" required />
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

function StaffPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      employeeId: string;
      firstName: string;
      lastName?: string | null;
      department?: { name: string } | null;
      designation?: { name: string } | null;
    }>
  >([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [designations, setDesignations] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [s, d, des] = await Promise.all([
      fetch("/api/v1/staff").then((r) => r.json()),
      fetch("/api/v1/departments").then((r) => r.json()),
      fetch("/api/v1/designations").then((r) => r.json()),
    ]);
    setRows(s.data ?? []);
    setDepartments(d.data ?? []);
    setDesignations(des.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/staff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        employeeId: form.get("employeeId"),
        firstName: form.get("firstName"),
        lastName: form.get("lastName") || undefined,
        email: form.get("email") || undefined,
        phone: form.get("phone") || undefined,
        departmentId: form.get("departmentId") || undefined,
        designationId: form.get("designationId") || undefined,
        username: form.get("username") || undefined,
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Staff saved" : json.message ?? json.error);
    if (res.ok) {
      event.currentTarget.reset();
      load();
    }
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Staff</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-3xl gap-3 sm:grid-cols-3" onSubmit={onSubmit}>
        <Input name="employeeId" placeholder="Staff ID" required />
        <Input name="firstName" placeholder="First name" required />
        <Input name="lastName" placeholder="Last name" />
        <Input name="email" type="email" placeholder="Email" />
        <Input name="phone" placeholder="Phone" />
        <Input name="username" placeholder="Login (optional)" />
        <select name="departmentId" className={SELECT}>
          <option value="">Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="designationId" className={SELECT}>
          <option value="">Designation</option>
          {designations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <Button type="submit">Create staff</Button>
      </form>
      <table className="w-full text-left text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-1">{r.employeeId}</td>
              <td>
                {r.firstName} {r.lastName}
              </td>
              <td>{r.department?.name ?? "—"}</td>
              <td>{r.designation?.name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoticesPanel() {
  const [rows, setRows] = useState<Array<{ id: string; title: string; audience: string }>>([]);
  async function load() {
    setRows(((await (await fetch("/api/v1/notices")).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/notices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        body: form.get("body"),
        audience: form.get("audience"),
        classId: form.get("classId") || undefined,
      }),
    });
    event.currentTarget.reset();
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Notices</h1>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="title" placeholder="Title" required />
        <textarea
          name="body"
          required
          className="min-h-24 rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
        />
        <select name="audience" className={SELECT} defaultValue="all">
          <option value="all">All</option>
          <option value="staff">Staff</option>
          <option value="students">Students</option>
          <option value="class">Class</option>
        </select>
        <Input name="classId" placeholder="Class id (if class audience)" />
        <Button type="submit">Publish</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.title} · {r.audience}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPanel() {
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [dateFormat, setDateFormat] = useState("");
  const [attendanceMode, setAttendanceMode] = useState("daily");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((j) => {
        setName(j.name ?? "");
        setTimezone(j.timezone ?? "");
        setDateFormat(j.dateFormat ?? "");
        setAttendanceMode(j.attendanceMode ?? "daily");
      });
  }, []);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, timezone, dateFormat, attendanceMode }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Campus settings</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="name">Institute name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dateFormat">Date format</Label>
          <Input id="dateFormat" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="attendanceMode">Attendance mode</Label>
          <select
            id="attendanceMode"
            className={SELECT}
            value={attendanceMode}
            onChange={(e) => setAttendanceMode(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="subject">Subject / period</option>
          </select>
        </div>
        <Button type="submit">Save settings</Button>
      </form>
    </div>
  );
}
