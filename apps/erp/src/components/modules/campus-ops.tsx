"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { mediaUrlFromForm } from "@/lib/client-upload";

type Mode =
  | "staff"
  | "staff-categories"
  | "designations"
  | "drivers"
  | "notices"
  | "settings"
  | "letterhead"
  | "modules"
  | "smtp"
  | "houses"
  | "events"
  | "cctv"
  | "custom-fields";
const SELECT =
  "h-10 w-full rounded-xl border border-[var(--rule)] bg-white px-3 text-sm";

const STAFF_MODULE_KEYS = [
  "fees",
  "transport",
  "uniforms",
  "library",
  "academics",
  "others",
] as const;

export default function CampusOps({ mode }: { mode: Mode }) {
  if (mode === "staff") return <StaffPanel />;
  if (mode === "drivers") return <DriversPanel />;
  if (mode === "staff-categories") {
    return (
      <NamedMaster path="/api/v1/staff-categories" title="Staff categories" removable />
    );
  }
  if (mode === "designations") {
    return <NamedMaster path="/api/v1/designations" title="Designations" removable />;
  }
  if (mode === "notices") return <NoticesPanel />;
  if (mode === "letterhead") return <LetterheadPanel />;
  if (mode === "modules") return <ModulesPanel />;
  if (mode === "smtp") return <SmtpPanel />;
  if (mode === "houses") return <HousesPanel />;
  if (mode === "events") return <EventsPanel />;
  if (mode === "cctv") return <CctvPanel />;
  if (mode === "custom-fields") return <CustomFieldsPanel />;
  return <SettingsPanel />;
}

const FIELD_BELONG = [
  "Student",
  "Staff",
  "Admission",
  "Enquiry",
  "Documents",
  "Liberal Art",
] as const;
const FIELD_TYPES = [
  "Input",
  "Number",
  "Textarea",
  "Dropdown",
  "Date",
  "Checkbox",
] as const;

