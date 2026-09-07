"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "books" | "issue" | "student-member" | "staff-member";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function LibraryOps({ mode }: { mode: Mode }) {
  if (mode === "issue") return <IssuePanel />;
  if (mode === "student-member") return <MemberPanel kind="student" />;
  if (mode === "staff-member") return <MemberPanel kind="staff" />;
  return <BooksPanel />;
}

function BooksPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; title: string; available: number; qty: number }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/library/books").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/library/books", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        isbn: form.get("isbn") || undefined,
        author: form.get("author") || undefined,
        qty: Number(form.get("qty")),
        rack: form.get("rack") || undefined,
        price: form.get("price") || undefined,
      }),
    });
    setMessage(res.ok ? "Book saved" : "Could not save");
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Books</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <Input name="title" placeholder="Title" required />
        <Input name="isbn" placeholder="ISBN" />
        <Input name="author" placeholder="Author" />
        <Input name="qty" type="number" min={1} defaultValue={1} required />
        <Input name="rack" placeholder="Rack" />
        <Input name="price" placeholder="Price" />
        <Button type="submit">Add book</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.title} · {r.available}/{r.qty} available
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemberPanel({ kind }: { kind: "student" | "staff" }) {
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const url = kind === "staff" ? "/api/v1/staff" : "/api/v1/students?pageSize=100";
    fetch(url)
      .then((r) => r.json())
      .then((j) =>
        setPeople(
          kind === "staff"
            ? (j.data ?? []).map(
                (s: { id: string; firstName: string; lastName?: string }) => ({
                  id: s.id,
                  name: [s.firstName, s.lastName].filter(Boolean).join(" "),
                }),
              )
            : (j.data ?? []),
        ),
      );
  }, [kind]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/library/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        kind === "staff"
          ? { staffId: form.get("personId") }
          : { studentId: form.get("personId") },
      ),
    });
    const json = await res.json();
    setMessage(res.ok ? `Member ${json.memberNo}` : json.message ?? json.error);
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">
        Add {kind} library member
      </h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="personId" className={SELECT} required>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button type="submit">Add member</Button>
      </form>
    </div>
  );
}

function IssuePanel() {
  const [books, setBooks] = useState<Array<{ id: string; title: string; available: number }>>(
    [],
  );
  const [members, setMembers] = useState<Array<{ id: string; memberNo: string; name: string }>>(
    [],
  );
  const [open, setOpen] = useState<Array<{ id: string; title: string; memberNo: string; dueOn: string }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [b, m, i] = await Promise.all([
      fetch("/api/v1/library/books").then((r) => r.json()),
      fetch("/api/v1/library/members").then((r) => r.json()),
      fetch("/api/v1/library/issues").then((r) => r.json()),
    ]);
    setBooks(b.data ?? []);
    setMembers(m.data ?? []);
    setOpen(i.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/library/issues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bookId: form.get("bookId"),
        memberId: form.get("memberId"),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Issued" : json.message ?? json.error);
    load();
  }
  async function ret(id: string) {
    const res = await fetch(`/api/v1/library/issues/${id}/return`, { method: "POST" });
    const json = await res.json();
    setMessage(res.ok ? `Returned, fine ₹${json.fine}` : json.message);
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Issue / return</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="memberId" className={SELECT} required>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.memberNo} {m.name}
            </option>
          ))}
        </select>
        <select name="bookId" className={SELECT} required>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title} ({b.available} left)
            </option>
          ))}
        </select>
        <Button type="submit">Issue</Button>
      </form>
      <ul className="text-sm">
        {open.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            {r.title} · {r.memberNo} due {String(r.dueOn).slice(0, 10)}
            <Button size="sm" variant="ghost" onClick={() => ret(r.id)}>
              Return
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
