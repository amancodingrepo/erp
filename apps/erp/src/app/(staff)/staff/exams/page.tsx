"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type SubjectPaper = { id: string; subjectId: string; maxMarks: number | string };
type Exam = { id: string; name: string; subjects: SubjectPaper[] };
type Group = { id: string; name: string; groupKind: string; exams: Exam[] };
type Klass = { id: string; name: string; sections: { id: string; name: string }[] };
type RosterRow = {
  rosterId: string;
  studentId: string;
  admissionNo: string;
  rollNo: string | null;
  name: string;
  marks: number | string | null;
  isAbsent: boolean;
};

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function ExamsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sessions, setSessions] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [groupId, setGroupId] = useState("");
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [examSubjectId, setExamSubjectId] = useState("");
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [g, s, sub, c] = await Promise.all([
      fetch("/api/v1/exam-groups").then((r) => r.json()),
      fetch("/api/v1/sessions").then((r) => r.json()),
      fetch("/api/v1/subjects").then((r) => r.json()),
      fetch("/api/v1/classes").then((r) => r.json()),
    ]);
    setGroups(g.data ?? []);
    setSessions(s.data ?? []);
    setSubjects(sub.data ?? []);
    setClasses(c.data ?? []);
  }

  useEffect(() => {
    reload();
  }, []);

  const group = groups.find((g) => g.id === groupId);
  const exam = group?.exams.find((e) => e.id === examId);
  const sections = classes.find((c) => c.id === classId)?.sections ?? [];
  const papers = exam?.subjects ?? [];
  const paper = papers.find((p) => p.id === examSubjectId);

  const grid = useMemo(() => roster, [roster]);

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/exam-groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        examType: form.get("examType"),
        groupKind: form.get("groupKind"),
        sessionId: form.get("sessionId"),
      }),
    });
    setMessage(res.ok ? "Exam group created" : "Create failed");
    reload();
  }

  async function addExam() {
    if (!groupId) return;
    const name = prompt("Exam name?");
    if (!name) return;
    await fetch(`/api/v1/exam-groups/${groupId}/exams`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    reload();
  }

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!examId) return;
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/v1/exams/${examId}/subjects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subjectId: form.get("subjectId"),
        maxMarks: Number(form.get("maxMarks")),
        minMarks: Number(form.get("minMarks")),
      }),
    });
    const json = await res.json();
    if (res.ok) setExamSubjectId(json.id);
    setMessage(res.ok ? "Subject attached" : "Failed");
    reload();
  }

  async function loadRoster() {
    if (!examSubjectId) return;
    const params = new URLSearchParams();
    if (classId) params.set("classId", classId);
    if (sectionId) params.set("sectionId", sectionId);
    const json = await (
      await fetch(`/api/v1/exams/${examSubjectId}/roster?${params}`)
    ).json();
    setRoster(json.data ?? []);
    setMaxMarks(Number(json.maxMarks ?? paper?.maxMarks ?? 100));
  }

  async function saveMarks() {
    const res = await fetch(`/api/v1/exams/${examSubjectId}/marks`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entries: roster.map((r) => ({
          studentId: r.studentId,
          rosterId: r.rosterId,
          marks: r.isAbsent ? null : r.marks,
          isAbsent: r.isAbsent,
        })),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Draft saved" : json.fields?.marks ?? json.message ?? "Save failed");
  }

  async function finalize() {
    const res = await fetch(`/api/v1/exams/${examSubjectId}/finalize`, { method: "POST" });
    setMessage(res.ok ? "Finalized" : "Finalize denied");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Exams</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
      </div>

      <form onSubmit={createGroup} className="grid gap-3 border border-[var(--rule)] p-4 sm:grid-cols-2">
        <Input name="name" placeholder="Group name" required />
        <select name="sessionId" required className={SELECT}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="examType" className={SELECT} defaultValue="COLLEGE_GRADE">
          <option value="GENERAL_PASS_FAIL">General pass/fail</option>
          <option value="SCHOOL_GRADE">School grade</option>
          <option value="COLLEGE_GRADE">College grade</option>
          <option value="GPA">GPA</option>
          <option value="AVERAGE_PASSING">Average passing</option>
        </select>
        <select name="groupKind" className={SELECT} defaultValue="Regular">
          <option value="Regular">Regular</option>
          <option value="ATKT">ATKT</option>
        </select>
        <Button type="submit">Create group</Button>
      </form>

      <div className="grid gap-3 border border-[var(--rule)] p-4 sm:grid-cols-3">
        <div>
          <Label>Exam group</Label>
          <select
            className={SELECT}
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setExamId("");
              setExamSubjectId("");
              setRoster([]);
            }}
          >
            <option value="">—</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.groupKind})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Exam</Label>
          <select
            className={SELECT}
            value={examId}
            onChange={(e) => {
              setExamId(e.target.value);
              setExamSubjectId("");
              setRoster([]);
            }}
          >
            <option value="">—</option>
            {group?.exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="ghost" onClick={addExam} disabled={!groupId}>
            Add exam
          </Button>
        </div>
        <div>
          <Label>Class</Label>
          <select
            className={SELECT}
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId("");
            }}
          >
            <option value="">All</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Section</Label>
          <select
            className={SELECT}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            <option value="">All</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Subject</Label>
          <select
            className={SELECT}
            value={examSubjectId}
            onChange={(e) => setExamSubjectId(e.target.value)}
          >
            <option value="">—</option>
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {subjects.find((s) => s.id === p.subjectId)?.name ?? p.subjectId}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={addSubject} className="grid gap-3 border border-[var(--rule)] p-4 sm:grid-cols-4">
        <select name="subjectId" className={SELECT} disabled={!examId}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input name="maxMarks" type="number" defaultValue={100} />
        <Input name="minMarks" type="number" defaultValue={40} />
        <Button type="submit" disabled={!examId}>
          Attach subject
        </Button>
      </form>

      <div className="flex gap-3">
        <Button type="button" onClick={loadRoster} disabled={!examSubjectId}>
          Load roster
        </Button>
        <Button type="button" onClick={saveMarks} disabled={!roster.length}>
          Save draft
        </Button>
        <Button type="button" variant="brass" onClick={finalize} disabled={!examSubjectId}>
          Finalize
        </Button>
      </div>

      {grid.length ? (
        <div className="overflow-x-auto border border-[var(--rule)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--ink)] text-[var(--paper)]">
              <tr>
                {["Student ID", "Roll Number", "Student Name", "Absent", "Marks Obtained", "Max Marks"].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => (
                <tr key={row.studentId} className="odd:bg-[var(--paper-2)]">
                  <td className="px-3 py-2">{row.admissionNo}</td>
                  <td className="px-3 py-2">{row.rollNo ?? "—"}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.isAbsent}
                      onChange={(e) => {
                        const next = [...roster];
                        next[i] = {
                          ...row,
                          isAbsent: e.target.checked,
                          marks: e.target.checked ? null : row.marks,
                        };
                        setRoster(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      className="h-8"
                      disabled={row.isAbsent}
                      value={row.marks ?? ""}
                      onChange={(e) => {
                        const next = [...roster];
                        next[i] = { ...row, marks: e.target.value === "" ? null : Number(e.target.value) };
                        setRoster(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">{maxMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
