"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode =
  | "books"
  | "titles"
  | "accessions"
  | "issue"
  | "student-member"
  | "staff-member"
  | "centers"
  | "weedout"
  | "due"
  | "fines"
  | "lost";
const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function LibraryOps({ mode }: { mode: Mode }) {
  if (mode === "issue") return <IssuePanel />;
  if (mode === "student-member") return <MemberPanel kind="student" />;
  if (mode === "staff-member") return <MemberPanel kind="staff" />;
  if (mode === "centers") return <CentersPanel />;
  if (mode === "accessions") return <AccessionsPanel />;
  if (mode === "due") return <DuePanel />;
  if (mode === "fines") return <FinesPanel />;
  if (mode === "lost") return <LostPanel />;
  if (mode === "weedout") return <WeedoutPanel />;
  return <BooksPanel titles={mode === "titles"} />;
}

function BooksPanel({ titles = false }: { titles?: boolean }) {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      title: string;
      available: number;
      qty: number;
      weededQty?: number;
      accessionNo?: string | null;
      center?: string | null;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const path = titles ? "/api/v1/library/titles" : "/api/v1/library/books";
    const j = await fetch(path).then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, [titles]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const path = titles ? "/api/v1/library/titles" : "/api/v1/library/books";
    const res = await fetch(path, {
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
      <h1 className="font-display text-4xl">{titles ? "Library titles" : "Books"}</h1>
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
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>
              {r.accessionNo ? `${r.accessionNo} · ` : ""}
              {r.title} · {r.available}/{r.qty} available
              {r.weededQty ? ` · weeded ${r.weededQty}` : ""}
              {r.center ? ` · ${r.center}` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const path = titles
                  ? `/api/v1/library/titles/${r.id}`
                  : `/api/v1/library/books/${r.id}`;
                const res = await fetch(path, { method: "DELETE" });
                setMessage(res.ok ? "Book removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="grid max-w-xl gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const res = await fetch("/api/v1/library/weedout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              bookId: form.get("bookId"),
              qty: Number(form.get("qty")),
              reason: form.get("reason") || undefined,
            }),
          });
          setMessage(res.ok ? "Weedout saved" : "Could not weedout");
          if (res.ok) {
            event.currentTarget.reset();
            load();
          }
        }}
      >
        <h2 className="font-display text-2xl">Weedout copies</h2>
        <select name="bookId" className={SELECT} required>
          <option value="">Book</option>
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <Input name="qty" type="number" min={1} defaultValue={1} required />
        <Input name="reason" placeholder="Reason" />
        <Button type="submit">Weedout</Button>
      </form>
    </div>
  );
}

function AccessionsPanel() {
  const [books, setBooks] = useState<Array<{ id: string; title: string }>>([]);
  const [rows, setRows] = useState<
    Array<{
      id?: string;
      bookId: string;
      accessionNo: string;
      title?: string | null;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [t, a] = await Promise.all([
      fetch("/api/v1/library/titles").then((r) => r.json()),
      fetch("/api/v1/library/accessions").then((r) => r.json()),
    ]);
    setBooks(t.data ?? []);
    setRows(a.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/library/accessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ book_id: form.get("bookId") }),
    });
    setMessage(res.ok ? "Accession saved" : "Could not save");
    if (res.ok) event.currentTarget.reset();
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Library accessions</h1>
      <p className="text-sm text-[var(--muted)]">
        Accession numbers live in Setting library.accessions on live book titles.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="bookId" className={SELECT} required>
          <option value="">Title</option>
          {books.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </select>
        <Button type="submit">Issue accession</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id ?? row.bookId} className="flex flex-wrap items-center gap-2">
            <span>
              {row.accessionNo}
              {row.title ? ` · ${row.title}` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(
                  `/api/v1/library/accessions/${row.id ?? row.bookId}`,
                  { method: "DELETE" },
                );
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

function DuePanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; title: string; memberNo: string; dueOn: string }>
  >([]);
  async function load() {
    const j = await fetch("/api/v1/library/due").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Overdue issues</h1>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            {row.title} · {row.memberNo} due {String(row.dueOn).slice(0, 10)}
          </li>
        ))}
        {!rows.length ? (
          <li className="text-[var(--muted)]">No overdue issues.</li>
        ) : null}
      </ul>
    </div>
  );
}

function FinesPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      title: string;
      memberNo: string;
      dueOn: string;
      fine: string;
      status: string;
    }>
  >([]);
  async function load() {
    const j = await fetch("/api/v1/library/fines").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Library fines</h1>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={`${row.status}-${row.id}`}>
            {row.title} · {row.memberNo} · ₹{row.fine} · {row.status}
          </li>
        ))}
        {!rows.length ? (
          <li className="text-[var(--muted)]">No fines.</li>
        ) : null}
      </ul>
    </div>
  );
}

