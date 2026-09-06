"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Klass = { id: string; name: string; sections: { id: string; name: string }[] };
type StudentRow = {
  id: string;
  admissionNo: string;
  name: string;
  class: string | null;
  section: string | null;
  fatherName: string | null;
  dob: string | null;
  mobile: string | null;
  enrollmentId: string | null;
};
type Line = {
  id: string;
  description: string;
  amount: string | number;
  paid: string | number;
  discount: string | number;
  fine: string | number;
  dueDate?: string | null;
};
type Invoice = {
  id: string;
  status: string;
  total: string | number;
  paid: string | number;
  lines: Line[];
  master?: { group?: { name: string } };
};

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

function n(value: string | number) {
  return Number(value);
}

export default function CollectFeesPage() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [lineId, setLineId] = useState("");

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  useEffect(() => {
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []));
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ pageSize: "50" });
    if (q) params.set("q", q);
    if (classId) params.set("classId", classId);
    if (sectionId) params.set("sectionId", sectionId);
    const res = await fetch(`/api/v1/students?${params}`);
    const json = await res.json();
    setRows(json.data ?? []);
    setSelected(null);
    setInvoices([]);
  }

  async function openCollect(row: StudentRow) {
    setSelected(row);
    const params = new URLSearchParams();
    if (row.enrollmentId) params.set("enrollmentId", row.enrollmentId);
    else params.set("studentId", row.id);
    const res = await fetch(`/api/v1/fees/invoices?${params}`);
    const json = await res.json();
    setInvoices(json.data ?? []);
    setLineId("");
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected?.enrollmentId || !invoices[0]) {
      setMessage("No enrollment or invoice for this student");
      return;
    }
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/fees/payments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        enrollmentId: selected.enrollmentId,
        invoiceId: invoices[0].id,
        lineId: lineId || undefined,
        amount: Number(form.get("amount")),
        discount: form.get("discount") ? Number(form.get("discount")) : 0,
        fine: form.get("fine") ? Number(form.get("fine")) : undefined,
        method: form.get("method"),
        note: form.get("note") || undefined,
        paidAt: form.get("date") || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message ?? json.error ?? "Payment failed");
      return;
    }
    setMessage(`Receipt ${json.receiptNo}`);
    openCollect(selected);
  }

  const invoice = invoices[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Collect fees</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
      </div>
      <form className="grid gap-3 sm:grid-cols-4" onSubmit={search}>
        <div>
          <Label htmlFor="classId">Class</Label>
          <select
            id="classId"
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
          <Label htmlFor="sectionId">Section</Label>
          <select
            id="sectionId"
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
          <Label htmlFor="q">Keyword</Label>
          <Input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name / student ID"
          />
        </div>
        <Button className="self-end" type="submit">
          Search
        </Button>
      </form>
      <div className="overflow-x-auto border border-[var(--rule)]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-[var(--ink)] text-[var(--paper)]">
            <tr>
              {["Class", "Section", "Student ID", "Name", "Father/Spouse", "DOB", "Phone", "Action"].map(
                (h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="odd:bg-[var(--paper-2)]">
                <td className="px-3 py-2">{row.class ?? "—"}</td>
                <td className="px-3 py-2">{row.section ?? "—"}</td>
                <td className="px-3 py-2">{row.admissionNo}</td>
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">{row.fatherName ?? "—"}</td>
                <td className="px-3 py-2">{row.dob ? String(row.dob).slice(0, 10) : "—"}</td>
                <td className="px-3 py-2">{row.mobile ?? "—"}</td>
                <td className="px-3 py-2">
                  <Button size="sm" type="button" onClick={() => openCollect(row)}>
                    Collect
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && invoice ? (
        <div className="space-y-4 border border-[var(--rule)] p-4">
          <p className="font-medium">
            {selected.name} · {invoice.master?.group?.name ?? "Invoice"} · {invoice.status}
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {["Fees", "Due", "Amount", "Discount", "Fine", "Paid", "Balance"].map((h) => (
                  <th key={h} className="py-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => {
                const balance =
                  n(line.amount) + n(line.fine) - n(line.discount) - n(line.paid);
                return (
                  <tr key={line.id}>
                    <td className="py-1">{line.description}</td>
                    <td>{line.dueDate ? String(line.dueDate).slice(0, 10) : "—"}</td>
                    <td>{n(line.amount)}</td>
                    <td>{n(line.discount)}</td>
                    <td>{n(line.fine)}</td>
                    <td>{n(line.paid)}</td>
                    <td>{balance}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={pay}>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" />
            </div>
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" name="amount" type="number" min="1" step="0.01" required />
            </div>
            <div>
              <Label htmlFor="discount">Discount (₹)</Label>
              <Input id="discount" name="discount" type="number" min="0" step="0.01" />
            </div>
            <div>
              <Label htmlFor="fine">Fine (₹)</Label>
              <Input id="fine" name="fine" type="number" min="0" step="0.01" />
            </div>
            <div>
              <Label htmlFor="method">Payment mode</Label>
              <select id="method" name="method" className={SELECT} defaultValue="CASH">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DD">DD</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CARD">Card</option>
                <option value="SCHOLARSHIP">Scholarship</option>
              </select>
            </div>
            <div>
              <Label htmlFor="lineId">Line (optional)</Label>
              <select
                id="lineId"
                className={SELECT}
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
              >
                <option value="">FIFO</option>
                {invoice.lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="note">Note</Label>
              <Input id="note" name="note" />
            </div>
            <Button type="submit" variant="brass">
              Save payment
            </Button>
          </form>
        </div>
      ) : selected ? (
        <p className="text-sm text-[var(--muted)]">
          No invoice yet. Assign a fee master to this class first.
        </p>
      ) : null}
    </div>
  );
}
