"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type StudentRow = {
  id: string;
  admissionNo: string;
  name: string;
  class: string | null;
  mobile: string | null;
};

type Invoice = {
  id: string;
  total: string | number;
  paid: string | number;
  status: string;
};

export default function CollectFeesPage() {
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [masters, setMasters] = useState<Array<{ id: string; group: { name: string } }>>([]);
  const [sessions, setSessions] = useState<Array<{ id: string; name: string }>>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/fee-masters").then((r) => r.json()),
      fetch("/api/v1/sessions").then((r) => r.json()),
    ]).then(([m, s]) => {
      setMasters(m.data ?? []);
      setSessions(s.data ?? []);
    });
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    const res = await fetch(`/api/v1/students?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setStudents(json.data ?? []);
  }

  async function makeInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/fees/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: selected.id,
        sessionId: form.get("sessionId"),
        masterId: form.get("masterId"),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message ?? "Could not invoice");
      return;
    }
    setInvoice(json);
    setMessage(`Invoice ${json.status} · ₹${json.total}`);
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoice) return;
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/fees/payments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        invoiceId: invoice.id,
        amount: Number(form.get("amount")),
        method: form.get("method"),
        note: form.get("note") || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message ?? json.error ?? "Payment failed");
      return;
    }
    setInvoice(json.invoice);
    setMessage(`Receipt ${json.receiptNo}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Collect fees</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
      </div>
      <form className="flex gap-3" onSubmit={search}>
        <div className="flex-1">
          <Label htmlFor="q">Student</Label>
          <Input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or student ID"
          />
        </div>
        <Button className="self-end" type="submit">
          Search
        </Button>
      </form>
      <ul className="divide-y border border-[var(--rule)]">
        {students.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--paper-2)]"
              onClick={() => setSelected(s)}
            >
              <span>
                {s.admissionNo} · {s.name}
              </span>
              <span className="text-[var(--muted)]">{s.class}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <form
          onSubmit={makeInvoice}
          className="grid gap-3 border border-[var(--rule)] p-4 sm:grid-cols-2"
        >
          <p className="sm:col-span-2 font-medium">
            Invoice for {selected.name}
          </p>
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
            name="masterId"
            required
            className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          >
            {masters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.group.name}
              </option>
            ))}
          </select>
          <Button type="submit">Create invoice</Button>
        </form>
      ) : null}
      {invoice ? (
        <form onSubmit={pay} className="space-y-3 border border-[var(--rule)] p-4">
          <p className="text-sm">
            Status {invoice.status} · total {String(invoice.total)} · paid{" "}
            {String(invoice.paid)}
          </p>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" min="1" step="0.01" required />
          </div>
          <select
            name="method"
            className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
            defaultValue="CASH"
          >
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CHEQUE">Cheque</option>
          </select>
          <Input name="note" placeholder="Note" />
          <Button type="submit" variant="brass">
            Record payment
          </Button>
        </form>
      ) : null}
    </div>
  );
}