function LostPanel() {
  const [books, setBooks] = useState<Array<{ id: string; title: string }>>([]);
  const [rows, setRows] = useState<
    Array<{ id: string; bookId: string; qty: number; reason: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [t, l] = await Promise.all([
      fetch("/api/v1/library/titles").then((r) => r.json()),
      fetch("/api/v1/library/lost").then((r) => r.json()),
    ]);
    setBooks(t.data ?? []);
    setRows(l.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/library/lost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        book_id: form.get("bookId"),
        qty: Number(form.get("qty")),
        note: form.get("reason") || undefined,
      }),
    });
    setMessage(res.ok ? "Lost copy recorded" : "Could not save");
    if (res.ok) event.currentTarget.reset();
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Lost copies</h1>
      <p className="text-sm text-[var(--muted)]">
        Lost copies live in Setting library.lost and reduce available stock.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="bookId" className={SELECT} required>
          <option value="">Title</option>
          {books.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </select>
        <Input name="qty" type="number" min={1} defaultValue={1} required />
        <Input name="reason" placeholder="Note" />
        <Button type="submit">Record lost</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {books.find((b) => b.id === row.bookId)?.title ?? row.bookId} · {row.qty}
              {row.reason ? ` · ${row.reason}` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/library/lost/${row.id}`, {
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

function WeedoutPanel() {
  const [books, setBooks] = useState<Array<{ id: string; title: string }>>([]);
  const [rows, setRows] = useState<
    Array<{ id: string; bookId: string; qty: number; reason: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [t, w] = await Promise.all([
      fetch("/api/v1/library/titles").then((r) => r.json()),
      fetch("/api/v1/library/weedout").then((r) => r.json()),
    ]);
    setBooks(t.data ?? []);
    setRows(w.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/library/weedout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bookId: form.get("bookId"),
        qty: Number(form.get("qty")),
        reason: form.get("reason") || undefined,
      }),
    });
    setMessage(res.ok ? "Weedout saved" : "Could not weedout");
    if (res.ok) event.currentTarget.reset();
    load();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Weedout copies</h1>
      <p className="text-sm text-[var(--muted)]">
        Weedout copies live in Setting library.weedout and reduce available stock.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <select name="bookId" className={SELECT} required>
          <option value="">Title</option>
          {books.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </select>
        <Input name="qty" type="number" min={1} defaultValue={1} required />
        <Input name="reason" placeholder="Reason" />
        <Button type="submit">Weedout</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {books.find((b) => b.id === row.bookId)?.title ?? row.bookId} · {row.qty}
              {row.reason ? ` · ${row.reason}` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/library/weedout/${row.id}`, {
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

function CentersPanel() {
  const [centers, setCenters] = useState<
    Array<{
      id: string;
      name: string;
      createdAt: string;
      deletedAt: string | null;
      status: string;
    }>
  >([]);
  const [books, setBooks] = useState<Array<{ id: string; title: string; center?: string | null }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [c, b] = await Promise.all([
      fetch("/api/v1/library/centers").then((r) => r.json()),
      fetch("/api/v1/library/books").then((r) => r.json()),
    ]);
    setCenters(c.data ?? []);
    setBooks(b.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/library/centers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    setMessage(res.ok ? "Center saved" : "Center name must be unique while active");
    if (res.ok) {
      event.currentTarget.reset();
      load();
    }
  }
  async function onAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/library/centers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bookId: form.get("bookId"),
        centerId: form.get("centerId"),
      }),
    });
    setMessage(res.ok ? "Book assigned" : "Need an active center and a book");
    if (res.ok) load();
  }
  const active = centers.filter((row) => row.status === "active");
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Book centers</h1>
      <p className="text-sm text-[var(--muted)]">
        Named library locations. Deleting a center keeps the name and sets a deletion date.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Center name" required />
        <Button type="submit">Save center</Button>
      </form>
      <form className="grid gap-3" onSubmit={onAssign}>
        <select name="bookId" className={SELECT} required>
          <option value="">Book</option>
          {books.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
              {row.center ? ` · ${row.center}` : ""}
            </option>
          ))}
        </select>
        <select name="centerId" className={SELECT} required>
          <option value="">Center</option>
          {active.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Button type="submit">Assign book</Button>
      </form>
      <ul className="text-sm">
        {centers.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {row.name} · {row.status}
              {row.deletedAt ? ` · deleted ${row.deletedAt.slice(0, 10)}` : ""}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                if (row.status === "active") {
                  const res = await fetch(`/api/v1/library/centers/${row.id}`, {
                    method: "DELETE",
                  });
                  setMessage(res.ok ? "Center removed" : "Could not remove");
                } else {
                  await fetch("/api/v1/library/centers", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ id: row.id, deleted: false }),
                  });
                  setMessage("Center restored");
                }
                load();
              }}
            >
              {row.status === "active" ? "Remove" : "Restore"}
            </Button>
          </li>
        ))}
        {!centers.length ? (
          <li className="text-[var(--muted)]">No book centers yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
