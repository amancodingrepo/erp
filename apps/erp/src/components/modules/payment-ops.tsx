"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Merchant = {
  id: string;
  name: string;
  provider: string;
  keyId: string;
  isDefault: boolean;
  feeTypeId: string | null;
};

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function PaymentOps() {
  const [rows, setRows] = useState<Merchant[]>([]);
  const [types, setTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [m, t] = await Promise.all([
      fetch("/api/v1/payment-merchants").then((r) => r.json()),
      fetch("/api/v1/fee-types").then((r) => r.json()),
    ]);
    setRows(m.data ?? []);
    setTypes(t.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/payment-merchants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        provider: form.get("provider"),
        keyId: form.get("keyId"),
        keySecret: form.get("keySecret"),
        webhookSecret: form.get("webhookSecret"),
        isDefault: form.get("isDefault") === "on",
        feeTypeId: form.get("feeTypeId") || undefined,
      }),
    });
    setMessage(res.ok ? "Merchant saved" : "Could not save");
    if (res.ok) {
      event.currentTarget.reset();
      load();
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-4xl">Payment methods</h1>
      <p className="text-sm text-[var(--muted)]">
        Map Razorpay or Cashfree accounts to this campus. Optional fee-type
        mapping sends hostel vs tuition to different merchants. Webhooks:
        <code> /api/v1/webhooks/razorpay </code>
        and
        <code> /api/v1/webhooks/cashfree</code>.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3 border border-[var(--rule)] p-4" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="name">Label</Label>
          <Input id="name" name="name" required placeholder="Tuition Razorpay" />
        </div>
        <div>
          <Label htmlFor="provider">Provider</Label>
          <select id="provider" name="provider" className={SELECT} defaultValue="razorpay">
            <option value="razorpay">Razorpay</option>
            <option value="cashfree">Cashfree</option>
          </select>
        </div>
        <div>
          <Label htmlFor="keyId">Key ID</Label>
          <Input id="keyId" name="keyId" required autoComplete="off" />
        </div>
        <div>
          <Label htmlFor="keySecret">Key secret</Label>
          <Input id="keySecret" name="keySecret" type="password" required />
        </div>
        <div>
          <Label htmlFor="webhookSecret">Webhook secret</Label>
          <Input id="webhookSecret" name="webhookSecret" type="password" required />
        </div>
        <div>
          <Label htmlFor="feeTypeId">Fee type (optional)</Label>
          <select id="feeTypeId" name="feeTypeId" className={SELECT} defaultValue="">
            <option value="">Default / all</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isDefault" />
          Default merchant for this provider
        </label>
        <Button type="submit">Add merchant</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            {row.name} · {row.provider} · {row.keyId}
            {row.isDefault ? " · default" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
