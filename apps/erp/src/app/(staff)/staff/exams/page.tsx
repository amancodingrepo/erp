"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Group = {
  id: string;
  name: string;
  exams: Array<{ id: string; name: string }>;
};

export default function ExamsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sessions, setSessions] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [examSubjectId, setExamSubjectId] = useState("");
  const [marks, setMarks] = useState<
    Array<{ studentId: string; marks?: number | null; isAbsent?: boolean }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [g, s, sub] = await Promise.all([
      fetch("/api/v1/exam-groups").then((r) => r.json()),
      fetch("/api/v1/sessions").then((r) => r.json()),
      fetch("/api/v1/subjects").then((r) => r.json()),
    ]);
    setGroups(g.data ?? []);
    setSessions(s.data ?? []);
    setSubjects(sub.data ?? []);
  }

  useEffect(() => {
    reload();
  }, []);

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

  async function addExam(groupId: string, name: string) {
    await fetch(`/api/v1/exam-groups/${groupId}/exams`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    reload();
  }

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/v1/exams/${form.get("examId")}/subjects`, {
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
  }

  async function saveMarks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const studentId = String(form.get("studentId"));
    const value = Number(form.get("marks"));
    const res = await fetch(`/api/v1/exams/${examSubjectId}/marks`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entries: [{ studentId, marks: value, isAbsent: false }],
      }),
    });
    setMessage(res.ok ? "Marks saved" : "Marks failed (finalized?)");
    setMarks((m) => [...m, { studentId, marks: value }]);
  }

  async function finalize() {
    const res = await fetch(`/api/v1/exams/${examSubjectId}/finalize`, {
      method: "POST",
    });
    setMessage(res.ok ? "Finalized" : "Finalize denied");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Exams</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
      </div>
      <form
        onSubmit={createGroup}
        className="grid gap-3 border border-[var(--rule)] p-4 sm:grid-cols-2"
      >
        <Input name="name" placeholder="Group name" required />
        <select
          name="sessionId"
          required
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="examType"
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          defaultValue="COLLEGE_GRADE"
        >
          <option value="GENERAL_PASS_FAIL">General pass/fail</option>
          <option value="SCHOOL_GRADE">School grade</option>
          <option value="COLLEGE_GRADE">College grade</option>
          <option value="GPA">GPA</option>
          <option value="AVERAGE_PASSING">Average passing</option>
        </select>
        <select
          name="groupKind"
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          defaultValue="Regular"
        >
          <option value="Regular">Regular</option>
          <option value="ATKT">ATKT</option>
        </select>
        <Button type="submit">Create group</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {groups.map((g) => (
          <li key={g.id} className="border border-[var(--rule)] p-3">
            <div className="flex items-center justify-between">
              <strong>{g.name}</strong>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const name = prompt("Exam name?");
                  if (name) addExam(g.id, name);
                }}
              >
                Add exam
              </Button>
            </div>
            <p className="text-[var(--muted)]">
              {g.exams.map((e) => `${e.name} (${e.id})`).join(" · ") || "No exams"}
            </p>
          </li>
        ))}
      </ul>
      <form onSubmit={addSubject} className="grid gap-3 border border-[var(--rule)] p-4 sm:grid-cols-2">
        <Label className="sm:col-span-2">Attach subject to exam id</Label>
        <Input name="examId" placeholder="Exam id" required />
        <select
          name="subjectId"
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input name="maxMarks" type="number" defaultValue={100} />
        <Input name="minMarks" type="number" defaultValue={40} />
        <Button type="submit">Attach</Button>
      </form>
      <form onSubmit={saveMarks} className="grid gap-3 border border-[var(--rule)] p-4">
        <p className="text-sm">
          Exam subject: {examSubjectId || "attach a subject first"}
        </p>
        <Input name="studentId" placeholder="Student id" required />
        <Input name="marks" type="number" placeholder="Marks" required />
        <div className="flex gap-3">
          <Button type="submit" disabled={!examSubjectId}>
            Save mark
          </Button>
          <Button
            type="button"
            variant="brass"
            disabled={!examSubjectId}
            onClick={finalize}
          >
            Finalize
          </Button>
        </div>
        <ul className="text-sm">
          {marks.map((m, i) => (
            <li key={i}>
              {m.studentId}: {m.marks}
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
}
