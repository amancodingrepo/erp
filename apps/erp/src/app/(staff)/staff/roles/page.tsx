"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Permission = {
  id: string;
  key: string;
  module: string;
  feature: string;
  action: string;
};

type RoleRow = {
  id: string;
  name: string;
  isSystem: boolean;
  permissionIds: string[];
};

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/v1/roles");
    const json = await res.json();
    const data = (json.data ?? []) as RoleRow[];
    setRoles(data);
    setPermissions(json.permissions ?? []);
    setSelected((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const role = roles.find((r) => r.id === selected);
    setChecked(new Set(role?.permissionIds ?? []));
    setSaved(false);
  }, [selected, roles]);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const perm of permissions) {
      const list = map.get(perm.module) ?? [];
      list.push(perm);
      map.set(perm.module, list);
    }
    return [...map.entries()];
  }, [permissions]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/v1/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, cloneFromId: selected ?? undefined }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "create failed");
      return;
    }
    setName("");
    await load();
    if (json.id) setSelected(json.id);
  }

  async function save() {
    if (!selected) return;
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/v1/roles/${selected}/permissions`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissionIds: [...checked] }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "save failed");
      return;
    }
    setSaved(true);
    load();
  }

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const current = roles.find((r) => r.id === selected);

  return (
    <div>
      <h1 className="font-display text-4xl">Roles</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Tick permissions per role. SuperAdmin edits only.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="border border-[var(--rule)] bg-[var(--paper-2)] p-3">
          <ul className="space-y-1 text-sm">
            {roles.map((role) => (
              <li key={role.id}>
                <button
                  type="button"
                  className={`w-full rounded-md px-2 py-1.5 text-left ${
                    selected === role.id
                      ? "bg-[var(--brass)] text-[var(--ink)]"
                      : "hover:bg-[var(--paper)]"
                  }`}
                  onClick={() => setSelected(role.id)}
                >
                  {role.name}
                  {role.isSystem ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">
                      system
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <form className="mt-4 space-y-2" onSubmit={onCreate}>
            <Label htmlFor="role-name">Clone into new role</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Role name"
              required
            />
            <Button type="submit" size="sm" className="w-full">
              Create
            </Button>
          </form>
        </aside>
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{current?.name ?? "Role"}</h2>
            <Button type="button" variant="brass" onClick={save} disabled={!selected}>
              Save permissions
            </Button>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-[var(--stamp)]" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Saved.</p>
          ) : null}
          <div className="mt-4 space-y-6">
            {grouped.map(([module, perms]) => (
              <section key={module}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
                  {module}
                </h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {perms.map((perm) => (
                    <li key={perm.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked.has(perm.id)}
                          onChange={() => toggle(perm.id)}
                        />
                        {perm.feature}.{perm.action}
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
