"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode =
  | "types"
  | "groups"
  | "masters"
  | "assign"
  | "discounts"
  | "fines"
  | "due"
  | "receipts";

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function FeesOps({ mode }: { mode: Mode }) {
  const title: Record<Mode, string> = {
    types: "Fee types",
    groups: "Fee groups",
    masters: "Fee master",
    assign: "Assign fee master",
    discounts: "Fee discounts",
    fines: "Fine rules",
    due: "Search due fees",
    receipts: "Fee receipts",
  };
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">{title[mode]}</h1>
      {mode === "types" ? <NamedMaster path="/api/v1/fee-types" withCode /> : null}
      {mode === "groups" ? <NamedMaster path="/api/v1/fee-groups" /> : null}
      {mode === "masters" ? <MastersPanel /> : null}
      {mode === "assign" ? <AssignPanel /> : null}
      {mode === "discounts" ? <DiscountsPanel /> : null}
      {mode === "fines" ? <FinesPanel /> : null}
      {mode === "due" ? <DuePanel /> : null}
      {mode === "receipts" ? <ReceiptsPanel /> : null}
    </div>
  );
}

function NamedMaster({ path, withCode }: { path: string; withCode?: boolean }) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; code?: string | null }>>([]);
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
      body: JSON.stringify({
        name: form.get("name"),
        code: form.get("code") || undefined,
      }),
    });
    event.currentTarget.reset();
    load();
  }
  return (
    <>
      <form className="flex flex-wrap gap-3" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        {withCode ? (
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" />
          </div>
        ) : null}
        <Button className="self-end" type="submit">
          Add
        </Button>
      </form>
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.name}
            {r.code ? ` (${r.code})` : ""}
          </li>
        ))}
      </ul>
    </>
  );
}

function MastersPanel() {
  const [sessions, setSessions] = useState<Array<{ id: string; name: string }>>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [types, setTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<Array<{ id: string; group: { name: string }; total?: unknown }>>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/v1/sessions").then((r) => r.json()),
      fetch("/api/v1/fee-groups").then((r) => r.json()),
      fetch("/api/v1/fee-types").then((r) => r.json()),
      fetch("/api/v1/fee-masters").then((r) => r.json()),
    ]).then(([s, g, t, m]) => {
      setSessions(s.data ?? []);
      setGroups(g.data ?? []);
      setTypes(t.data ?? []);
      setRows(m.data ?? []);
    });
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const typeId = String(form.get("feeTypeId"));
    await fetch("/api/v1/fee-masters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: form.get("sessionId"),
        groupId: form.get("groupId"),
        dueDate: form.get("dueDate") || undefined,
        lines: [{ feeTypeId: typeId, amount: Number(form.get("amount")) }],
      }),
    });
    setRows(((await (await fetch("/api/v1/fee-masters")).json()) as { data: typeof rows }).data ?? []);
  }
  return (
    <>
      <form className="grid max-w-xl gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
        <select name="sessionId" className={SELECT} required>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="groupId" className={SELECT} required>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select name="feeTypeId" className={SELECT} required>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Input name="amount" type="number" min="1" step="0.01" placeholder="Amount" required />
        <Input name="dueDate" type="date" />
        <Button type="submit">Save master line</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>{r.group.name}</li>
        ))}
      </ul>
    </>
  );
}

