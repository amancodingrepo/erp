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
  | "workingDays"
  | "classTeachers";

const TABS: { id: AcademicsTab; href: string; label: string }[] = [
  { id: "sessions", href: "/staff/sessions", label: "Sessions" },
  { id: "department", href: "/staff/department", label: "Department" },
  { id: "programs", href: "/staff/course-master", label: "Program" },
  { id: "classes", href: "/staff/classes", label: "Class" },
  { id: "sections", href: "/staff/sections", label: "Sections" },
  {
    id: "classTeachers",
    href: "/staff/teacher/assign-class-teacher",
    label: "Class teachers",
  },
  { id: "subjects", href: "/staff/subject", label: "Subjects" },
  { id: "timetable", href: "/staff/timetable/classreport", label: "Timetable" },
  { id: "promotion", href: "/staff/stdtransfer", label: "Promote" },
  { id: "workingDays", href: "/staff/holiday/set-working-days", label: "Working days" },
];

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Session = {
  id: string;
  name: string;
  isCurrent: boolean;
  code?: string | null;
  receiptPrefix?: string;
  invoicePrefix?: string;
  admissionPrefix?: string;
  firstAdmissionNo?: number;
};
type Department = { id: string; name: string; code?: string | null };
type Program = { id: string; name: string; departmentId: string };
type Klass = {
  id: string;
  name: string;
  programId: string;
  yearNo?: number | null;
  sequenceNo?: number;
  isActive?: boolean;
  sendAbsentSms?: boolean;
  virtualClassroom?: boolean;
  resultDates?: Array<{ name: string; date: string }>;
  openingDates?: Array<{ name: string; date: string }>;
  sections: {
    id: string;
    name: string;
    classTeacher?: { staffId: string; name: string } | null;
  }[];
};
type Subject = {
  id: string;
  name: string;
  code?: string | null;
  kind?: string;
  categoryId?: string;
  typeId?: string;
  parentSubjectId?: string;
  isSubSubject?: boolean;
  parentName?: string;
};
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
type ClassMarkPaper = {
  examSubjectId: string;
  exam: string;
  subject: string;
  maxMarks: number | string;
};
type ClassMarkStudent = {
  id: string;
  admissionNo: string;
  name: string;
  marks: Array<{
    examSubjectId: string;
    marks: number | string | null;
    isAbsent: boolean;
  }>;
};
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
      {tab === "classTeachers" ? (
        <ClassTeachersPanel onMessage={setMessage} />
      ) : null}
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
      "/api/v1/academic-years",
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
          const res = await fetch("/api/v1/academic-years", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              code: form.get("code"),
              sequenceNo: Number(form.get("sequenceNo") || 0),
              startDate: form.get("startDate") || undefined,
              endDate: form.get("endDate") || undefined,
              receiptPrefix: form.get("receiptPrefix") || undefined,
              invoicePrefix: form.get("invoicePrefix") || undefined,
              admissionPrefix: form.get("admissionPrefix") || undefined,
              firstAdmissionNo: form.get("firstAdmissionNo")
                ? Number(form.get("firstAdmissionNo"))
                : undefined,
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
        <div>
          <Label htmlFor="receiptPrefix">Fee receipt prefix</Label>
          <Input id="receiptPrefix" name="receiptPrefix" placeholder="RCP" />
        </div>
        <div>
          <Label htmlFor="invoicePrefix">Invoice prefix</Label>
          <Input id="invoicePrefix" name="invoicePrefix" placeholder="INV" />
        </div>
        <div>
          <Label htmlFor="admissionPrefix">Admission form prefix</Label>
          <Input id="admissionPrefix" name="admissionPrefix" placeholder="APP" />
        </div>
        <div>
          <Label htmlFor="firstAdmissionNo">First admission number</Label>
          <Input
            id="firstAdmissionNo"
            name="firstAdmissionNo"
            type="number"
            min={1}
            defaultValue={1}
          />
        </div>
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      <ul className="space-y-2 text-sm">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3">
            <span>
              {s.name} {s.id === currentSessionId || s.isCurrent ? "· current" : ""}
              {s.receiptPrefix ? ` · RCP ${s.receiptPrefix}` : ""}
              {s.invoicePrefix ? ` · INV ${s.invoicePrefix}` : ""}
              {s.admissionPrefix
                ? ` · ADM ${s.admissionPrefix}-${s.firstAdmissionNo ?? 1}`
                : ""}
            </span>
            {s.id !== currentSessionId ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await fetch(`/api/v1/academic-years/${s.id}/set-current`, { method: "POST" });
                  onMessage("Session activated");
                  reload();
                }}
              >
                Activate
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/academic-years/${s.id}`, {
                  method: "DELETE",
                });
                onMessage(res.ok ? "Session removed" : "Could not remove");
                reload();
              }}
            >
              Remove
            </Button>
            {s.receiptPrefix || s.invoicePrefix || s.admissionPrefix ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const res = await fetch(`/api/v1/session-prefixes/${s.id}`, {
                    method: "DELETE",
                  });
                  onMessage(res.ok ? "Prefixes removed" : "Could not remove prefixes");
                  reload();
                }}
              >
                Clear prefixes
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <form
        className="space-y-3 border border-[var(--rule)] p-4 lg:col-span-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch("/api/v1/session-prefixes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              sessionId: form.get("sessionId"),
              receiptPrefix: form.get("receiptPrefix") || undefined,
              invoicePrefix: form.get("invoicePrefix") || undefined,
              admissionPrefix: form.get("admissionPrefix") || undefined,
              firstAdmissionNo: form.get("firstAdmissionNo")
                ? Number(form.get("firstAdmissionNo"))
                : undefined,
            }),
          });
          onMessage(res.ok ? "Prefixes saved" : "Could not save prefixes");
          reload();
        }}
      >
        <h2 className="font-display text-2xl">Year prefixes</h2>
        <select name="sessionId" className={SELECT} required defaultValue="">
          <option value="" disabled>
            Session
          </option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input name="receiptPrefix" placeholder="Fee receipt prefix" />
        <Input name="invoicePrefix" placeholder="Invoice prefix" />
        <Input name="admissionPrefix" placeholder="Admission form prefix" />
        <Input name="firstAdmissionNo" type="number" min={1} placeholder="First admission no" />
        <Button type="submit" size="sm">
          Save prefixes
        </Button>
      </form>
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
          <li key={d.id} className="flex flex-wrap items-center gap-3">
            <span>
              {d.name} {d.code ? `(${d.code})` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/departments/${d.id}`, {
                  method: "DELETE",
                });
                onMessage(res.ok ? "Department removed" : "Could not remove");
                reload();
              }}
            >
              Remove
            </Button>
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
          <li key={p.id} className="flex items-center gap-3">
            {p.name}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/programs/${p.id}`, { method: "DELETE" });
                onMessage(res.ok ? "Program removed" : "Could not remove program");
                if (res.ok) reload();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClassesPanel({ onMessage }: { onMessage: (m: string | null) => void }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [roster, setRoster] = useState<StudentRow[]>([]);
  const [markDesk, setMarkDesk] = useState<{
    papers: ClassMarkPaper[];
    students: ClassMarkStudent[];
  } | null>(null);
  async function reload() {
    const [p, c, t, st] = await Promise.all([
      loadJson<{ data: Program[] }>("/api/v1/programs"),
      loadJson<{ data: Klass[]; sessionId: string | null }>("/api/v1/classes"),
      loadJson<{ data: Array<{ id: string; name: string }> }>("/api/v1/report-templates"),
      loadJson<{ data: StaffRow[] }>("/api/v1/staff"),
    ]);
    setPrograms(p.data ?? []);
    setClasses(c.data ?? []);
    setSessionId(c.sessionId ?? null);
    setTemplates(t.data ?? []);
    setStaff(st.data ?? []);
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
              sequenceNo: form.get("sequenceNo")
                ? Number(form.get("sequenceNo"))
                : undefined,
              sectionNames: String(form.get("sections") || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              sendAbsentSms: form.get("sendAbsentSms") === "on",
              virtualClassroom: form.get("virtualClassroom") === "on",
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
        <Input name="sequenceNo" type="number" placeholder="Order" />
        <Input name="sections" placeholder="A, B" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sendAbsentSms" /> Send absent SMS
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="virtualClassroom" /> Enable virtual classroom
        </label>
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const classId = String(form.get("classId") ?? "");
          const kind = String(form.get("kind") ?? "result");
          const path =
            kind === "opening"
              ? `/api/v1/classes/${classId}/opening-dates`
              : `/api/v1/classes/${classId}/result-dates`;
          const res = await fetch(path, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              date: form.get("date"),
            }),
          });
          onMessage(res.ok ? "Date saved" : "Need a class, name, and ISO date");
          if (res.ok) {
            e.currentTarget.reset();
            reload();
          }
        }}
      >
        <h2 className="font-display text-2xl">Result and opening dates</h2>
        <select name="classId" required className={SELECT}>
          <option value="">Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="kind" className={SELECT} defaultValue="result">
          <option value="result">Result date</option>
          <option value="opening">School opening date</option>
        </select>
        <Input name="name" placeholder="Name (Term 1, Session start…)" required />
        <Input name="date" type="date" required />
        <Button type="submit" size="sm">
          Save date
        </Button>
      </form>
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const classId = String(form.get("classId") ?? "");
          const res = await fetch(`/api/v1/classes/${classId}/report-template`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ template_id: form.get("templateId") }),
          });
          onMessage(res.ok ? "Report template assigned" : "Need a class and a live template");
          if (res.ok) reload();
        }}
      >
        <h2 className="font-display text-2xl">Report template</h2>
        <select name="classId" required className={SELECT}>
          <option value="">Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="templateId" required className={SELECT}>
          <option value="">Marksheet</option>
          {templates.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Assign to class
        </Button>
      </form>
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const classId = String(form.get("classId") ?? "");
          const res = await fetch(`/api/v1/classes/${classId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name") || undefined,
              yearNo: form.get("yearNo") ? Number(form.get("yearNo")) : undefined,
              programId: form.get("programId") || undefined,
            }),
          });
          onMessage(res.ok ? "Class updated" : "Could not update class");
          if (res.ok) reload();
        }}
      >
        <h2 className="font-display text-2xl">Edit class</h2>
        <select name="classId" required className={SELECT}>
          <option value="">Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="programId" className={SELECT}>
          <option value="">Keep program</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Input name="name" placeholder="Name" />
        <Input name="yearNo" type="number" placeholder="Year" />
        <Button type="submit" size="sm">
          Save class
        </Button>
      </form>
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const classId = String(form.get("classId") ?? "");
          const res = await fetch(`/api/v1/classes/${classId}/teachers`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ staffId: form.get("staffId") || null }),
          });
          onMessage(res.ok ? "Class teachers saved" : "Could not save teachers");
          if (res.ok) reload();
        }}
      >
        <h2 className="font-display text-2xl">Class teachers</h2>
        <select name="classId" required className={SELECT}>
          <option value="">Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="staffId" className={SELECT}>
          <option value="">Clear</option>
          {staff.map((row) => (
            <option key={row.id} value={row.id}>
              {[row.firstName, row.lastName].filter(Boolean).join(" ")}
              {row.employeeId ? ` · ${row.employeeId}` : ""}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Assign to sections
        </Button>
      </form>
      <form
        className="space-y-3 border border-[var(--rule)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const classId = String(form.get("classId") ?? "");
          const json = await loadJson<{ data: StudentRow[] }>(
            `/api/v1/classes/${classId}/students`,
          );
          setRoster(json.data ?? []);
          onMessage(`${(json.data ?? []).length} students`);
        }}
      >
        <h2 className="font-display text-2xl">Class roster</h2>
        <select name="classId" required className={SELECT}>
          <option value="">Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Load students
        </Button>
        <ul className="text-sm">
          {roster.map((row) => (
            <li key={row.id}>
              {row.admissionNo} · {row.name}
              {row.rollNo ? ` · roll ${row.rollNo}` : ""}
            </li>
          ))}
        </ul>
      </form>
      <form
        className="space-y-3 border border-[var(--rule)] p-4 lg:col-span-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const classId = String(form.get("classId") ?? "");
          const entries: Array<{
            examSubjectId: string;
            studentId: string;
            marks: string | null;
            isAbsent: boolean;
          }> = [];
          for (const [key, value] of form.entries()) {
            if (!key.startsWith("mark:")) continue;
            const parts = key.split(":");
            const studentId = parts[1] ?? "";
            const examSubjectId = parts[2] ?? "";
            const isAbsent = form.get(`absent:${studentId}:${examSubjectId}`) === "on";
            const marks = String(value ?? "").trim();
            if (!studentId || !examSubjectId || (!marks && !isAbsent)) continue;
            entries.push({
              examSubjectId,
              studentId,
              marks: isAbsent ? null : marks,
              isAbsent,
            });
          }
          const res = await fetch(`/api/v1/classes/${classId}/marks`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entries }),
          });
          onMessage(res.ok ? "Marks saved" : "Could not save marks");
        }}
      >
        <h2 className="font-display text-2xl">Class marks</h2>
        <select name="classId" required className={SELECT}>
          <option value="">Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          onClick={async (e) => {
            const form = e.currentTarget.form;
            if (!form) return;
            const classId = String(new FormData(form).get("classId") ?? "");
            const res = await fetch(`/api/v1/classes/${classId}/marks`);
            const json = (await res.json()) as {
              papers?: ClassMarkPaper[];
              students?: ClassMarkStudent[];
              message?: string;
              fields?: { classId?: string };
            };
            if (!res.ok) {
              setMarkDesk(null);
              onMessage(
                json.fields?.classId ??
                  json.message ??
                  "Assign a report template first",
              );
              return;
            }
            setMarkDesk({
              papers: json.papers ?? [],
              students: json.students ?? [],
            });
            onMessage(
              `${(json.students ?? []).length} students · ${(json.papers ?? []).length} papers`,
            );
          }}
        >
          Load marks
        </Button>
        {markDesk ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-1">Student</th>
                  {markDesk.papers.map((paper) => (
                    <th key={paper.examSubjectId} className="p-1">
                      {paper.exam} · {paper.subject}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {markDesk.students.map((row) => (
                  <tr key={row.id}>
                    <td className="p-1">
                      {row.admissionNo} · {row.name}
                    </td>
                    {markDesk.papers.map((paper) => {
                      const cell = row.marks.find(
                        (m) => m.examSubjectId === paper.examSubjectId,
                      );
                      return (
                        <td key={paper.examSubjectId} className="p-1">
                          <Input
                            name={`mark:${row.id}:${paper.examSubjectId}`}
                            defaultValue={
                              cell?.marks == null ? "" : String(cell.marks)
                            }
                            className="h-8 w-20"
                          />
                          <label className="ml-1 text-xs">
                            <input
                              type="checkbox"
                              name={`absent:${row.id}:${paper.examSubjectId}`}
                              defaultChecked={cell?.isAbsent === true}
                            />{" "}
                            AB
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <Button type="submit" size="sm" className="mt-2">
              Save marks
            </Button>
          </div>
        ) : null}
      </form>
      <ul className="text-sm lg:col-span-2">
        {classes.map((c, index) => (
          <li key={c.id}>
            {c.name}
            {typeof c.sequenceNo === "number" ? ` · #${c.sequenceNo}` : ""} —{" "}
            {c.sections
              .map(
                (s) =>
                  `${s.name}${s.classTeacher?.name ? ` (${s.classTeacher.name})` : ""}`,
              )
              .join(", ")}
            {c.sendAbsentSms ? " · absent SMS" : ""}
            {c.virtualClassroom ? " · virtual class" : ""}
            {c.isActive === false ? " · inactive" : ""}
            {c.resultDates?.length
              ? ` · result ${c.resultDates.map((row) => `${row.name} ${row.date}`).join(", ")}`
              : ""}
            {c.openingDates?.length
              ? ` · open ${c.openingDates.map((row) => `${row.name} ${row.date}`).join(", ")}`
              : ""}
            <button
              className="ml-2 underline"
              type="button"
              onClick={async () => {
                await fetch("/api/v1/class-flags", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    classId: c.id,
                    sendAbsentSms: !c.sendAbsentSms,
                    virtualClassroom: c.virtualClassroom,
                  }),
                });
                reload();
              }}
            >
              toggle absent SMS
            </button>
            {c.sendAbsentSms || c.virtualClassroom ? (
              <button
                className="ml-2 underline"
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/v1/class-flags/${c.id}`, {
                    method: "DELETE",
                  });
                  onMessage(res.ok ? "Flags cleared" : "Could not clear flags");
                  reload();
                }}
              >
                clear flags
              </button>
            ) : null}
            <button
              className="ml-2 underline"
              type="button"
              disabled={index === 0}
              onClick={async () => {
                const ids = classes.map((row) => row.id);
                [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                const res = await fetch("/api/v1/classes/reorder", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ classIds: ids }),
                });
                onMessage(res.ok ? "Order saved" : "Reorder failed");
                reload();
              }}
            >
              up
            </button>
            <button
              className="ml-2 underline"
              type="button"
              disabled={index === classes.length - 1}
              onClick={async () => {
                const ids = classes.map((row) => row.id);
                [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
                const res = await fetch("/api/v1/classes/reorder", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ classIds: ids }),
                });
                onMessage(res.ok ? "Order saved" : "Reorder failed");
                reload();
              }}
            >
              down
            </button>
            <button
              className="ml-2 underline"
              type="button"
              onClick={async () => {
                const res = await fetch(`/api/v1/classes/${c.id}`, {
                  method: "DELETE",
                });
                onMessage(
                  res.ok
                    ? "Class deactivated"
                    : "Move students before deleting this class",
                );
                reload();
              }}
            >
              delete
            </button>
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

function ClassTeachersPanel({
  onMessage,
}: {
  onMessage: (m: string | null) => void;
}) {
  const [rows, setRows] = useState<
    Array<{
      classId: string;
      className: string;
      sectionId: string;
      sectionName: string;
      staffId: string | null;
      staffName: string | null;
    }>
  >([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);

  async function reload() {
    const json = await loadJson<{
      data: typeof rows;
      staff: StaffRow[];
    }>("/api/v1/class-teachers");
    setRows(json.data ?? []);
    setStaff(json.staff ?? []);
  }
  useEffect(() => {
    reload();
  }, []);

  return (
    <section className="space-y-3 border border-[var(--rule)] p-4">
      <h2 className="font-display text-2xl">Class teachers</h2>
      <p className="text-sm text-[var(--muted)]">
        One teacher per live section. Names come from campus staff.
      </p>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li
            key={row.sectionId}
            className="flex flex-wrap items-center gap-3 border-b border-[var(--rule)] py-2"
          >
            <span className="min-w-40 font-medium">
              {row.className} · {row.sectionName}
            </span>
            <select
              className={SELECT}
              style={{ maxWidth: 280 }}
              value={row.staffId ?? ""}
              onChange={async (e) => {
                const staffId = e.target.value || null;
                const res = await fetch("/api/v1/class-teachers", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    sectionId: row.sectionId,
                    staffId,
                  }),
                });
                onMessage(res.ok ? "Class teacher saved" : "Could not save");
                if (res.ok) {
                  const json = await res.json();
                  setRows(json.data ?? []);
                  setStaff(json.staff ?? staff);
                }
              }}
            >
              <option value="">—</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {[person.firstName, person.lastName].filter(Boolean).join(" ")}
                  {person.employeeId ? ` · ${person.employeeId}` : ""}
                </option>
              ))}
            </select>
            {row.staffId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const res = await fetch(`/api/v1/class-teachers/${row.sectionId}`, {
                    method: "DELETE",
                  });
                  onMessage(res.ok ? "Class teacher removed" : "Could not remove");
                  reload();
                }}
              >
                Remove
              </Button>
            ) : null}
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
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [types, setTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function reload() {
    const [sub, c, st, cat, typ] = await Promise.all([
      loadJson<{ data: Subject[] }>("/api/v1/subjects"),
      loadJson<{ data: Klass[]; sessionId: string | null }>("/api/v1/classes"),
      loadJson<{ data: StaffRow[] }>("/api/v1/staff"),
      loadJson<{ data: Array<{ id: string; name: string }> }>("/api/v1/subject-categories"),
      loadJson<{ data: Array<{ id: string; name: string }> }>("/api/v1/subject-types"),
    ]);
    setSubjects(sub.data ?? []);
    setClasses(c.data ?? []);
    setStaff(st.data ?? []);
    setCategories(cat.data ?? []);
    setTypes(typ.data ?? []);
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
              categoryId: form.get("categoryId") || undefined,
              typeId: form.get("typeId") || undefined,
              parentSubjectId: form.get("parentSubjectId") || undefined,
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
        <select name="categoryId" className={SELECT} defaultValue="">
          <option value="">Category</option>
          {categories.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select name="typeId" className={SELECT} defaultValue="">
          <option value="">Type</option>
          {types.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select name="parentSubjectId" className={SELECT} defaultValue="">
          <option value="">Main subject (optional)</option>
          {subjects
            .filter((row) => !row.parentSubjectId)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
        </select>
        <Button type="submit" size="sm">
          Add
        </Button>
        <ul className="text-sm">
          {subjects.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3">
              <span>
                {s.name} {s.code ? `(${s.code})` : ""}
                {s.parentName ? ` · ${s.parentName}` : ""}
                {s.categoryId
                  ? ` · ${categories.find((row) => row.id === s.categoryId)?.name ?? ""}`
                  : ""}
                {s.typeId ? ` · ${types.find((row) => row.id === s.typeId)?.name ?? ""}` : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const res = await fetch(`/api/v1/subjects/${s.id}`, { method: "DELETE" });
                  onMessage(res.ok ? "Subject removed" : "Could not remove");
                  reload();
                }}
              >
                Remove
              </Button>
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
              {s.parentName ? `${s.parentName} - ${s.name}` : s.name}
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
      <form
        className="space-y-3 border border-[var(--rule)] p-4 lg:col-span-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const res = await fetch(`/api/v1/classes/${classId}/subjects`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ subjectIds: form.getAll("subjectIds") }),
          });
          onMessage(res.ok ? "Class subjects saved" : "Could not save subjects");
          if (res.ok) {
            const json = await loadJson<{ data: Offering[] }>(
              `/api/v1/classes/${classId}/subjects`,
            );
            setOfferings(json.data ?? []);
          }
        }}
      >
        <h2 className="font-display text-2xl">Class subjects</h2>
        <p className="text-sm text-[var(--muted)]">
          Replaces every offering on the selected class for the current session.
        </p>
        <select name="subjectIds" multiple className={SELECT} size={6}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.parentName ? `${s.parentName} - ${s.name}` : s.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Replace class subjects
        </Button>
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
      <ul className="text-sm">
        {periods.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {row.name} · {row.startTime}–{row.endTime}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/periods/${row.id}`, {
                  method: "DELETE",
                });
                onMessage(res.ok ? "Period removed" : "Could not remove period");
                if (res.ok) reloadMasters();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
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
  const [procedure, setProcedure] = useState<"promote" | "change" | "alumni">(
    "promote",
  );
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
      <div>
        <Label>Procedure</Label>
        <select
          className={SELECT}
          value={procedure}
          onChange={(e) =>
            setProcedure(e.target.value as "promote" | "change" | "alumni")
          }
        >
          <option value="promote">Promote</option>
          <option value="change">Change class</option>
          <option value="alumni">Alumni</option>
        </select>
      </div>
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
        {procedure === "alumni" ? null : (
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
        )}
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
          const kind =
            procedure === "change"
              ? "change-class"
              : procedure === "alumni"
                ? "alumni"
                : "promote";
          const res = await fetch(`/api/v1/year-end/${kind}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              from_class_id: fromSection,
              to_class_id: procedure === "alumni" ? undefined : toSection,
              academic_year_id:
                procedure === "alumni" ? undefined : toSessionId,
              student_ids: [...picked],
            }),
          });
          const payload = await res.json().catch(() => ({}));
          onMessage(
            res.ok
              ? procedure === "alumni"
                ? `Alumni ${payload.promoted ?? 0}`
                : procedure === "change"
                  ? `Changed class ${payload.promoted ?? 0}`
                  : `Promoted ${payload.promoted ?? 0}`
              : payload.message ?? payload.error ?? "Promote failed",
          );
        }}
      >
        {procedure === "alumni"
          ? "Mark alumni"
          : procedure === "change"
            ? "Change class"
            : "Promote selected"}
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
