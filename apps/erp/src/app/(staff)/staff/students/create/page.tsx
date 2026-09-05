"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Option = { id: string; name: string };

export default function CreateStudentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<(Option & { sections: Option[] })[]>([]);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [classId, setClassId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/classes").then((r) => r.json()),
      fetch("/api/v1/sessions").then((r) => r.json()),
    ]).then(([c, s]) => {
      setClasses(c.data ?? []);
      setSessions(s.data ?? []);
    });
  }, []);

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      admissionNo: form.get("admissionNo"),
      firstName: form.get("firstName"),
      lastName: form.get("lastName") || undefined,
      gender: form.get("gender") || undefined,
      dob: form.get("dob") || undefined,
      mobile: form.get("mobile") || undefined,
      fatherName: form.get("fatherName") || undefined,
      classId: form.get("classId") || undefined,
      sectionId: form.get("sectionId") || undefined,
      sessionId: form.get("sessionId") || undefined,
      rollNo: form.get("rollNo") || undefined,
    };
    const res = await fetch("/api/v1/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? json.error ?? "Could not create student");
      return;
    }
    router.replace(`/staff/students/${json.id}`);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl">Admit student</h1>
      <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="admissionNo">Student ID</Label>
          <Input id="admissionNo" name="admissionNo" required />
        </div>
        <div>
          <Label htmlFor="rollNo">Roll no</Label>
          <Input id="rollNo" name="rollNo" />
        </div>
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            name="gender"
            className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          >
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" name="dob" type="date" />
        </div>
        <div>
          <Label htmlFor="mobile">Mobile</Label>
          <Input id="mobile" name="mobile" />
        </div>
        <div>
          <Label htmlFor="fatherName">Father / spouse</Label>
          <Input id="fatherName" name="fatherName" />
        </div>
        <div>
          <Label htmlFor="sessionId">Session</Label>
          <select
            id="sessionId"
            name="sessionId"
            className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          >
            <option value="">—</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="classId">Class</Label>
          <select
            id="classId"
            name="classId"
            className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
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
          <select
            id="sectionId"
            name="sectionId"
            className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          >
            <option value="">—</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {error ? (
          <p className="sm:col-span-2 text-sm text-[var(--stamp)]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Create student"}
          </Button>
        </div>
      </form>
    </div>
  );
}