function CustomFieldsPanel() {
  type FieldRow = {
    id: string;
    name: string;
    belongTo: string;
    type: string;
    values?: string | null;
    required?: boolean;
    visible?: boolean;
    onTable?: boolean;
    columnSpan?: number;
  };
  const [rows, setRows] = useState<FieldRow[]>([]);
  const [fieldId, setFieldId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const json = await fetch("/api/v1/custom-fields?includeHidden=1").then((r) =>
      r.json(),
    );
    const next = (json.data ?? []) as FieldRow[];
    setRows(next);
    setFieldId((prev) => prev || next[0]?.id || "");
  }
  useEffect(() => {
    load();
  }, []);
  const selected = rows.find((row) => row.id === fieldId);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Custom fields</h1>
      <p className="text-sm text-[var(--muted)]">
        Extra questions on student, staff, admission, and enquiry forms.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const res = await fetch("/api/v1/custom-fields", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              belongTo: form.get("belongTo"),
              type: form.get("type"),
              values: String(form.get("values") ?? "").trim() || undefined,
              required: form.get("required") === "on",
              visible: form.get("visible") === "on",
              onTable: form.get("onTable") === "on",
            }),
          });
          setMessage(res.ok ? "Field saved" : "Could not save field");
          if (res.ok) {
            event.currentTarget.reset();
            load();
          }
        }}
      >
        <Input name="name" placeholder="Name" required />
        <select name="belongTo" className={SELECT} defaultValue="Student">
          {FIELD_BELONG.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>
        <select name="type" className={SELECT} defaultValue="Input">
          {FIELD_TYPES.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>
        <Input name="values" placeholder="Dropdown values (comma)" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="required" /> Required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="visible" defaultChecked /> Visible
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="onTable" /> Show on table
        </label>
        <Button type="submit">Add field</Button>
      </form>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const id = String(form.get("fieldId") ?? "");
          const res = await fetch(`/api/v1/custom-fields/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              belongTo: form.get("belongTo"),
              type: form.get("type"),
              values: String(form.get("values") ?? "").trim(),
              required: form.get("required") === "on",
              visible: form.get("visible") === "on",
              onTable: form.get("onTable") === "on",
            }),
          });
          setMessage(res.ok ? "Field updated" : "Could not update field");
          if (res.ok) load();
        }}
      >
        <select
          name="fieldId"
          className={SELECT}
          value={fieldId}
          onChange={(e) => setFieldId(e.target.value)}
        >
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.belongTo} · {row.name}
            </option>
          ))}
        </select>
        <Input name="name" defaultValue={selected?.name} key={`${fieldId}-n`} required />
        <select
          name="belongTo"
          className={SELECT}
          defaultValue={selected?.belongTo ?? "Student"}
          key={`${fieldId}-b`}
        >
          {FIELD_BELONG.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>
        <select
          name="type"
          className={SELECT}
          defaultValue={selected?.type ?? "Input"}
          key={`${fieldId}-t`}
        >
          {FIELD_TYPES.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>
        <Input
          name="values"
          defaultValue={selected?.values ?? ""}
          key={`${fieldId}-v`}
          placeholder="Dropdown values"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="required" defaultChecked={selected?.required} key={`${fieldId}-r`} /> Required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="visible"
            defaultChecked={selected?.visible !== false}
            key={`${fieldId}-vis`}
          />{" "}
          Visible
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="onTable" defaultChecked={selected?.onTable} key={`${fieldId}-tbl`} /> On table
        </label>
        <Button type="submit" size="sm">
          Save field
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={async () => {
            if (!fieldId) return;
            const res = await fetch(`/api/v1/custom-fields/${fieldId}`, {
              method: "DELETE",
            });
            setMessage(
              res.ok ? "Field deleted" : "Hide the field if it already has answers",
            );
            if (res.ok) {
              setFieldId("");
              load();
            }
          }}
        >
          Delete
        </Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            {row.belongTo} · {row.name} · {row.type}
            {row.required ? " · required" : ""}
            {row.visible === false ? " · hidden" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HousesPanel() {
  const [houses, setHouses] = useState<
    Array<{ id: string; name: string; color?: string; description?: string }>
  >([]);
  const [classes, setClasses] = useState<
    Array<{ id: string; name: string; sections: { id: string; name: string }[] }>
  >([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [houseId, setHouseId] = useState("");
  const [extraHouseId, setExtraHouseId] = useState("");
  const [students, setStudents] = useState<
    Array<{ id: string; admissionNo: string; name: string }>
  >([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  async function loadHouses() {
    const json = await fetch("/api/v1/houses").then((r) => r.json());
    setHouses(json.data ?? []);
    setHouseId((prev) => prev || json.data?.[0]?.id || "");
    setExtraHouseId((prev) => prev || json.data?.[0]?.id || "");
  }

  useEffect(() => {
    loadHouses();
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((json) => {
        const rows = json.data ?? [];
        setClasses(rows);
        setClassId(rows[0]?.id ?? "");
        setSectionId(rows[0]?.sections?.[0]?.id ?? "");
      });
  }, []);

  useEffect(() => {
    if (!classId) return;
    const q = new URLSearchParams({ classId, pageSize: "100" });
    if (sectionId) q.set("sectionId", sectionId);
    fetch(`/api/v1/students?${q}`)
      .then((r) => r.json())
      .then((json) => {
        const rows = json.data ?? [];
        setStudents(rows);
        setPicked(new Set(rows.map((row: { id: string }) => row.id)));
      });
  }, [classId, sectionId]);

  async function addHouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/houses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        color: String(form.get("color") ?? "").trim() || undefined,
        description: String(form.get("description") ?? "").trim() || undefined,
      }),
    });
    event.currentTarget.reset();
    loadHouses();
  }

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Houses</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="flex flex-wrap gap-3" onSubmit={addHouse}>
        <Input name="name" placeholder="Name" required />
        <Input name="color" placeholder="#RRGGBB" />
        <Input name="description" placeholder="Description" />
        <Button type="submit">Add</Button>
      </form>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const id = String(form.get("houseId") ?? "");
          const res = await fetch(`/api/v1/houses/${id}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              color: String(form.get("color") ?? "").trim(),
              description: String(form.get("description") ?? "").trim(),
            }),
          });
          setMessage(res.ok ? "House colour saved" : "Need a hex colour (#RGB or #RRGGBB)");
          if (res.ok) loadHouses();
        }}
      >
        <select
          name="houseId"
          className={SELECT}
          value={extraHouseId}
          onChange={(e) => setExtraHouseId(e.target.value)}
        >
          {houses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <Input name="color" placeholder="#RRGGBB" />
        <Input name="description" placeholder="Description" />
        <Button type="submit" size="sm">
          Save colour
        </Button>
      </form>
      <ul className="text-sm">
        {houses.map((h) => (
          <li key={h.id} className="flex items-center gap-2">
            {h.color ? (
              <span
                className="inline-block h-3 w-3 rounded-full border border-[var(--rule)]"
                style={{ background: h.color }}
                aria-hidden
              />
            ) : null}
            <span>
            {h.name}
            {h.description ? ` — ${h.description}` : ""}
            {h.color ? ` ${h.color}` : ""}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/houses/${h.id}`, { method: "DELETE" });
                setMessage(res.ok ? "House removed" : "Could not remove house");
                if (res.ok) loadHouses();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <h2 className="font-display text-2xl">Change house</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          className={SELECT}
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setSectionId(
              classes.find((c) => c.id === e.target.value)?.sections[0]?.id ?? "",
            );
          }}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={SELECT}
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className={SELECT}
          value={houseId}
          onChange={(e) => setHouseId(e.target.value)}
        >
          <option value="none">—</option>
          {houses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left"> </th>
            <th className="text-left">ID</th>
            <th className="text-left">Name</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>
                <input
                  type="checkbox"
                  checked={picked.has(s.id)}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(s.id);
                    else next.delete(s.id);
                    setPicked(next);
                  }}
                />
              </td>
              <td>{s.admissionNo}</td>
              <td>{s.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        size="sm"
        onClick={async () => {
          const res = await fetch("/api/v1/houses/bulk-assign", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              student_ids: [...picked],
              house_id: houseId === "none" ? null : houseId,
            }),
          });
          const payload = await res.json().catch(() => ({}));
          setMessage(
            res.ok
              ? `Updated ${payload.updated ?? 0}`
              : payload.message ?? payload.error ?? "Could not save",
          );
        }}
      >
        Change house
      </Button>
    </div>
  );
}

function NamedMaster({
  path,
  title,
  removable,
}: {
  path: string;
  title: string;
  removable?: boolean;
}) {
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([]);
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
      body: JSON.stringify({ name: form.get("name") }),
    });
    event.currentTarget.reset();
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{title}</h1>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      <form className="flex gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Name" required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>{r.name}</span>
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
    </div>
  );
}

type StaffRow = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
  department?: { name: string } | null;
  designation?: { name: string } | null;
  extra?: {
    category?: string;
    licenseNo?: string;
    licenseExpiry?: string;
  } | null;
  modules?: string[];
  classIds?: string[];
  subjectIds?: string[];
  documents?: Array<{ id: string; name: string; url: string }>;
  login?: {
    id: string;
    username: string;
    isActive: boolean;
    roles: Array<{ id: string; name: string }>;
  } | null;
};

function StaffPanel() {
  const pathname = usePathname();
  const disabledList = pathname.includes("disablestafflist");
  const [status, setStatus] = useState(disabledList ? "inactive" : "active");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "add">(
    pathname.endsWith("/add") ? "add" : "list",
  );
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [designations, setDesignations] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);

  const staffRoles = useMemo(
    () =>
      roles.filter((role) =>
        ["Teacher", "PlatformAdmin", "SuperAdmin", "Principal", "Registrar", "Accountant", "HOD"].includes(
          role.name,
        ),
      ),
    [roles],
  );

  async function load(nextStatus = status, query = q) {
    const params = new URLSearchParams({ status: nextStatus, q: query });
    const [s, d, des, cats, roleJson, classJson, subjectJson] = await Promise.all([
      fetch(`/api/v1/staff?${params}`).then((r) => r.json()),
      fetch("/api/v1/departments").then((r) => r.json()),
      fetch("/api/v1/designations").then((r) => r.json()),
      fetch("/api/v1/staff-categories").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/v1/roles").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/v1/classes").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/v1/subjects").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setRows(s.data ?? []);
    setDepartments(d.data ?? []);
    setDesignations(des.data ?? []);
    setCategories(cats.data ?? []);
    setRoles(roleJson.data ?? []);
    setClasses(classJson.data ?? []);
    setSubjects(subjectJson.data ?? []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      employeeId: form.get("employeeId"),
      firstName: form.get("firstName"),
      lastName: form.get("lastName") || undefined,
      email: form.get("email") || undefined,
      phone: form.get("phone") || undefined,
      departmentId: form.get("departmentId") || undefined,
      designationId: form.get("designationId") || undefined,
      username: form.get("username") || undefined,
      password: form.get("password") || undefined,
      roleId: form.get("roleId") || undefined,
      category: form.get("category") || undefined,
      licenseNo: form.get("licenseNo") || undefined,
      licenseExpiry: form.get("licenseExpiry") || undefined,
      modules: form.getAll("modules").map(String),
      classIds: form.getAll("classIds").map(String),
      subjectIds: form.getAll("subjectIds").map(String),
    };
    const res = await fetch(editing ? `/api/v1/staff/${editing.id}` : "/api/v1/staff", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message ?? json.error ?? "Could not save staff");
      setIssued(null);
      return;
    }
    const loginHint = json.login?.username
      ? ` Login: ${json.login.username}`
      : json.temporaryPassword
        ? ""
        : "";
    const passwordHint = json.temporaryPassword
      ? ` Temporary password: ${json.temporaryPassword}`
      : "";
    setMessage(editing ? "Staff saved" : `Staff saved.${loginHint}${passwordHint}`);
    setIssued(json.temporaryPassword ?? json.inviteToken ?? null);
    event.currentTarget.reset();
    setEditing(null);
    setView("list");
    load();
  }

  async function resetPassword(row: StaffRow) {
    if (!row.login?.id) {
      setMessage("Create a login on Add Staff first");
      return;
    }
    const res = await fetch(`/api/v1/users/${row.login.id}/reset-password`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Could not reset password");
      return;
    }
    setIssued(json.temporaryPassword ?? null);
    setMessage(
      json.temporaryPassword
        ? `Password reset. Share once: ${json.temporaryPassword}`
        : "Password reset",
    );
  }

  async function setActive(row: StaffRow, isActive: boolean) {
    const res = await fetch(`/api/v1/staff/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setMessage(res.ok ? (isActive ? "Staff enabled" : "User id deactivated") : "Could not update");
    if (res.ok) load();
  }

  if (view === "add" || editing) {
    const row = editing;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl">{row ? "Edit staff" : "Add staff"}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Same flow as School Diary: name, phone, password, and role in one save.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEditing(null);
              setView("list");
            }}
          >
            Back to list
          </Button>
        </div>
        {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        {issued ? (
          <p className="break-all text-sm text-[var(--stamp)]">Share once: {issued}</p>
        ) : null}
        <form className="grid max-w-3xl gap-3 sm:grid-cols-3" onSubmit={onSubmit}>
          <Input name="employeeId" placeholder="Staff ID / employee code *" defaultValue={row?.employeeId} required />
          <Input name="firstName" placeholder="First name *" defaultValue={row?.firstName} required />
          <Input name="lastName" placeholder="Last name" defaultValue={row?.lastName ?? ""} />
          <Input name="phone" placeholder="Phone *" defaultValue={row?.phone ?? ""} required={!row} />
          <Input name="email" type="email" placeholder="Email" defaultValue={row?.email ?? ""} />
          <Input name="username" placeholder="Login (phone or staff ID if blank)" defaultValue={row?.login?.username ?? ""} />
          {row ? null : (
            <Input name="password" type="password" placeholder="Password * (min 8)" required />
          )}
          <select name="roleId" className={SELECT} defaultValue={row?.login?.roles[0]?.id ?? ""} required={!row}>
            <option value="">Role *</option>
            {(staffRoles.length ? staffRoles : roles).map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <select name="departmentId" className={SELECT} defaultValue="">
            <option value="">Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select name="designationId" className={SELECT} defaultValue="">
            <option value="">Designation</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select name="category" className={SELECT} defaultValue={row?.extra?.category ?? ""}>
            <option value="">Staff category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <Input name="licenseNo" placeholder="License no (drivers)" defaultValue={row?.extra?.licenseNo ?? ""} />
          <Input name="licenseExpiry" type="date" defaultValue={row?.extra?.licenseExpiry ?? ""} />
          <fieldset className="sm:col-span-3 flex flex-wrap gap-3 text-sm">
            <legend className="mb-1 text-[var(--muted)]">Role modules</legend>
            {STAFF_MODULE_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="modules"
                  value={key}
                  defaultChecked={row?.modules?.includes(key)}
                />
                {key}
              </label>
            ))}
          </fieldset>
          <select name="classIds" className={`${SELECT} sm:col-span-3 min-h-24`} multiple defaultValue={row?.classIds ?? []}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="subjectIds" className={`${SELECT} sm:col-span-3 min-h-24`} multiple defaultValue={row?.subjectIds ?? []}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button type="submit">{row ? "Save staff" : "Add staff"}</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Manage staff</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Add a teacher or platform admin in one form, then reset password or deactivate from the row.
          </p>
        </div>
        <Button type="button" variant="brass" onClick={() => setView("add")}>
          Add new
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["active", "inactive"] as const).map((name) => (
          <Button
            key={name}
            type="button"
            variant={status === name ? "brass" : "ghost"}
            onClick={() => {
              setStatus(name);
              load(name, q);
            }}
          >
            {name === "active" ? "Active" : "Inactive"}
          </Button>
        ))}
      </div>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          load(status, q);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Start typing to filter list…"
        />
        <Button type="submit">Filter</Button>
      </form>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      {issued ? (
        <p className="break-all text-sm text-[var(--stamp)]">Share once: {issued}</p>
      ) : null}
      <div className="overflow-x-auto border border-[var(--rule)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--paper-2)] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Staff ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Login</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--rule)]">
                <td className="px-3 py-2">{r.employeeId}</td>
                <td className="px-3 py-2">
                  {r.firstName} {r.lastName}
                </td>
                <td className="px-3 py-2">{r.login?.username ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.login?.roles.map((role) => role.name).join(", ") || "—"}
                </td>
                <td className="px-3 py-2">{r.phone ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => resetPassword(r)}>
                      Reset password
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={r.isActive === false ? "brass" : "danger"}
                      onClick={() => setActive(r, r.isActive === false)}
                    >
                      {r.isActive === false ? "Enable" : "Deactivate user id"}
                    </Button>
                    <a
                      className="inline-flex h-8 items-center rounded-md px-2 text-xs underline"
                      href={`/api/v1/staff/${r.id}/id-card?format=pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ID card
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="grid max-w-3xl gap-3 sm:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const staffId = String(form.get("staffId") ?? "");
          const res = await fetch(`/api/v1/staff/${staffId}/modules`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              modules: form.getAll("modules").map(String),
            }),
          });
          setMessage(res.ok ? "Modules saved" : "Could not save modules");
          if (res.ok) load();
        }}
      >
        <h2 className="font-display text-2xl sm:col-span-3">Role modules</h2>
        <select name="staffId" className={SELECT} required defaultValue="">
          <option value="" disabled>
            Staff
          </option>
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.firstName} {r.lastName ?? ""} ({r.employeeId})
            </option>
          ))}
        </select>
        <fieldset className="sm:col-span-3 flex flex-wrap gap-3 text-sm">
          {STAFF_MODULE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" name="modules" value={key} />
              {key}
            </label>
          ))}
        </fieldset>
        <Button type="submit">Save modules</Button>
      </form>
      <form
        className="grid max-w-3xl gap-3 sm:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const staffId = String(form.get("staffId") ?? "");
          const classRes = await fetch(`/api/v1/staff/${staffId}/classes`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ classIds: form.getAll("classIds").map(String) }),
          });
          const subjectRes = await fetch(`/api/v1/staff/${staffId}/subjects`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              subjectIds: form.getAll("subjectIds").map(String),
            }),
          });
          setMessage(
            classRes.ok && subjectRes.ok
              ? "Classes and subjects saved"
              : "Could not assign classes or subjects",
          );
          if (classRes.ok && subjectRes.ok) load();
        }}
      >
        <h2 className="font-display text-2xl sm:col-span-3">Assign classes and subjects</h2>
        <select name="staffId" className={SELECT} required defaultValue="">
          <option value="" disabled>
            Staff
          </option>
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.firstName} {r.lastName ?? ""} ({r.employeeId})
            </option>
          ))}
        </select>
        <select name="classIds" className={`${SELECT} sm:col-span-3 min-h-24`} multiple>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="subjectIds" className={`${SELECT} sm:col-span-3 min-h-24`} multiple>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button type="submit">Save assignments</Button>
      </form>
      <form
        className="grid max-w-3xl gap-3 sm:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const staffId = String(form.get("staffId") ?? "");
          let url = "";
          try {
            url = await mediaUrlFromForm(form, "staff", { ownerId: staffId });
          } catch {
            setMessage("Could not upload file");
            return;
          }
          const res = await fetch(`/api/v1/staff/${staffId}/documents`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              url,
            }),
          });
          setMessage(res.ok ? "Document saved" : "HTTPS URL or hosted file required");
          if (res.ok) {
            event.currentTarget.reset();
            load();
          }
        }}
      >
        <h2 className="font-display text-2xl sm:col-span-3">Staff documents</h2>
        <select name="staffId" className={SELECT} required defaultValue="">
          <option value="" disabled>
            Staff
          </option>
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.firstName} {r.lastName ?? ""} ({r.employeeId})
            </option>
          ))}
        </select>
        <Input name="name" placeholder="Document name" required />
        <Input name="url" placeholder="https:// or leave blank if uploading" />
        <Input name="file" type="file" />
        <Button type="submit">Save document</Button>
      </form>
      <ul className="text-sm">
        {rows.flatMap((r) =>
          (r.documents ?? []).map((doc) => (
            <li key={doc.id} className="flex items-center gap-3">
              {r.employeeId} · {doc.name} ·{" "}
              <a className="underline" href={doc.url} target="_blank" rel="noreferrer">
                open
              </a>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const res = await fetch(
                    `/api/v1/staff/${r.id}/documents/${doc.id}`,
                    { method: "DELETE" },
                  );
                  setMessage(res.ok ? "Document removed" : "Could not remove");
                  if (res.ok) load();
                }}
              >
                Remove
              </Button>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

function DriversPanel() {
  type DriverRow = {
    id: string;
    employeeId: string;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    extra?: { licenseNo?: string; licenseExpiry?: string; category?: string } | null;
  };
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const json = await fetch("/api/v1/drivers").then((r) => r.json());
    setRows(json.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/drivers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        employeeId: form.get("employeeId"),
        firstName: form.get("firstName"),
        lastName: form.get("lastName") || undefined,
        phone: form.get("phone") || undefined,
        username: form.get("username") || undefined,
        licenseNo: form.get("licenseNo"),
        licenseExpiry: form.get("licenseExpiry") || undefined,
      }),
    });
    setMessage(res.ok ? "Driver saved" : "Could not save driver");
    if (res.ok) {
      event.currentTarget.reset();
      load();
    }
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Drivers</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-3xl gap-3 sm:grid-cols-3" onSubmit={onSubmit}>
        <Input name="employeeId" placeholder="Staff ID" required />
        <Input name="firstName" placeholder="First name" required />
        <Input name="lastName" placeholder="Last name" />
        <Input name="phone" placeholder="Phone" />
        <Input name="username" placeholder="Login (optional)" />
        <Input name="licenseNo" placeholder="License no" required />
        <Input name="licenseExpiry" type="date" />
        <Button type="submit">Add driver</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {row.employeeId} · {row.firstName} {row.lastName ?? ""}
              {row.extra?.licenseNo ? ` · ${row.extra.licenseNo}` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/drivers/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoticesPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      title: string;
      audience: string;
      channelKind?: string;
      type?: string;
      isPublished?: boolean;
      attachments?: Array<{ id: string; name: string; url: string }>;
      replies?: Array<{ id: string; body: string; authorRole: string }>;
      allowReply?: boolean;
    }>
  >([]);
  const [channels, setChannels] = useState<
    Array<{ id: string; name: string; kind: string }>
  >([]);
  const [receipts, setReceipts] = useState<{
    noticeId: string;
    readCount: number;
    notViewedCount?: number;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    setRows(((await (await fetch("/api/v1/notices?status=all")).json()) as { data: typeof rows }).data ?? []);
  }
  useEffect(() => {
    load();
    fetch("/api/v1/channels")
      .then((r) => r.json())
      .then((j) => setChannels(j.data ?? []))
      .catch(() => setChannels([]));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const channelId = String(form.get("channelId") || "school");
    let attachmentUrl = String(form.get("attachmentUrl") ?? "").trim();
    try {
      attachmentUrl =
        (await mediaUrlFromForm(form, "notice", {
          urlName: "attachmentUrl",
          fileName: "attachmentFile",
        })) || attachmentUrl;
    } catch {
      setMessage("Could not upload attachment");
      return;
    }
    await fetch(`/api/v1/channels/${encodeURIComponent(channelId)}/notices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        body: form.get("body"),
        type: form.get("type") || "news",
        allowReply: form.get("allowReply") === "on",
        hashTag: form.get("hashTag") || undefined,
        isPublished: form.get("publishNow") === "on",
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: String(form.get("attachmentName") ?? "").trim() || undefined,
      }),
    });
    event.currentTarget.reset();
    load();
  }
  async function openReceipts(id: string) {
    const [receiptsJson, notViewed] = await Promise.all([
      fetch(`/api/v1/notices/${id}/reads`).then((r) => r.json()),
      fetch(`/api/v1/notices/${id}/not-viewed`).then((r) => r.json()),
    ]);
    setReceipts({
      noticeId: id,
      readCount: receiptsJson.readCount ?? 0,
      notViewedCount: notViewed.notViewedCount ?? 0,
    });
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Notices</h1>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="title" placeholder="Title" required />
        <textarea
          name="body"
          required
          className="min-h-24 rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
        />
        <select name="channelId" className={SELECT} defaultValue="school">
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </select>
        <select name="type" className={SELECT} defaultValue="news">
          <option value="news">News</option>
          <option value="alert">Alert</option>
          <option value="homework_worksheet">Homework worksheet</option>
          <option value="homework_assignment">Homework assignment</option>
        </select>
        <Input name="hashTag" placeholder="Tag" />
        <Input name="attachmentName" placeholder="Attachment name" />
        <Input name="attachmentUrl" placeholder="https://attachment… or upload" />
        <Input name="attachmentFile" type="file" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allowReply" />
          Allow reply
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="publishNow" />
          Publish now (skip approval)
        </label>
        <Button type="submit">Submit notice</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>
              {r.title} · {r.channelKind ?? r.audience} · {r.type ?? "news"} ·{" "}
              {r.isPublished ? "published" : "pending"}
            </span>
            {r.attachments?.length
              ? r.attachments.map((file) => (
                  <a
                    key={file.id}
                    className="underline underline-offset-4"
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {file.name}
                  </a>
                ))
              : null}
            {r.replies?.length
              ? r.replies.map((row) => (
                  <span key={row.id} className="text-[var(--muted)]">
                    {row.authorRole}: {row.body}
                  </span>
                ))
              : null}
            {r.allowReply || r.isPublished ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const body = String(new FormData(form).get("body") ?? "").trim();
                  if (!body) return;
                  await fetch(`/api/v1/notices/${r.id}/replies`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ body }),
                  });
                  form.reset();
                  load();
                }}
              >
                <Input name="body" placeholder="Staff reply" />
                <Button type="submit" variant="ghost">
                  Reply
                </Button>
              </form>
            ) : null}
            {r.isPublished ? (
              <Button type="button" variant="ghost" onClick={() => openReceipts(r.id)}>
                Read receipts
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  await fetch(`/api/v1/notices/${r.id}/approve`, { method: "POST" });
                  load();
                }}
              >
                Approve
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                await fetch(`/api/v1/notices/${r.id}/delete`, { method: "POST" });
                load();
              }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
      {receipts ? (
        <p className="text-sm text-[var(--muted)]">
          {receipts.readCount} read · {receipts.notViewedCount ?? 0} not viewed.
        </p>
      ) : null}
    </div>
  );
}

function EventsPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; title: string; startsAt: string; classId?: string | null }>
  >([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [remindNote, setRemindNote] = useState<string | null>(null);
  async function load(next = { from, to, classFilter }) {
    const params = new URLSearchParams();
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.classFilter) params.set("class_id", next.classFilter);
    const qs = params.toString();
    setRows(
      ((await (await fetch(`/api/v1/events${qs ? `?${qs}` : ""}`)).json()) as {
        data: typeof rows;
      }).data ?? [],
    );
  }
  useEffect(() => {
    load();
    fetch("/api/v1/classes")
      .then((r) => r.json())
      .then((j) => setClasses(j.data ?? []))
      .catch(() => setClasses([]));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        body: form.get("body") || undefined,
        classId: form.get("classId") || undefined,
        startsAt: form.get("startsAt"),
        endsAt: form.get("endsAt") || undefined,
      }),
    });
    event.currentTarget.reset();
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Campus events</h1>
      <form
        className="grid max-w-xl gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To"
        />
        <select
          className={SELECT}
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All classes</option>
          <option value="none">Whole campus</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" className="sm:col-span-3">
          Filter
        </Button>
      </form>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="title" placeholder="Title" required />
        <textarea
          name="body"
          className="min-h-20 rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
          placeholder="Details"
        />
        <Input name="startsAt" type="datetime-local" required />
        <Input name="endsAt" type="datetime-local" />
        <select name="classId" className={SELECT} defaultValue="">
          <option value="">Whole campus</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit">Add event</Button>
      </form>
      <p className="text-sm text-[var(--muted)]">{remindNote}</p>
      <Button
        type="button"
        variant="ghost"
        onClick={async () => {
          const res = await fetch("/api/v1/events/remind", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ hours: 24 }),
          });
          const json = await res.json();
          setRemindNote(res.ok ? `Reminded ${json.queued}` : "Could not remind");
        }}
      >
        Send due reminders
      </Button>
      <ul className="text-sm">
        {rows.map((r) => {
          const day = String(r.startsAt).slice(0, 10);
          const klass = classes.find((c) => c.id === r.classId)?.name;
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-2">
              <span>
                {day} · {r.title}
                {klass ? ` · ${klass}` : ""} ·{" "}
                {String(r.startsAt).slice(11, 16)}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const res = await fetch(`/api/v1/events/${r.id}`, {
                    method: "DELETE",
                  });
                  setRemindNote(res.ok ? "Event removed" : "Could not remove");
                  if (res.ok) load();
                }}
              >
                Remove
              </Button>
            </li>
          );
        })}
        {!rows.length ? <li className="text-[var(--muted)]">No events yet.</li> : null}
      </ul>
    </div>
  );
}

