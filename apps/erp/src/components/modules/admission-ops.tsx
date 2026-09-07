"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode = "inbox" | "settings";
type Row = {
  id: string;
  applicationNo: string;
  name: string;
  fatherName: string | null;
  mobile: string | null;
  program: string | null;
  paymentStatus: string;
  status: string;
  feeAmount: string;
  enrolled: boolean;
  admissionNo: string | null;
};
type Klass = { id: string; name: string; sections: { id: string; name: string }[] };

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function AdmissionOps({ mode }: { mode: Mode }) {
  if (mode === "settings") return <SettingsPanel />;
  return <InboxPanel />;
}

function SettingsPanel() {
  const [fee, setFee] = useState("500");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/admission/settings")
      .then((r) => r.json())
      .then((j) => setFee(j.applicationFee ?? "500"));
  }, []);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/v1/admission/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicationFee: fee }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Online admission settings</h1>
      <p className="text-sm text-[var(--muted)]">
        Application fee is collected at the counter in Phase B-1. Razorpay is the
        next Phase B item.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="applicationFee">Application fee (INR)</Label>
          <Input
            id="applicationFee"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}

function InboxPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [q, setQ] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load(query = q) {
    const res = await fetch(
      `/api/v1/applications?q=${encodeURIComponent(query)}`,
    );
    const json = await res.json();
    setRows(json.data ?? []);
  }

  useEffect(() => {
    load();
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markPaid(id: string) {
    const res = await fetch(`/api/v1/applications/${id}/pay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "CASH" }),
    });
    setMessage(res.ok ? "Fee marked paid" : "Could not record payment");
    load();
  }

  async function enroll(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/v1/applications/${id}/enroll`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classId: form.get("classId"),
        sectionId: form.get("sectionId"),
        admissionNo: form.get("admissionNo") || undefined,
      }),
    });
    const json = await res.json();
    setMessage(
      res.ok ? `Enrolled ${json.admissionNo}` : json.message ?? json.error,
    );
    load();
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Online applications</h1>
      <form
        className="mt-4 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, mobile, or application no"
        />
        <Button type="submit">Find</Button>
      </form>
      <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
      <div className="mt-4 overflow-x-auto border border-[var(--rule)]">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-[var(--ink)] text-[var(--paper)]">
            <tr>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Program</th>
              <th className="px-3 py-2">Fee</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="odd:bg-[var(--paper-2)] align-top">
                <td className="px-3 py-2">{row.applicationNo}</td>
                <td className="px-3 py-2">
                  {row.name}
                  <div className="text-[var(--muted)]">{row.mobile}</div>
                </td>
                <td className="px-3 py-2">{row.program ?? "—"}</td>
                <td className="px-3 py-2">
                  {row.paymentStatus} · ₹{row.feeAmount}
                </td>
                <td className="px-3 py-2">
                  {row.enrolled ? `Enrolled ${row.admissionNo}` : row.status}
                </td>
                <td className="px-3 py-2">
                  {row.enrolled ? null : row.paymentStatus !== "PAID" ? (
                    <Button size="sm" onClick={() => markPaid(row.id)}>
                      Mark fee paid
                    </Button>
                  ) : (
                    <EnrollForm classes={classes} onSubmit={(e) => enroll(e, row.id)} />
                  )}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-3 py-8 text-center text-[var(--muted)]" colSpan={6}>
                  No applications yet. Public form is /apply.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EnrollForm({
  classes,
  onSubmit,
}: {
  classes: Klass[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const sections = classes.find((c) => c.id === classId)?.sections ?? [];
  return (
    <form className="flex flex-wrap gap-2" onSubmit={onSubmit}>
      <select
        name="classId"
        className={SELECT}
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        required
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="sectionId" className={SELECT} required>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Input name="admissionNo" placeholder="Admission no (optional)" />
      <Button size="sm" type="submit">
        Enroll
      </Button>
    </form>
  );
}
