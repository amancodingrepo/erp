"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "elements" | "structure" | "slabs" | "run" | "report";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function PayrollOps({ mode }: { mode: Mode }) {
  if (mode === "structure") return <StructurePanel />;
  if (mode === "slabs") return <SlabsPanel />;
  if (mode === "run" || mode === "report") return <RunPanel />;
  return <ElementsPanel />;
}

function ElementsPanel() {
  const [rows, setRows] = useState<Array<{ id: string; code: string; name: string; kind: string }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/payroll/elements").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/payroll/elements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        code: form.get("code"),
        kind: form.get("kind"),
      }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Pay elements</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="code" placeholder="CODE" required />
        <Input name="name" placeholder="Name" required />
        <select name="kind" className={SELECT}>
          <option value="EARNING">Earning</option>
          <option value="DEDUCTION">Deduction</option>
        </select>
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.code} · {r.name} · {r.kind}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StructurePanel() {
  const [staff, setStaff] = useState<Array<{ id: string; firstName: string; lastName?: string }>>(
    [],
  );
  const [elements, setElements] = useState<Array<{ id: string; code: string; isStatutory: boolean }>>(
    [],
  );
  const [rows, setRows] = useState<
    Array<{ id: string; amount: string; staff: { employeeId: string }; element: { code: string } }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [s, e, st] = await Promise.all([
      fetch("/api/v1/staff").then((r) => r.json()),
      fetch("/api/v1/payroll/elements").then((r) => r.json()),
      fetch("/api/v1/payroll/structure").then((r) => r.json()),
    ]);
    setStaff(s.data ?? []);
    setElements((e.data ?? []).filter((x: { isStatutory: boolean }) => !x.isStatutory));
    setRows(st.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/payroll/structure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        staffId: form.get("staffId"),
        elementId: form.get("elementId"),
        amount: form.get("amount"),
      }),
    });
    setMessage(res.ok ? "Attached" : "Could not attach statutory or invalid amount");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Staff pay structure</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="staffId" className={SELECT} required>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {[s.firstName, s.lastName].filter(Boolean).join(" ")}
            </option>
          ))}
        </select>
        <select name="elementId" className={SELECT} required>
          {elements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.code}
            </option>
          ))}
        </select>
        <Input name="amount" placeholder="Monthly amount" required />
        <Button type="submit">Attach</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.staff.employeeId} · {r.element.code} · ₹{r.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SlabsPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; kind: string; minAmount: string; maxAmount: string | null; rate: string | null; taxAmount: string | null }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/payroll/slabs").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/payroll/slabs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: form.get("kind"),
        minAmount: form.get("minAmount"),
        maxAmount: form.get("maxAmount") || null,
        rate: form.get("rate") || undefined,
        taxAmount: form.get("taxAmount") || undefined,
      }),
    });
    setMessage(res.ok ? "Slab saved" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">PT / TDS slabs</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="kind" className={SELECT}>
          <option value="PT">PT</option>
          <option value="TDS">TDS</option>
        </select>
        <Input name="minAmount" placeholder="Min" required />
        <Input name="maxAmount" placeholder="Max (blank = none)" />
        <Input name="taxAmount" placeholder="PT amount" />
        <Input name="rate" placeholder="TDS rate e.g. 0.05" />
        <Button type="submit">Add slab</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.kind} · {r.minAmount}–{r.maxAmount ?? "∞"}
            {r.taxAmount ? ` · ₹${r.taxAmount}` : ""}
            {r.rate ? ` · ${r.rate}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RunPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      year: number;
      month: number;
      slips: Array<{ employeeId?: string; gross: string; pf: string; esi: string; pt: string; tds: string; net: string }>;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/payroll/runs").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/payroll/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        year: Number(form.get("year")),
        month: Number(form.get("month")),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Generated" : json.message ?? json.error);
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Generate payroll</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="flex max-w-xl flex-wrap gap-3" onSubmit={onSubmit}>
        <Input name="year" type="number" defaultValue={new Date().getFullYear()} required />
        <Input name="month" type="number" min={1} max={12} defaultValue={new Date().getMonth() + 1} required />
        <Button type="submit">Run PF/ESI/PT/TDS</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id} className="mb-2">
            {r.year}-{String(r.month).padStart(2, "0")}
            <ul>
              {r.slips.map((s, i) => (
                <li key={i}>
                  gross ₹{s.gross} · PF ₹{s.pf} · ESI ₹{s.esi} · PT ₹{s.pt} · TDS ₹{s.tds} · net ₹
                  {s.net}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