function SmtpPanel() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState("");
  const [secure, setSecure] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/settings/smtp")
      .then((r) => r.json())
      .then((j) => {
        setHost(j.host ?? "");
        setPort(String(j.port ?? 587));
        setUser(j.user ?? "");
        setFrom(j.from ?? "");
        setSecure(Boolean(j.secure));
        setConfigured(Boolean(j.configured));
      })
      .catch(() => undefined);
  }, []);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/v1/settings/smtp", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        host,
        port: Number(port),
        user,
        from,
        secure,
        ...(pass.trim() ? { pass } : {}),
      }),
    });
    const json = await res.json();
    setMessage(
      res.ok
        ? "SMTP saved. Portal passwords will email on enroll."
        : json.message ?? "Could not save",
    );
    if (res.ok) setConfigured(true);
    setPass("");
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Email (SMTP)</h1>
      <p className="text-sm text-[var(--muted)]">
        {configured
          ? "Mail is configured for this campus (or via SMTP_* env)."
          : "Without SMTP, portal logins are shown on screen and only logged."}
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="smtpHost">Host</Label>
          <Input id="smtpHost" value={host} onChange={(e) => setHost(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="smtpPort">Port</Label>
          <Input id="smtpPort" value={port} onChange={(e) => setPort(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="smtpUser">Username</Label>
          <Input id="smtpUser" value={user} onChange={(e) => setUser(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="smtpPass">Password</Label>
          <Input
            id="smtpPass"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Leave blank to keep current"
          />
        </div>
        <div>
          <Label htmlFor="smtpFrom">From address</Label>
          <Input id="smtpFrom" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={secure}
            onChange={(e) => setSecure(e.target.checked)}
          />
          Use TLS (port 465)
        </label>
        <Button type="submit">Save SMTP</Button>
      </form>
    </div>
  );
}

function SettingsPanel() {
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [dateFormat, setDateFormat] = useState("");
  const [attendanceMode, setAttendanceMode] = useState("daily");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((j) => {
        setName(j.name ?? "");
        setTimezone(j.timezone ?? "");
        setDateFormat(j.dateFormat ?? "");
        setAttendanceMode(j.attendanceMode ?? "daily");
      });
  }, []);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, timezone, dateFormat, attendanceMode }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Campus settings</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="name">Institute name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dateFormat">Date format</Label>
          <Input id="dateFormat" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="attendanceMode">Attendance mode</Label>
          <select
            id="attendanceMode"
            className={SELECT}
            value={attendanceMode}
            onChange={(e) => setAttendanceMode(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="subject">Subject / period</option>
          </select>
        </div>
        <Button type="submit">Save settings</Button>
      </form>
      <AccountPanel />
    </div>
  );
}

function AccountPanel() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="space-y-4 border-t border-[var(--rule)] pt-6">
      <h2 className="font-display text-2xl">My account</h2>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const res = await fetch("/api/v1/users/me", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: form.get("email") }),
          });
          setMessage(res.ok ? "Email saved" : "Could not save email");
        }}
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <Button type="submit" size="sm">
          Save email
        </Button>
      </form>
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const res = await fetch("/api/v1/users/me/password", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              current: form.get("current"),
              next: form.get("next"),
            }),
          });
          setMessage(res.ok ? "Password saved" : "Could not change password");
          if (res.ok) event.currentTarget.reset();
        }}
      >
        <div>
          <Label htmlFor="current">Current password</Label>
          <Input id="current" name="current" type="password" required />
        </div>
        <div>
          <Label htmlFor="next">New password</Label>
          <Input id="next" name="next" type="password" minLength={8} required />
        </div>
        <Button type="submit" size="sm">
          Change password
        </Button>
      </form>
    </div>
  );
}

