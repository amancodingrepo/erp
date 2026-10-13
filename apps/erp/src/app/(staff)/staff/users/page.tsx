"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Tab = "Staff" | "Student" | "Parent";

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  isActive: boolean;
  roles: { id: string; name: string }[];
  staff: {
    employeeId: string;
    name: string;
    phone: string | null;
    department: string | null;
    designation: string | null;
  } | null;
  student: {
    admissionNo: string;
    name: string;
    mobile: string | null;
    class: string | null;
  } | null;
  guardian: { name: string; phone: string | null } | null;
};

type RoleOpt = { id: string; name: string };

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>("Staff");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOpt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [createdLogin, setCreatedLogin] = useState<string | null>(null);

  async function load(nextTab = tab, query = q) {
    const params = new URLSearchParams({ actorType: nextTab, q: query });
    const res = await fetch(`/api/v1/users?${params}`);
    const json = await res.json();
    setRows(json.data ?? []);
  }

  useEffect(() => {
    load();
    fetch("/api/v1/roles")
      .then((r) => r.json())
      .then((json) => setRoles(json.data ?? []))
      .catch(() => setRoles([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    load();
  }

  async function setActive(id: string, isActive: boolean) {
    setError(null);
    const res = await fetch(`/api/v1/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "update failed");
      return;
    }
    load();
  }

  async function assignRoles(id: string, roleIds: string[]) {
    setError(null);
    const res = await fetch(`/api/v1/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roleIds }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "update failed");
      return;
    }
    load();
  }

  async function sendInvite(id: string) {
    setError(null);
    setInvite(null);
    setTemporaryPassword(null);
    const res = await fetch(`/api/v1/users/${id}/invite`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "invite failed");
      return;
    }
    setInvite(json.token);
  }

  async function createLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedLogin(null);
    const form = new FormData(event.currentTarget);
    const roleId = String(form.get("roleId") ?? "");
    const res = await fetch("/api/v1/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
        email: form.get("email") || undefined,
        actorType: "STAFF",
        roleIds: roleId ? [roleId] : [],
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? json.message ?? "Could not create login");
      return;
    }
    setCreatedLogin(json.username ?? String(form.get("username")));
    event.currentTarget.reset();
    load("Staff");
    setTab("Staff");
  }

  async function resetPassword(id: string) {
    setError(null);
    setInvite(null);
    setTemporaryPassword(null);
    const res = await fetch(`/api/v1/users/${id}/reset-password`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "reset failed");
      return;
    }
    setTemporaryPassword(json.temporaryPassword ?? null);
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Users</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Enable or disable login. To add a teacher or platform admin with a staff ID, use{" "}
        <a className="underline" href="/staff/staff">
          Manage staff
        </a>
        . This page also creates a staff login and role.
      </p>
      <form
        className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-4"
        onSubmit={createLogin}
      >
        <Input name="username" placeholder="Username *" required />
        <Input name="password" type="password" placeholder="Password * (min 8)" required />
        <Input name="email" type="email" placeholder="Email" />
        <select
          name="roleId"
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-2 text-sm"
          required
        >
          <option value="">Role *</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <Button type="submit" className="sm:col-span-4 w-fit">
          Add login
        </Button>
      </form>
      {createdLogin ? (
        <p className="mt-2 text-sm text-[var(--muted)]">Login created: {createdLogin}</p>
      ) : null}
      <div className="mt-6 flex gap-2">
        {(["Staff", "Student", "Parent"] as Tab[]).map((name) => (
          <Button
            key={name}
            type="button"
            variant={tab === name ? "brass" : "ghost"}
            onClick={() => {
              setTab(name);
              load(name);
            }}
          >
            {name}
          </Button>
        ))}
      </div>
      <form className="mt-4 flex gap-3" onSubmit={onSearch}>
        <div className="min-w-56 flex-1">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Username or email"
          />
        </div>
        <div className="self-end">
          <Button type="submit">Search</Button>
        </div>
      </form>
      {error ? (
        <p className="mt-3 text-sm text-[var(--stamp)]" role="alert">
          {error}
        </p>
      ) : null}
      {invite ? (
        <p className="mt-3 break-all text-sm text-[var(--muted)]">
          Invite token (share once): {invite}
        </p>
      ) : null}
      {temporaryPassword ? (
        <p className="mt-3 break-all text-sm text-[var(--muted)]">
          Temporary password (share once): {temporaryPassword}
        </p>
      ) : null}
      <div className="mt-6 overflow-x-auto border border-[var(--rule)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--paper-2)] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <tr>
              {tab === "Staff" ? (
                <>
                  <th className="px-3 py-2">Staff ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Designation</th>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Phone</th>
                </>
              ) : null}
              {tab === "Student" ? (
                <>
                  <th className="px-3 py-2">Student ID</th>
                  <th className="px-3 py-2">Student Name</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Mobile</th>
                </>
              ) : null}
              {tab === "Parent" ? (
                <>
                  <th className="px-3 py-2">Guardian Name</th>
                  <th className="px-3 py-2">Guardian Phone</th>
                  <th className="px-3 py-2">Username</th>
                </>
              ) : null}
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--rule)]">
                {tab === "Staff" ? (
                  <>
                    <td className="px-3 py-2">{row.staff?.employeeId ?? "—"}</td>
                    <td className="px-3 py-2">{row.staff?.name ?? row.username}</td>
                    <td className="px-3 py-2">{row.email ?? "—"}</td>
                    <td className="px-3 py-2">
                      <select
                        className="h-9 max-w-48 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-2"
                        value={row.roles[0]?.id ?? ""}
                        onChange={(e) =>
                          assignRoles(row.id, e.target.value ? [e.target.value] : [])
                        }
                      >
                        <option value="">No role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">{row.staff?.designation ?? "—"}</td>
                    <td className="px-3 py-2">{row.staff?.department ?? "—"}</td>
                    <td className="px-3 py-2">{row.staff?.phone ?? "—"}</td>
                  </>
                ) : null}
                {tab === "Student" ? (
                  <>
                    <td className="px-3 py-2">
                      {row.student?.admissionNo ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.student?.name ?? row.username}
                    </td>
                    <td className="px-3 py-2">{row.username}</td>
                    <td className="px-3 py-2">{row.student?.class ?? "—"}</td>
                    <td className="px-3 py-2">{row.student?.mobile ?? "—"}</td>
                  </>
                ) : null}
                {tab === "Parent" ? (
                  <>
                    <td className="px-3 py-2">
                      {row.guardian?.name ?? row.username}
                    </td>
                    <td className="px-3 py-2">{row.guardian?.phone ?? "—"}</td>
                    <td className="px-3 py-2">{row.username}</td>
                  </>
                ) : null}
                <td className="px-3 py-2">
                  {row.isActive ? "Active" : "Disabled"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={row.isActive ? "danger" : "brass"}
                      onClick={() => setActive(row.id, !row.isActive)}
                    >
                      {row.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => sendInvite(row.id)}
                    >
                      Send password
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => resetPassword(row.id)}
                    >
                      Reset password
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
