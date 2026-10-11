"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

type Folder = "inbox" | "sent" | "scheduled" | "unseen";
type Row = {
  id: string;
  body: string;
  category: string;
  status: string;
  unread: boolean;
  createdAt: string;
  threadId?: string;
  student?: { firstName: string; lastName?: string | null; admissionNo: string } | null;
  author?: { username: string } | null;
};

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function RequestsOps({
  composer = true,
}: {
  composer?: boolean;
}) {
  const { t } = useI18n();
  const [folder, setFolder] = useState<Folder>("inbox");
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  async function load(next = folder) {
    const params = new URLSearchParams({ box: next });
    if (firstName.trim()) params.set("firstName", firstName.trim());
    if (lastName.trim()) params.set("lastName", lastName.trim());
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    const res = await fetch(`/api/v1/messages?${params.toString()}`);
    const json = await res.json();
    setRows(json.data ?? []);
  }

  useEffect(() => {
    load();
    fetch("/api/v1/students?pageSize=100")
      .then((r) => r.json())
      .then((j) =>
        setStudents(
          (j.data ?? []).map((s: { id: string; name?: string; firstName?: string }) => ({
            id: s.id,
            name: s.name ?? s.firstName ?? s.id,
          })),
        ),
      )
      .catch(() => setStudents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCompose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scheduled = String(form.get("scheduledAt") ?? "").trim();
    const res = await fetch("/api/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        body: form.get("body"),
        studentId: form.get("studentId") || undefined,
        category: form.get("category") || "Others",
        hashTag: form.get("hashTag") || undefined,
        scheduledAt: scheduled || undefined,
      }),
    });
    setMessage(res.ok ? t("Sent") : t("Could not send"));
    if (res.ok) event.currentTarget.reset();
    load(folder);
  }

  async function markRead(id: string) {
    await fetch(`/api/v1/requests/${id}/read`, { method: "POST" });
    load(folder);
  }

  async function sendReply(id: string) {
    const res = await fetch(`/api/v1/messages/${id}/reply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: replyBody }),
    });
    setMessage(res.ok ? t("Sent") : t("Could not send"));
    if (res.ok) {
      setReplyFor(null);
      setReplyBody("");
      load(folder);
    }
  }

  async function reopen(id: string) {
    const res = await fetch(`/api/v1/messages/${id}/reopen`, { method: "POST" });
    setMessage(res.ok ? t("Reopened") : t("Could not send"));
    load(folder);
  }

  async function close(id: string) {
    const res = await fetch(`/api/v1/messages/${id}/close`, { method: "POST" });
    setMessage(res.ok ? t("Closed") : t("Could not send"));
    load(folder);
  }

  const folders: Folder[] = ["inbox", "sent", "scheduled", "unseen"];

  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">{t("Requests")}</h1>
      <p className="text-sm text-[var(--muted)]">
        {t("Parent and office notes. Schedule a later delivery if needed.")}
      </p>
      {message ? <p className="text-sm">{message}</p> : null}
      {composer ? (
        <form className="grid max-w-xl gap-3" onSubmit={onCompose}>
          {students.length ? (
            <div>
              <Label htmlFor="studentId">{t("Student")}</Label>
              <select id="studentId" name="studentId" className={SELECT}>
                <option value="">{t("Select student")}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <Label htmlFor="category">{t("Category")}</Label>
            <select id="category" name="category" className={SELECT} defaultValue="Others">
              {["Fees", "Transport", "Academics", "Uniforms", "Library", "Others"].map(
                (c) => (
                  <option key={c} value={c}>
                    {t(c)}
                  </option>
                ),
              )}
            </select>
          </div>
          <Input name="hashTag" placeholder={t("Tag")} />
          <textarea
            name="body"
            required
            rows={4}
            className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
            placeholder={t("Message")}
          />
          <div>
            <Label htmlFor="scheduledAt">{t("Deliver by")}</Label>
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" />
          </div>
          <Button type="submit">{t("Send")}</Button>
        </form>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <Input
          placeholder={t("First name")}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          placeholder={t("Last name")}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <Button type="button" variant="ghost" onClick={() => load(folder)}>
          {t("Look up")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {folders.map((f) => (
          <button
            key={f}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              folder === f ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-2)]"
            }`}
            onClick={() => {
              setFolder(f);
              load(f);
            }}
          >
            {t(f)}
          </button>
        ))}
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li
            key={row.id}
            className="border border-[var(--rule)] bg-[var(--paper-2)] p-3"
          >
            <p className="font-medium">
              {row.unread ? "● " : ""}
              {row.student
                ? `${row.student.firstName} ${row.student.lastName ?? ""} · ${row.student.admissionNo}`
                : row.author?.username}
              {" · "}
              {row.category} · {row.status}
            </p>
            <p className="mt-1">{row.body}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {row.unread ? (
                <Button variant="ghost" type="button" onClick={() => markRead(row.id)}>
                  {t("Mark read")}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setReplyFor(row.id);
                  setReplyBody("");
                }}
              >
                {t("Reply")}
              </Button>
              {row.status === "CLOSED" ? (
                <Button variant="ghost" type="button" onClick={() => reopen(row.id)}>
                  {t("Reopen")}
                </Button>
              ) : (
                <Button variant="ghost" type="button" onClick={() => close(row.id)}>
                  {t("Close")}
                </Button>
              )}
            </div>
            {replyFor === row.id ? (
              <div className="mt-2 grid gap-2">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
                  placeholder={t("Message")}
                />
                <Button type="button" onClick={() => sendReply(row.id)}>
                  {t("Send")}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
        {!rows.length ? (
          <li className="text-[var(--muted)]">{t("No messages in this folder.")}</li>
        ) : null}
      </ul>
    </div>
  );
}