function LetterheadPanel() {
  const [printHeader, setPrintHeader] = useState("");
  const [printFooter, setPrintFooter] = useState("");
  const [uploadTypes, setUploadTypes] = useState("pdf,jpg,jpeg,png");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((j) => {
        setPrintHeader(j.printHeader ?? "");
        setPrintFooter(j.printFooter ?? "");
        setUploadTypes(j.uploadTypes ?? "pdf,jpg,jpeg,png");
      });
  }, []);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ printHeader, printFooter, uploadTypes }),
    });
    setMessage(res.ok ? "Saved" : "Could not save");
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Print header / footer</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="printHeader">Header</Label>
          <Input
            id="printHeader"
            value={printHeader}
            onChange={(e) => setPrintHeader(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="printFooter">Footer</Label>
          <Input
            id="printFooter"
            value={printFooter}
            onChange={(e) => setPrintFooter(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="uploadTypes">Allowed upload types</Label>
          <Input
            id="uploadTypes"
            value={uploadTypes}
            onChange={(e) => setUploadTypes(e.target.value)}
            placeholder="pdf,jpg,jpeg,png"
          />
        </div>
        <Button type="submit">Save letterhead</Button>
      </form>
    </div>
  );
}

function ModulesPanel() {
  const [rows, setRows] = useState<Array<{ id: string; enabled: boolean }>>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const json = (await (await fetch("/api/v1/modules")).json()) as {
      data?: Array<{ id: string; enabled: boolean }>;
    };
    setRows(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(id: string, enabled: boolean) {
    const res = await fetch("/api/v1/modules", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: id, enabled }),
    });
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    setMessage(res.ok ? "Saved" : (json.message ?? "Could not save"));
    load();
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Modules</h1>
      <p className="text-sm text-[var(--muted)]">
        Optional modules are off in production v1. SuperAdmin can enable them
        for a demo; those screens stay read-only empty states. System Update
        cannot be turned on.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <ul className="divide-y divide-[var(--rule)] border border-[var(--rule)]">
        {rows.map((row) => {
          const locked = row.id === "updater";
          return (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="capitalize">{row.id.replaceAll("-", " ")}</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  disabled={locked}
                  onChange={(event) => toggle(row.id, event.target.checked)}
                />
                {locked ? "Locked off" : row.enabled ? "On" : "Off"}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CctvPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; name: string; room: string; url: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/cctv").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/cctv", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        room: form.get("room"),
        url: form.get("url"),
      }),
    });
    setMessage(res.ok ? "Camera saved" : "HTTPS URL required");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">CCTV cameras</h1>
      <p className="text-sm text-[var(--muted)]">
        Register HTTPS camera pages. Parents see them only when daycare CCTV consent is on. This desk does not stream video.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Hall camera" required />
        <Input name="room" placeholder="Room" />
        <Input name="url" placeholder="https://…" required />
        <Button type="submit">Save camera</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3">
            <span>
              {r.name}
              {r.room ? ` · ${r.room}` : ""} · {r.url}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/cctv/${r.id}`, { method: "DELETE" });
                setMessage(res.ok ? "Camera removed" : "Could not remove");
                load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
