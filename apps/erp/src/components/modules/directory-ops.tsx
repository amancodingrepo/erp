"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

type Mode = "contacts" | "search" | "attendance" | "daycare";

export default function DirectoryOps({ mode }: { mode: Mode }) {
  if (mode === "search") return <SearchUsers />;
  if (mode === "attendance") return <AttendanceDash />;
  if (mode === "daycare") return <DaycareRoster />;
  return <ContactsPanel />;
}

function ContactsPanel() {
  const { t } = useI18n();
  const [audiences, setAudiences] = useState<Array<{ id: string; label: string }>>([]);
  const [audience, setAudience] = useState("all");
  const [gender, setGender] = useState("");
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<
    Array<{
      kind: string;
      name: string;
      designation: string;
      email: string | null;
      phone: string | null;
      studentId?: string;
      staffId?: string;
      feesHref?: string;
    }>
  >([]);
  const [pickedStudents, setPickedStudents] = useState<Set<string>>(new Set());
  const [pickedStaff, setPickedStaff] = useState<Set<string>>(new Set());
  const [listMessage, setListMessage] = useState<string | null>(null);

  async function load(nextAudience = audience) {
    const params = new URLSearchParams({ audience: nextAudience });
    if (gender) params.set("gender", gender);
    if (q.trim()) params.set("q", q.trim());
    const json = await fetch(`/api/v1/contacts?${params}`).then((r) => r.json());
    setAudiences(json.audiences ?? []);
    setPeople(json.people ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{t("Contacts")}</h1>
      <form
        className="grid gap-3 sm:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <div>
          <Label>{t("Audience")}</Label>
          <select
            className={SELECT}
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value);
              load(e.target.value);
            }}
          >
            {audiences.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>{t("Gender")}</Label>
          <select className={SELECT} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">{t("All")}</option>
            <option value="MALE">{t("Male")}</option>
            <option value="FEMALE">{t("Female")}</option>
            <option value="OTHER">{t("Other")}</option>
          </select>
        </div>
        <div>
          <Label>{t("Look up")}</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button type="submit" className="self-end">
          {t("Look up")}
        </Button>
      </form>
      <form
        className="flex max-w-xl flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const res = await fetch("/api/v1/broadcast-lists", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("listName"),
              student_ids: [...pickedStudents],
              staff_ids: [...pickedStaff],
            }),
          });
          setListMessage(res.ok ? "Broadcast list saved" : "Pick people first");
          if (res.ok) load();
        }}
      >
        <Input name="listName" placeholder="Broadcast list name" required />
        <Button type="submit">Save list</Button>
        <p className="text-sm text-[var(--muted)]">{listMessage}</p>
      </form>
      <ul className="space-y-2 text-sm">
        {audiences
          .filter((item) => item.id.startsWith("list:"))
          .map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2">
              <span>{item.label}</span>
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const id = item.id.slice("list:".length);
                  const res = await fetch(`/api/v1/broadcast-lists/${id}`, {
                    method: "DELETE",
                  });
                  setListMessage(res.ok ? "Broadcast list removed" : "Could not remove");
                  if (res.ok) {
                    const nextAudience = audience === item.id ? "all" : audience;
                    if (nextAudience !== audience) setAudience(nextAudience);
                    load(nextAudience);
                  }
                }}
              >
                Remove
              </Button>
            </li>
          ))}
      </ul>
      <ul className="space-y-2 text-sm">
        {people.map((person, i) => (
          <li
            key={`${person.kind}-${person.name}-${i}`}
            className="flex flex-wrap items-center justify-between gap-2 border border-[var(--rule)] bg-[var(--paper-2)] p-3"
          >
            <div>
              {person.studentId || person.staffId ? (
                <label className="mr-2">
                  <input
                    type="checkbox"
                    checked={
                      person.studentId
                        ? pickedStudents.has(person.studentId)
                        : pickedStaff.has(person.staffId!)
                    }
                    onChange={(event) => {
                      if (person.studentId) {
                        const next = new Set(pickedStudents);
                        if (event.target.checked) next.add(person.studentId);
                        else next.delete(person.studentId);
                        setPickedStudents(next);
                      } else if (person.staffId) {
                        const next = new Set(pickedStaff);
                        if (event.target.checked) next.add(person.staffId);
                        else next.delete(person.staffId);
                        setPickedStaff(next);
                      }
                    }}
                  />
                </label>
              ) : null}
              <p className="font-medium">
                {person.name} · {person.designation}
              </p>
              <p className="text-[var(--muted)]">
                {person.kind} · {person.phone ?? "—"} · {person.email ?? "—"}
              </p>
            </div>
            {person.feesHref ? (
              <Link className="underline" href={person.feesHref}>
                {t("Fee details")}
              </Link>
            ) : null}
          </li>
        ))}
        {!people.length ? (
          <li className="text-[var(--muted)]">{t("No contacts in this filter.")}</li>
        ) : null}
      </ul>
    </div>
  );
}