function AssignPanel() {
  const [masters, setMasters] = useState<Array<{ id: string; group: { name: string } }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([
      fetch("/api/v1/fee-masters").then((r) => r.json()),
      fetch("/api/v1/classes").then((r) => r.json()),
    ]).then(([m, c]) => {
      setMasters(m.data ?? []);
      setClasses(c.data ?? []);
    });
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const masterId = String(form.get("masterId"));
    const res = await fetch(`/api/v1/fee-masters/${masterId}/assign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ classId: form.get("classId") }),
    });
    const json = await res.json();
    setMessage(res.ok ? `Created ${json.created} invoices` : json.message ?? json.error);
  }
  return (
    <form className="flex max-w-xl flex-wrap gap-3" onSubmit={onSubmit}>
      <select name="masterId" className={SELECT} required>
        {masters.map((m) => (
          <option key={m.id} value={m.id}>
            {m.group.name}
          </option>
        ))}
      </select>
      <select name="classId" className={SELECT} required>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Button type="submit">Assign to class</Button>
      {message ? <p className="w-full text-sm">{message}</p> : null}
    </form>
  );
}

function DiscountsPanel() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; kind: string }>>([]);
  async function load() {
    setRows(((await (await fetch("/api/v1/fee-discounts")).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/fee-discounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        kind: form.get("kind"),
        percentage: form.get("kind") === "percent" ? Number(form.get("value")) : undefined,
        amount: form.get("kind") === "fixed" ? Number(form.get("value")) : undefined,
      }),
    });
    load();
  }
  return (
    <>
      <form className="flex flex-wrap gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Name" required />
        <select name="kind" className={SELECT}>
          <option value="fixed">Fixed</option>
          <option value="percent">Percent</option>
        </select>
        <Input name="value" type="number" step="0.01" placeholder="Value" required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.name} ({r.kind})
          </li>
        ))}
      </ul>
    </>
  );
}

function FinesPanel() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; afterDays: number }>>([]);
  async function load() {
    setRows(((await (await fetch("/api/v1/fine-rules")).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/fine-rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        afterDays: Number(form.get("afterDays")),
        kind: form.get("kind"),
        value: Number(form.get("value")),
      }),
    });
    load();
  }
  return (
    <>
      <form className="flex flex-wrap gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Name" required />
        <Input name="afterDays" type="number" min="0" placeholder="After days" required />
        <select name="kind" className={SELECT}>
          <option value="fixed">Fixed</option>
          <option value="percent">Percent</option>
        </select>
        <Input name="value" type="number" step="0.01" required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.name} after {r.afterDays} days
          </li>
        ))}
      </ul>
    </>
  );
}

function DuePanel() {
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<Array<{ admissionNo: string; name: string; description: string; balance: string }>>([]);
  useEffect(() => {
    fetch("/api/v1/fee-groups")
      .then((r) => r.json())
      .then((j) => setGroups(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ids = form.getAll("feeGroupIds").map(String);
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("feeGroupIds[]", id));
    const json = await (await fetch(`/api/v1/fees/due?${params}`)).json();
    setRows(json.data ?? []);
  }
  return (
    <>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Label>Fee groups</Label>
        <div className="flex flex-wrap gap-3 text-sm">
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2">
              <input type="checkbox" name="feeGroupIds" value={g.id} />
              {g.name}
            </label>
          ))}
        </div>
        <Button type="submit">Search dues</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r, i) => (
          <li key={i}>
            {r.admissionNo} {r.name} · {r.description} · {r.balance}
          </li>
        ))}
      </ul>
    </>
  );
}

function ReceiptsPanel() {
  const params = useSearchParams();
  const [receiptNo, setReceiptNo] = useState(params.get("receiptNo") ?? "");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  async function load(no: string) {
    if (!no) return;
    const res = await fetch(`/api/v1/fees/receipts/${encodeURIComponent(no)}`);
    setPayload(await res.json());
  }
  useEffect(() => {
    const fromUrl = params.get("receiptNo");
    if (fromUrl) {
      setReceiptNo(fromUrl);
      load(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await load(receiptNo);
  }
  return (
    <>
      <form className="flex gap-3" onSubmit={onSubmit}>
        <Input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="Receipt no" />
        <Button type="submit">Open</Button>
        {receiptNo ? (
          <a className="self-center text-sm underline" href={`/api/v1/fees/receipts/${encodeURIComponent(receiptNo)}?format=pdf`}>
            PDF
          </a>
        ) : null}
      </form>
      {payload ? (
        <pre className="overflow-auto border border-[var(--rule)] p-3 text-xs">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </>
  );
}
