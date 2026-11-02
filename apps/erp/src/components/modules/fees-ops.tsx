"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Mode =
  | "types"
  | "groups"
  | "installments"
  | "masters"
  | "assign"
  | "discounts"
  | "fines"
  | "due"
  | "receipts"
  | "deposit";

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function FeesOps({ mode }: { mode: Mode }) {
  const title: Record<Mode, string> = {
    types: "Fee types",
    groups: "Fee groups",
    installments: "Fee installments",
    masters: "Fee master",
    assign: "Assign fee master",
    discounts: "Fee discounts",
    fines: "Fine rules",
    due: "Search due fees",
    receipts: "Fee receipts",
    deposit: "Deposit slips",
  };
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">{title[mode]}</h1>
      {mode === "types" ? <FeeTypesPanel /> : null}
      {mode === "groups" ? <NamedMaster path="/api/v1/fee-groups" removable /> : null}
      {mode === "installments" ? (
        <NamedMaster path="/api/v1/fee-installments" removable />
      ) : null}
      {mode === "masters" ? <MastersPanel /> : null}
      {mode === "assign" ? <AssignPanel /> : null}
      {mode === "discounts" ? <DiscountsPanel /> : null}
      {mode === "fines" ? <FinesPanel /> : null}
      {mode === "due" ? <DuePanel /> : null}
      {mode === "receipts" ? <ReceiptsPanel /> : null}
      {mode === "deposit" ? <DepositPanel /> : null}
    </div>
  );
}

type FeeTypeRow = {
  id: string;
  name: string;
  code?: string | null;
  isRefundable?: boolean;
  cgst?: boolean;
  sgst?: boolean;
  igst?: boolean;
  visible?: boolean;
};

function feeTypeFlags(form: FormData) {
  return {
    isRefundable: form.get("isRefundable") === "on",
    cgst: form.get("cgst") === "on",
    sgst: form.get("sgst") === "on",
    igst: form.get("igst") === "on",
    visible: form.get("visible") === "on",
  };
}

