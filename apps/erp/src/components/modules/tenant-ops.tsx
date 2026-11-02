"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type CampusRow = {
  id: string;
  name: string;
  code: string | null;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  studentCount: number;
  staffCount: number;
  userCount: number;
  feeDue?: number;
};

export default function TenantOps({ mode }: { mode: "overview" | "report" }) {
  const [rows, setRows] = useState<CampusRow[]>([]);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [activeCampusId, setActiveCampusId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    const [branchRes, orgRes] = await Promise.all([
      fetch("/api/v1/branches"),
      fetch("/api/v1/orgs"),
    ]);
    const json = await branchRes.json();
    if (!branchRes.ok) {
      setMessage(json.message ?? "You cannot manage other campuses.");
      setRows([]);
      return;
    }
    setActiveCampusId(json.activeCampusId ?? null);
    setRows(json.data ?? []);
    if (orgRes.ok) {
      const orgs = (await orgRes.json()) as { data?: Array<{ name: string }> };
      setOrgName(orgs.data?.[0]?.name ?? null);
    }
    setMessage(null);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/branches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        code: form.get("code"),
        adminUsername: form.get("adminUsername") || "admin",
        demoUsers: form.get("demoUsers") === "on",
      }),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setMessage(json.message ?? json.error ?? "Could not create campus");
      return;
    }
    setMessage(
      `Created ${json.code}. First login: ${json.adminUsername} / ${json.adminPassword} (save this password now).`,
    );
    event.currentTarget.reset();
    load();
  }

  async function onPatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/v1/branches/${editingId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        address: form.get("address"),
        phone: form.get("phone"),
        email: form.get("email"),
        logo: form.get("logo"),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setMessage(json.message ?? json.error ?? "Could not update campus");
      return;
    }
    setMessage("Campus saved");
    setEditingId(null);
    load();
  }

  async function onSwitch(campusId: string) {
    const res = await fetch("/api/v1/auth/switch-campus", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campusId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage(json.message ?? "Could not switch campus");
      return;
    }
    window.location.assign("/staff/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">
          Multi-campus
        </p>
        <h1 className="font-display mt-1 text-4xl">
          {mode === "report" ? "Campus report" : "Campuses"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          {orgName ? `${orgName}. ` : ""}
          Each campus has its own students, fees, and staff. Switching campus
          changes which records you see. Save a new campus admin password when
          it appears — it is shown only once.
        </p>
      </div>
      {message ? (
        <p className="border border-[var(--rule)] bg-[var(--paper-2)] p-3 text-sm" role="alert">
          {message}
        </p>
      ) : null}
      {mode === "overview" ? (
        <form
          className="grid gap-3 border border-[var(--rule)] bg-[var(--paper-2)] p-4 sm:grid-cols-2"
          onSubmit={onCreate}
        >
          <div>
            <Label htmlFor="name">Campus name</Label>
            <Input id="name" name="name" required placeholder="West Campus" />
          </div>
          <div>
            <Label htmlFor="code">Campus code</Label>
            <Input id="code" name="code" required placeholder="WEST" />
          </div>
          <div>
            <Label htmlFor="adminUsername">First admin username</Label>
            <Input id="adminUsername" name="adminUsername" placeholder="admin" />
          </div>
          <label className="flex items-end gap-2 text-sm">
            <input type="checkbox" name="demoUsers" />
            Seed demo teacher / student / parent
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Add campus"}
            </Button>
          </div>
        </form>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--rule)] text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <th className="py-2">Campus</th>
            <th>Code</th>
            <th>Students</th>
            <th>Staff</th>
            <th>Fee due</th>
            {mode === "overview" ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--rule)]">
              <td className="py-3 font-medium">
                {row.name}
                {row.id === activeCampusId ? (
                  <span className="ml-2 text-[11px] uppercase tracking-[0.14em] text-[var(--brass)]">
                    current
                  </span>
                ) : null}
              </td>
              <td>{row.code ?? "—"}</td>
              <td>{row.studentCount}</td>
              <td>{row.staffCount}</td>
              <td>₹{row.feeDue ?? 0}</td>
              {mode === "overview" ? (
                <td className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(row.id)}
                  >
                    Edit
                  </Button>
                  {row.id === activeCampusId ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onSwitch(row.id)}
                    >
                      Work in this campus
                    </Button>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {mode === "overview" && editingId
        ? (() => {
            const row = rows.find((item) => item.id === editingId);
            if (!row) return null;
            return (
              <form
                key={row.id}
                className="grid gap-3 border border-[var(--rule)] bg-[var(--paper-2)] p-4 sm:grid-cols-2"
                onSubmit={onPatch}
              >
                <div className="sm:col-span-2 text-sm font-medium">
                  Edit {row.name}
                </div>
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input id="edit-name" name="name" defaultValue={row.name} required />
                </div>
                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Input id="edit-address" name="address" defaultValue={row.address ?? ""} />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input id="edit-phone" name="phone" defaultValue={row.phone ?? ""} />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" name="email" defaultValue={row.email ?? ""} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-logo">Logo URL (https)</Label>
                  <Input id="edit-logo" name="logo" defaultValue={row.logo ?? ""} />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit" disabled={pending}>
                    {pending ? "Saving…" : "Save campus"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            );
          })()
        : null}
    </div>
  );
}
