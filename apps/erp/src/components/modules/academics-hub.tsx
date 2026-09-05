"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export type AcademicsTab =
  | "sessions"
  | "department"
  | "programs"
  | "classes"
  | "sections"
  | "subjects"
  | "timetable"
  | "promotion"
  | "workingDays";

const TABS: { id: AcademicsTab; href: string; label: string }[] = [
  { id: "sessions", href: "/staff/sessions", label: "Sessions" },
  { id: "department", href: "/staff/department", label: "Department" },
  { id: "programs", href: "/staff/course-master", label: "Program" },
  { id: "classes", href: "/staff/classes", label: "Class" },
  { id: "sections", href: "/staff/sections", label: "Sections" },
  { id: "subjects", href: "/staff/subject", label: "Subjects" },
  { id: "timetable", href: "/staff/timetable/classreport", label: "Timetable" },
  { id: "promotion", href: "/staff/stdtransfer", label: "Promote" },
  { id: "workingDays", href: "/staff/holiday/set-working-days", label: "Working days" },
];

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Session = { id: string; name: string; isCurrent: boolean; code?: string | null };
type Department = { id: string; name: string; code?: string | null };
type Program = { id: string; name: string; departmentId: string };
type Klass = {
  id: string;
  name: string;
  programId: string;
  yearNo?: number | null;
  sections: { id: string; name: string }[];
};
type Subject = { id: string; name: string; code?: string | null; kind?: string };
type Period = { id: string; name: string; startTime: string; endTime: string; sortOrder: number };
type StaffRow = { id: string; firstName: string; lastName?: string | null; employeeId: string };
type Offering = { id: string; classId: string; sectionId?: string | null; subjectId: string; staffId?: string | null };
type Slot = {
  weekday: number;
  periodId: string;
  subjectId?: string | null;
  staffId?: string | null;
  room?: string | null;
};
type StudentRow = { id: string; admissionNo: string; name: string; rollNo?: string | null };
type Working = { id: string; date: string; isWorking: boolean; note?: string | null };

async function loadJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}