function FeeTypesPanel() {
  const [rows, setRows] = useState<FeeTypeRow[]>([]);
  const [typeId, setTypeId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const json = await fetch("/api/v1/fee-types").then((r) => r.json());
    const next = (json.data ?? []) as FeeTypeRow[];
    setRows(next);
    setTypeId((prev) => prev || next[0]?.id || "");
  }
  useEffect(() => {
    load();
  }, []);
  const selected = rows.find((row) => row.id === typeId);
  return (
    <>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const res = await fetch("/api/v1/fee-types", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              code: form.get("code") || undefined,
              ...feeTypeFlags(form),
            }),
          });
          setMessage(res.ok ? "Fee type saved" : "Could not save");
          if (res.ok) {
            event.currentTarget.reset();
            load();
          }
        }}
      >
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="isRefundable" /> Refundable
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="cgst" /> CGST
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="sgst" /> SGST
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="igst" /> IGST
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="visible" defaultChecked /> Visible
        </label>
        <Button className="self-end" type="submit">
          Add
        </Button>
      </form>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const id = String(form.get("typeId") ?? "");
          const res = await fetch(`/api/v1/fee-types/${id}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(feeTypeFlags(form)),
          });
          setMessage(res.ok ? "Flags saved" : "Could not save flags");
          if (res.ok) load();
        }}
      >
        <select name="typeId" className={SELECT} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isRefundable" defaultChecked={selected?.isRefundable} key={`${typeId}-r`} /> Refundable
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="cgst" defaultChecked={selected?.cgst} key={`${typeId}-c`} /> CGST
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sgst" defaultChecked={selected?.sgst} key={`${typeId}-s`} /> SGST
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="igst" defaultChecked={selected?.igst} key={`${typeId}-i`} /> IGST
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="visible" defaultChecked={selected?.visible !== false} key={`${typeId}-v`} /> Visible
        </label>
        <Button type="submit" size="sm">
          Save flags
        </Button>
      </form>
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>
            {r.name}
            {r.code ? ` (${r.code})` : ""}
            {r.isRefundable ? " · refundable" : ""}
            {r.cgst ? " · CGST" : ""}
            {r.sgst ? " · SGST" : ""}
            {r.igst ? " · IGST" : ""}
            {r.visible === false ? " · hidden" : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/fee-types/${r.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Fee type removed" : "Could not remove (in use)");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

function NamedMaster({
  path,
  withCode,
  removable,
}: {
  path: string;
  withCode?: boolean;
  removable?: boolean;
}) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; code?: string | null }>>([]);
  const [message, setMessage] = useState<string | null>(null);
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
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
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
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>
            {r.name}
            {r.code ? ` (${r.code})` : ""}
            </span>
            {removable ? (
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const res = await fetch(`${path}/${r.id}`, { method: "DELETE" });
                  setMessage(res.ok ? "Removed" : "Could not remove");
                  if (res.ok) load();
                }}
              >
                Remove
              </Button>
            ) : null}
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
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      dueDate?: string | null;
      installment?: string | null;
      group: { name: string };
      lines?: Array<{ amount: unknown; feeType?: { name: string } }>;
    }>
  >([]);
  const [installments, setInstallments] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [lines, setLines] = useState<
    Array<{ feeTypeId: string; amount: string; dueDate: string; installmentId: string }>
  >([{ feeTypeId: "", amount: "", dueDate: "", installmentId: "" }]);
  async function reload() {
    const [s, g, t, inst, m] = await Promise.all([
      fetch("/api/v1/sessions").then((r) => r.json()),
      fetch("/api/v1/fee-groups").then((r) => r.json()),
      fetch("/api/v1/fee-types").then((r) => r.json()),
      fetch("/api/v1/fee-installments").then((r) => r.json()),
      fetch("/api/v1/fee-templates").then((r) => r.json()),
    ]);
    setSessions(s.data ?? []);
    setGroups(g.data ?? []);
    setTypes(t.data ?? []);
    setInstallments(inst.data ?? []);
    setRows(m.data ?? []);
    const firstType = t.data?.[0]?.id ?? "";
    setLines((prev) =>
      prev[0]?.feeTypeId
        ? prev
        : [{ feeTypeId: firstType, amount: "", dueDate: "", installmentId: "" }],
    );
  }
  useEffect(() => {
    reload();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/fee-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: form.get("sessionId"),
        groupId: form.get("groupId"),
        lines: lines
          .filter((line) => line.feeTypeId && Number(line.amount) > 0)
          .map((line) => ({
            feeTypeId: line.feeTypeId,
            amount: Number(line.amount),
            dueDate: line.dueDate || undefined,
            installmentId: line.installmentId || undefined,
          })),
      }),
    });
    reload();
  }
  return (
    <>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      <form className="grid max-w-3xl gap-3" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-4">
            <select
              className={SELECT}
              value={line.feeTypeId}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...line, feeTypeId: e.target.value };
                setLines(next);
              }}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className={SELECT}
              value={line.installmentId}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...line, installmentId: e.target.value };
                setLines(next);
              }}
            >
              <option value="">Installment</option>
              {installments.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={line.amount}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...line, amount: e.target.value };
                setLines(next);
              }}
            />
            <Input
              type="date"
              value={line.dueDate}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...line, dueDate: e.target.value };
                setLines(next);
              }}
            />
          </div>
        ))}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setLines([
                ...lines,
                {
                  feeTypeId: types[0]?.id ?? "",
                  amount: "",
                  dueDate: "",
                  installmentId: "",
                },
              ])
            }
          >
            Add installment line
          </Button>
          <Button type="submit">Save template</Button>
        </div>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>
              {r.group.name}
              {r.installment ? ` · ${r.installment}` : ""}
              {r.dueDate ? ` · ${String(r.dueDate).slice(0, 10)}` : ""}
              {(r.lines ?? [])
                .map((line) => `${line.feeType?.name ?? "head"} ${line.amount}`)
                .join(" · ")}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/fee-templates/${r.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Template removed" : "Could not remove (in use)");
                if (res.ok) reload();
              }}
            >
              Remove
            </Button>
          </li>
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
      fetch("/api/v1/fee-templates").then((r) => r.json()),
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
    const res = await fetch(`/api/v1/fee-templates/${masterId}/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ class_ids: [form.get("classId")] }),
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
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    setRows(((await (await fetch("/api/v1/discount-types")).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/discount-types", {
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
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
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
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>
            {r.name} ({r.kind})
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/discount-types/${r.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Discount removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

function FinesPanel() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; afterDays: number }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    setRows(((await (await fetch("/api/v1/late-fee-rules")).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/late-fee-rules", {
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
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
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
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>
              {r.name} after {r.afterDays} days
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/late-fee-rules/${r.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Rule removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
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
    const json = await (await fetch(`/api/v1/fees?${params}`)).json();
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

function DepositPanel() {
  const [slips, setSlips] = useState<
    Array<{
      id: string;
      slipNo: string;
      depositedAt: string;
      bankName: string;
      accountRef: string;
      amount: number;
      receiptNos: string[];
    }>
  >([]);
  const [undeposited, setUndeposited] = useState<
    Array<{
      id: string;
      receiptNo: string;
      amount: number;
      method: string;
      paidAt: string;
      studentName: string;
    }>
  >([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const json = await fetch("/api/v1/deposit-slips").then((r) => r.json());
    setSlips(json.data ?? []);
    setUndeposited(json.undeposited ?? []);
    setPicked([]);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/deposit-slips", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        depositedAt: form.get("depositedAt"),
        bankName: form.get("bankName"),
        accountRef: form.get("accountRef"),
        note: form.get("note"),
        paymentIds: picked,
      }),
    });
    setMessage(res.ok ? "Slip saved" : "Could not save");
    if (res.ok) event.currentTarget.reset();
    load();
  }
  return (
    <>
      <p className="text-sm text-[var(--muted)]">
        Bank cash, cheque, and DD collections. Each receipt sits on one slip.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="depositedAt" type="date" required />
        <Input name="bankName" placeholder="Bank" required />
        <Input name="accountRef" placeholder="Account" />
        <Input name="note" placeholder="Note" />
        <fieldset className="space-y-2 text-sm">
          <legend>Undeposited receipts</legend>
          {undeposited.map((row) => (
            <label key={row.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={picked.includes(row.id)}
                onChange={(event) => {
                  setPicked((cur) =>
                    event.target.checked
                      ? [...cur, row.id]
                      : cur.filter((id) => id !== row.id),
                  );
                }}
              />
              {row.receiptNo} · {row.method} · ₹{row.amount} · {row.studentName}
            </label>
          ))}
        </fieldset>
        <Button type="submit" disabled={!picked.length}>
          Create slip
        </Button>
      </form>
      <ul className="text-sm">
        {slips.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {row.slipNo} · {row.depositedAt} · {row.bankName} · ₹{row.amount}{" "}
              <a
                className="underline"
                href={`/api/v1/deposit-slips/${row.id}?format=pdf`}
              >
                PDF
              </a>
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/deposit-slips/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Slip removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