function SearchUsers() {
  const { t } = useI18n();
  const [rows, setRows] = useState<
    Array<{ id: string; name: string; admissionNo: string; href: string; feesHref: string }>
  >([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["q", "firstName", "lastName", "phone", "email", "id"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    if (form.get("exact") === "on") params.set("exact", "1");
    if (form.get("toFees") === "on") params.set("to", "fees");
    const json = await fetch("/api/v1/search/people", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        q: params.get("q") || undefined,
        firstName: params.get("firstName") || undefined,
        lastName: params.get("lastName") || undefined,
        phone: params.get("phone") || undefined,
        email: params.get("email") || undefined,
        enrollment: params.get("id") || undefined,
        exact: params.get("exact") === "1",
        to: params.get("to") === "fees" ? "fees" : undefined,
      }),
    }).then((r) => r.json());
    setRows(json.students ?? []);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{t("Search users")}</h1>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="q" placeholder={t("Name, admission no, receipt no, screen…")} />
        <Input name="firstName" placeholder={t("First name")} />
        <Input name="lastName" placeholder={t("Last name")} />
        <Input name="phone" placeholder={t("Mobile (10 digits)")} />
        <Input name="email" placeholder={t("Student / pupil email")} />
        <Input name="id" placeholder="Scholar / PEN / enrollment" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="exact" /> {t("Exact search")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="toFees" /> {t("Search and go to fees")}
        </label>
        <Button type="submit">{t("Look up")}</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap gap-3">
            <Link className="underline" href={row.href}>
              {row.name} · {row.admissionNo}
            </Link>
            <Link className="underline" href={row.feesHref}>
              {t("Fee details")}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AttendanceDash() {
  const { t } = useI18n();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<{
    percent: number;
    marked: number;
    present: number;
    enrolled?: number;
    notTaken?: number;
    byStatus: Record<string, number>;
  } | null>(null);

  async function load(next = date) {
    const json = await fetch(`/api/v1/attendance/dashboard?date=${next}`).then((r) => r.json());
    setData(json);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statuses = data ? Object.entries(data.byStatus) : [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{t("Attendance dashboard")}</h1>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <div>
          <Label>{t("Date")}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button type="submit">{t("Look up")}</Button>
      </form>
      {data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="em-card p-4">
            <p className="text-sm text-[var(--muted)]">{t("Today's attendance")}</p>
            <p className="text-3xl font-extrabold">{data.percent}%</p>
            <p className="text-sm">
              {data.present}/{data.marked}
            </p>
          </article>
          {data.notTaken != null ? (
            <article className="em-card p-4">
              <p className="text-sm text-[var(--muted)]">{t("Not Taken")}</p>
              <p className="text-3xl font-extrabold">{data.notTaken}</p>
              <p className="text-sm">
                {data.enrolled ?? 0} enrolled
              </p>
            </article>
          ) : null}
          {statuses.map(([status, count]) => (
            <article key={status} className="em-card p-4">
              <p className="text-sm text-[var(--muted)]">{status}</p>
              <p className="text-3xl font-extrabold">{count}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DaycareRoster() {
  const { t } = useI18n();
  const [rows, setRows] = useState<
    Array<{
      studentId: string;
      name: string;
      admissionNo: string;
      lastCheckInAt: string | null;
      lastCheckOutAt: string | null;
    }>
  >([]);

  async function load() {
    const json = await fetch("/api/v1/daycare").then((r) => r.json());
    setRows(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function punch(id: string, action: "check-in" | "check-out") {
    await fetch(`/api/v1/daycare/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ student_id: id }),
    });
    load();
  }

  async function postNote(event: FormEvent<HTMLFormElement>, studentId: string) {
    event.preventDefault();
    const caption = String(new FormData(event.currentTarget).get("caption") ?? "").trim();
    if (!caption) return;
    await fetch("/api/v1/diary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId,
        kind: "note",
        channel: "daycare",
        caption,
      }),
    });
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{t("Daycare")}</h1>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li
            key={row.studentId}
            className="flex flex-wrap items-center justify-between gap-2 border border-[var(--rule)] bg-[var(--paper-2)] p-3"
          >
            <div>
              <p className="font-medium">
                {row.name} · {row.admissionNo}
              </p>
              <p className="text-[var(--muted)]">
                {row.lastCheckInAt ? String(row.lastCheckInAt).slice(0, 16) : "—"} →{" "}
                {row.lastCheckOutAt ? String(row.lastCheckOutAt).slice(0, 16) : "—"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => punch(row.studentId, "check-in")}>
                Check in
              </Button>
              <Button type="button" variant="ghost" onClick={() => punch(row.studentId, "check-out")}>
                Check out
              </Button>
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => postNote(event, row.studentId)}
              >
                <Input name="caption" placeholder="Daycare note" />
                <Button type="submit" variant="ghost">
                  Post note
                </Button>
              </form>
            </div>
          </li>
        ))}
        {!rows.length ? (
          <li className="text-[var(--muted)]">{t("No daycare students enrolled.")}</li>
        ) : null}
      </ul>
    </div>
  );
}