export default function AcademicsPage({ tab = "sessions" }: { tab?: AcademicsTab }) {
  const [message, setMessage] = useState<string | null>(null);
  const title = TABS.find((t) => t.id === tab)?.label ?? "Academics";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
      </div>
      <nav className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={`rounded-md px-3 py-1.5 text-sm ${
              item.id === tab
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "border border-[var(--rule)]"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>
      {tab === "sessions" ? <SessionsPanel onMessage={setMessage} /> : null}
      {tab === "department" ? <DepartmentsPanel onMessage={setMessage} /> : null}
      {tab === "programs" ? <ProgramsPanel onMessage={setMessage} /> : null}
      {tab === "classes" ? <ClassesPanel onMessage={setMessage} /> : null}
      {tab === "sections" ? <SectionsPanel onMessage={setMessage} /> : null}
      {tab === "subjects" ? <SubjectsPanel onMessage={setMessage} /> : null}
      {tab === "timetable" ? <TimetablePanel onMessage={setMessage} /> : null}
      {tab === "promotion" ? <PromotionPanel onMessage={setMessage} /> : null}
      {tab === "workingDays" ? <WorkingDaysPanel onMessage={setMessage} /> : null}
    </div>
  );
}

function SessionsPanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrent] = useState<string | null>(null);

  async function reload() {
    const json = await loadJson<{ data: Session[]; currentSessionId: string | null }>(
      "/api/v1/sessions",
    );
    setSessions(json.data ?? []);
    setCurrent(json.currentSessionId ?? null);
  }
  useEffect(() => {
    reload();
  }, []);

  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch("/api/v1/sessions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              code: form.get("code"),
              sequenceNo: Number(form.get("sequenceNo") || 0),
              startDate: form.get("startDate") || undefined,
              endDate: form.get("endDate") || undefined,
            }),
          });
          onMessage(res.ok ? "Session saved" : "Could not save session");
          e.currentTarget.reset();
          reload();
        }}
      >
        <h2 className="font-display text-2xl">New session</h2>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="2026-27" />
        </div>
        <div>
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" />
        </div>
        <div>
          <Label htmlFor="sequenceNo">Sequence</Label>
          <Input id="sequenceNo" name="sequenceNo" type="number" defaultValue={0} />
        </div>
        <div>
          <Label htmlFor="startDate">Start</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div>
          <Label htmlFor="endDate">End</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      <ul className="space-y-2 text-sm">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3">
            <span>
              {s.name} {s.id === currentSessionId || s.isCurrent ? "· current" : ""}
            </span>
            {s.id !== currentSessionId ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await fetch(`/api/v1/sessions/${s.id}/activate`, { method: "POST" });
                  onMessage("Session activated");
                  reload();
                }}
              >
                Activate
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DepartmentsPanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [rows, setRows] = useState<Department[]>([]);
  async function reload() {
    const json = await loadJson<{ data: Department[] }>("/api/v1/departments");
    setRows(json.data ?? []);
  }
  useEffect(() => {
    reload();
  }, []);
  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch("/api/v1/departments", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: form.get("name"), code: form.get("code") }),
          });
          onMessage(res.ok ? "Saved" : "Request failed");
          e.currentTarget.reset();
          reload();
        }}
      >
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
      </form>
      <ul className="text-sm">
        {rows.map((d) => (
          <li key={d.id}>
            {d.name} {d.code ? `(${d.code})` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProgramsPanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  async function reload() {
    const [d, p] = await Promise.all([
      loadJson<{ data: Department[] }>("/api/v1/departments"),
      loadJson<{ data: Program[] }>("/api/v1/programs"),
    ]);
    setDepartments(d.data ?? []);
    setPrograms(p.data ?? []);
  }
  useEffect(() => {
    reload();
  }, []);
  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch("/api/v1/programs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              departmentId: form.get("departmentId"),
              name: form.get("name"),
            }),
          });
          onMessage(res.ok ? "Saved" : "Request failed");
          e.currentTarget.reset();
          reload();
        }}
      >
        <h2 className="font-display text-2xl">Program</h2>
        <select name="departmentId" required className={SELECT}>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <Input name="name" placeholder="B.Com" required />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      <ul className="text-sm">
        {programs.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </section>
  );
}

function ClassesPanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  async function reload() {
    const [p, c] = await Promise.all([
      loadJson<{ data: Program[] }>("/api/v1/programs"),
      loadJson<{ data: Klass[]; sessionId: string | null }>("/api/v1/classes"),
    ]);
    setPrograms(p.data ?? []);
    setClasses(c.data ?? []);
    setSessionId(c.sessionId ?? null);
  }
  useEffect(() => {
    reload();
  }, []);
  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch("/api/v1/classes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              programId: form.get("programId"),
              name: form.get("name"),
              yearNo: form.get("yearNo") ? Number(form.get("yearNo")) : undefined,
              sectionNames: String(form.get("sections") || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }),
          });
          onMessage(res.ok ? "Saved" : "Request failed");
          e.currentTarget.reset();
          reload();
        }}
      >
        <h2 className="font-display text-2xl">Class</h2>
        <p className="text-xs text-[var(--muted)]">
          Current session: {sessionId ?? "—"}
        </p>
        <select name="programId" required className={SELECT}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Input name="name" placeholder="FY BCom" required />
        <Input name="yearNo" type="number" placeholder="Year" />
        <Input name="sections" placeholder="A, B" />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      <ul className="text-sm">
        {classes.map((c) => (
          <li key={c.id}>
            {c.name} — {c.sections.map((s) => s.name).join(", ")}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionsPanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [classes, setClasses] = useState<Klass[]>([]);
  async function reload() {
    const c = await loadJson<{ data: Klass[] }>("/api/v1/classes");
    setClasses(c.data ?? []);
  }
  useEffect(() => {
    reload();
  }, []);
  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch("/api/v1/sections", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              classId: form.get("classId"),
              name: form.get("name"),
            }),
          });
          const payload = await res.json().catch(() => ({}));
          onMessage(
            res.ok
              ? "Saved"
              : payload.message ?? payload.error ?? "Duplicate or invalid section",
          );
          if (res.ok) e.currentTarget.reset();
          reload();
        }}
      >
        <h2 className="font-display text-2xl">Section</h2>
        <select name="classId" required className={SELECT}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Input name="name" placeholder="A" required />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      <ul className="text-sm">
        {classes.map((c) => (
          <li key={c.id}>
            {c.name}: {c.sections.map((s) => s.name).join(", ") || "—"}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubjectsPanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function reload() {
    const [sub, c, st] = await Promise.all([
      loadJson<{ data: Subject[] }>("/api/v1/subjects"),
      loadJson<{ data: Klass[]; sessionId: string | null }>("/api/v1/classes"),
      loadJson<{ data: StaffRow[] }>("/api/v1/staff"),
    ]);
    setSubjects(sub.data ?? []);
    setClasses(c.data ?? []);
    setStaff(st.data ?? []);
    setSessionId(c.sessionId ?? null);
    const first = c.data?.[0]?.id ?? "";
    setClassId((cur) => cur || first);
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!classId) return;
    const q = new URLSearchParams({ classId });
    if (sessionId) q.set("sessionId", sessionId);
    loadJson<{ data: Offering[] }>(`/api/v1/class-subjects?${q}`).then((json) =>
      setOfferings(json.data ?? []),
    );
  }, [classId, sessionId]);

  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections ?? [],
    [classes, classId],
  );

  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch("/api/v1/subjects", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              code: form.get("code"),
              kind: form.get("kind") || "theory",
            }),
          });
          onMessage(res.ok ? "Saved" : "Request failed");
          e.currentTarget.reset();
          reload();
        }}
      >
        <h2 className="font-display text-2xl">Subject master</h2>
        <Input name="name" placeholder="Accountancy" required />
        <Input name="code" placeholder="ACC101" />
        <select name="kind" className={SELECT} defaultValue="theory">
          <option value="theory">Theory</option>
          <option value="practical">Practical</option>
          <option value="optional">Optional</option>
        </select>
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
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch("/api/v1/class-subjects", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              classId: form.get("classId"),
              sectionId: form.get("sectionId") || undefined,
              subjectId: form.get("subjectId"),
              staffId: form.get("staffId") || undefined,
              sessionId,
            }),
          });
          onMessage(res.ok ? "Teacher assigned" : "Assign failed");
          reload();
        }}
      >
        <h2 className="font-display text-2xl">Assign subject teacher</h2>
        <select
          name="classId"
          className={SELECT}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="sectionId" className={SELECT}>
          <option value="">All sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="subjectId" required className={SELECT}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="staffId" className={SELECT}>
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName ?? ""} ({s.employeeId})
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Assign
        </Button>
        <ul className="text-sm">
          {offerings.map((o) => {
            const sub = subjects.find((s) => s.id === o.subjectId);
            const teacher = staff.find((s) => s.id === o.staffId);
            return (
              <li key={o.id}>
                {sub?.name ?? o.subjectId} · {teacher ? `${teacher.firstName}` : "no teacher"}
              </li>
            );
          })}
        </ul>
      </form>
    </section>
  );
}

function TimetablePanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [grid, setGrid] = useState<Record<string, Slot>>({});

  const sections = useMemo(
    () => classes.find((c) => c.id === classId)?.sections ?? [],
    [classes, classId],
  );

  async function reloadMasters() {
    const [c, p, sub, st] = await Promise.all([
      loadJson<{ data: Klass[]; sessionId: string | null }>("/api/v1/classes"),
      loadJson<{ data: Period[] }>("/api/v1/periods"),
      loadJson<{ data: Subject[] }>("/api/v1/subjects"),
      loadJson<{ data: StaffRow[] }>("/api/v1/staff"),
    ]);
    setClasses(c.data ?? []);
    setPeriods(p.data ?? []);
    setSubjects(sub.data ?? []);
    setStaff(st.data ?? []);
    setSessionId(c.sessionId ?? null);
    const firstClass = c.data?.[0];
    setClassId((id) => id || firstClass?.id || "");
    setSectionId((id) => id || firstClass?.sections[0]?.id || "");
  }

  useEffect(() => {
    reloadMasters();
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    const q = new URLSearchParams({ sectionId });
    if (sessionId) q.set("sessionId", sessionId);
    loadJson<{ data: Slot[] }>(`/api/v1/timetable?${q}`).then((json) => {
      const next: Record<string, Slot> = {};
      for (const slot of json.data ?? []) {
        next[`${slot.weekday}:${slot.periodId}`] = slot;
      }
      setGrid(next);
    });
  }, [sectionId, sessionId]);

  function cell(weekday: number, periodId: string): Slot {
    return grid[`${weekday}:${periodId}`] ?? { weekday, periodId };
  }

  function update(weekday: number, periodId: string, patch: Partial<Slot>) {
    const key = `${weekday}:${periodId}`;
    setGrid((cur) => ({ ...cur, [key]: { ...cell(weekday, periodId), ...patch } }));
  }

  return (
    <section className="space-y-4">
      <form
        className="grid gap-3 border border-[var(--rule)] p-4 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch("/api/v1/periods", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              startTime: form.get("startTime"),
              endTime: form.get("endTime"),
            }),
          });
          onMessage(res.ok ? "Period saved" : "Period failed");
          e.currentTarget.reset();
          reloadMasters();
        }}
      >
        <Input name="name" placeholder="Period 1" required />
        <Input name="startTime" placeholder="09:00" required />
        <Input name="endTime" placeholder="09:50" required />
        <Button type="submit" size="sm">
          Add period
        </Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          className={SELECT}
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            const first = classes.find((c) => c.id === e.target.value)?.sections[0]?.id;
            setSectionId(first ?? "");
          }}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={SELECT}
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto border border-[var(--rule)]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-[var(--ink)] text-[var(--paper)]">
            <tr>
              <th className="px-2 py-2">Day</th>
              {periods.map((p) => (
                <th key={p.id} className="px-2 py-2">
                  {p.name}
                  <div className="font-normal opacity-70">
                    {p.startTime}–{p.endTime}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((label, weekday) => (
              <tr key={weekday} className="odd:bg-[var(--paper-2)] align-top">
                <td className="px-2 py-2 font-medium">{label}</td>
                {periods.map((p) => {
                  const slot = cell(weekday, p.id);
                  return (
                    <td key={p.id} className="px-2 py-2">
                      <select
                        className={SELECT}
                        value={slot.subjectId ?? ""}
                        onChange={(e) =>
                          update(weekday, p.id, { subjectId: e.target.value || null })
                        }
                      >
                        <option value="">—</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className={`${SELECT} mt-1`}
                        value={slot.staffId ?? ""}
                        onChange={(e) =>
                          update(weekday, p.id, { staffId: e.target.value || null })
                        }
                      >
                        <option value="">Staff</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.firstName}
                          </option>
                        ))}
                      </select>
                      <Input
                        className="mt-1 h-8"
                        placeholder="Room"
                        value={slot.room ?? ""}
                        onChange={(e) => update(weekday, p.id, { room: e.target.value })}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          const slots = Object.values(grid).filter((s) => s.subjectId || s.staffId || s.room);
          const res = await fetch("/api/v1/timetable", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sectionId, sessionId, slots }),
          });
          const payload = await res.json().catch(() => ({}));
          onMessage(
            res.ok ? "Timetable saved" : payload.message ?? payload.error ?? "Clash or error",
          );
        }}
      >
        Save timetable
      </Button>
    </section>
  );
}

function PromotionPanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [fromClass, setFromClass] = useState("");
  const [fromSection, setFromSection] = useState("");
  const [toClass, setToClass] = useState("");
  const [toSection, setToSection] = useState("");
  const [toSessionId, setToSessionId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      loadJson<{ data: Session[]; currentSessionId: string | null }>("/api/v1/sessions"),
      loadJson<{ data: Klass[] }>("/api/v1/classes"),
    ]).then(([s, c]) => {
      setSessions(s.data ?? []);
      setClasses(c.data ?? []);
      setFromClass(c.data?.[0]?.id ?? "");
      setFromSection(c.data?.[0]?.sections[0]?.id ?? "");
      setToClass(c.data?.[1]?.id ?? c.data?.[0]?.id ?? "");
      setToSection(
        c.data?.[1]?.sections[0]?.id ?? c.data?.[0]?.sections[0]?.id ?? "",
      );
      const next = (s.data ?? []).find((row) => row.id !== s.currentSessionId);
      setToSessionId(next?.id ?? s.currentSessionId ?? "");
    });
  }, []);

  useEffect(() => {
    if (!fromClass || !fromSection) return;
    const q = new URLSearchParams({ classId: fromClass, sectionId: fromSection });
    loadJson<{ data: StudentRow[] }>(`/api/v1/students?${q}`).then((json) => {
      setStudents(json.data ?? []);
      setPicked(new Set((json.data ?? []).map((row) => row.id)));
    });
  }, [fromClass, fromSection]);

  const fromSections = classes.find((c) => c.id === fromClass)?.sections ?? [];
  const toSections = classes.find((c) => c.id === toClass)?.sections ?? [];

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>From class</Label>
          <select
            className={SELECT}
            value={fromClass}
            onChange={(e) => {
              setFromClass(e.target.value);
              setFromSection(
                classes.find((c) => c.id === e.target.value)?.sections[0]?.id ?? "",
              );
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={`${SELECT} mt-2`}
            value={fromSection}
            onChange={(e) => setFromSection(e.target.value)}
          >
            {fromSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>To class / session</Label>
          <select
            className={SELECT}
            value={toClass}
            onChange={(e) => {
              setToClass(e.target.value);
              setToSection(
                classes.find((c) => c.id === e.target.value)?.sections[0]?.id ?? "",
              );
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={`${SELECT} mt-2`}
            value={toSection}
            onChange={(e) => setToSection(e.target.value)}
          >
            {toSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className={`${SELECT} mt-2`}
            value={toSessionId}
            onChange={(e) => setToSessionId(e.target.value)}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left"> </th>
            <th className="text-left">ID</th>
            <th className="text-left">Name</th>
            <th className="text-left">Roll</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>
                <input
                  type="checkbox"
                  checked={picked.has(s.id)}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(s.id);
                    else next.delete(s.id);
                    setPicked(next);
                  }}
                />
              </td>
              <td>{s.admissionNo}</td>
              <td>{s.name}</td>
              <td>{s.rollNo ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        size="sm"
        onClick={async () => {
          const res = await fetch("/api/v1/promotions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              fromSectionId: fromSection,
              toSectionId: toSection,
              toSessionId,
              studentIds: [...picked],
            }),
          });
          const payload = await res.json().catch(() => ({}));
          onMessage(
            res.ok
              ? `Promoted ${payload.promoted ?? 0}`
              : payload.message ?? payload.error ?? "Promote failed",
          );
        }}
      >
        Promote selected
      </Button>
    </section>
  );
}

function WorkingDaysPanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [days, setDays] = useState<Working[]>([]);

  async function reload(nextMonth = month) {
    const [y, m] = nextMonth.split("-").map(Number);
    const from = `${nextMonth}-01`;
    const last = new Date(y, m, 0).getDate();
    const to = `${nextMonth}-${String(last).padStart(2, "0")}`;
    const json = await loadJson<{ data: Working[] }>(
      `/api/v1/working-days?from=${from}&to=${to}`,
    );
    setDays(json.data ?? []);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const byDate = useMemo(() => {
    const map = new Map<string, Working>();
    for (const d of days) {
      map.set(String(d.date).slice(0, 10), d);
    }
    return map;
  }, [days]);

  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return Array.from({ length: last }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, "0")}`;
      return { date, day: i + 1, weekday: new Date(`${date}T00:00:00`).getDay() };
    });
  }, [month]);

  return (
    <section className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="month">Month</Label>
          <Input
            id="month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <p className="text-sm text-[var(--muted)]">Click a date to toggle holiday.</p>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-sm">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[11px] uppercase text-[var(--muted)]">
            {d}
          </div>
        ))}
        {cells[0] ? Array.from({ length: cells[0].weekday }).map((_, i) => <div key={`pad-${i}`} />) : null}
        {cells.map((c) => {
          const row = byDate.get(c.date);
          const holiday = row ? !row.isWorking : false;
          return (
            <button
              key={c.date}
              type="button"
              className={`rounded-md border px-2 py-3 ${
                holiday
                  ? "border-[var(--stamp)] bg-[var(--stamp)]/10"
                  : "border-[var(--rule)]"
              }`}
              onClick={async () => {
                const res = await fetch("/api/v1/working-days", {
                  method: "PUT",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    date: c.date,
                    isWorking: holiday,
                    note: holiday ? null : "Holiday",
                  }),
                });
                onMessage(res.ok ? (holiday ? "Marked working" : "Marked holiday") : "Failed");
                reload();
              }}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </section>
  );
}
