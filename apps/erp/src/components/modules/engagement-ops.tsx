"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mediaUrlFromForm } from "@/lib/client-upload";

type Mode =
  | "products"
  | "orders"
  | "kits"
  | "deliveries"
  | "quizzes"
  | "submissions"
  | "reports"
  | "fees-import"
  | "bulk-pay"
  | "photos"
  | "corporates"
  | "diary"
  | "eyfs"
  | "vendors";

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function EngagementOps({ mode }: { mode: Mode }) {
  if (mode === "orders") return <OrdersPanel />;
  if (mode === "kits") return <KitsPanel />;
  if (mode === "deliveries") return <DeliveriesPanel />;
  if (mode === "quizzes") return <QuizzesPanel />;
  if (mode === "submissions") return <SubmissionsPanel />;
  if (mode === "reports") return <ReportsPanel />;
  if (mode === "fees-import") return <CsvPanel kind="fees" />;
  if (mode === "bulk-pay") return <BulkPayPanel />;
  if (mode === "photos") return <CsvPanel kind="photos" />;
  if (mode === "corporates") return <CorporatesPanel />;
  if (mode === "diary") return <DiaryPanel />;
  if (mode === "eyfs") return <EyfsPanel />;
  if (mode === "vendors") return <VendorsPanel />;
  return <ProductsPanel />;
}

function VendorsPanel() {
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const json = await fetch("/api/v1/store/vendors").then((r) => r.json());
    setRows(json.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/store/vendors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    setMessage(res.ok ? "Vendor saved" : "Could not save");
    if (res.ok) event.currentTarget.reset();
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Store vendors</h1>
      <p className="text-sm text-[var(--muted)]">
        Named suppliers used on store products. Adding a product with a new vendor name also records it here.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="flex gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Local press" required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>{row.name}</span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/store/vendors/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Vendor removed" : "Could not remove");
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

function KitsPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      name: string;
      catalog?: { sku: string; price: number; type: string; vendor: string } | null;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const json = await fetch("/api/v1/store/kits").then((r) => r.json());
    setRows(json.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/store/kits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        sku: form.get("sku"),
        price: Number(form.get("price") || 0),
        vendor: form.get("vendor") || undefined,
        stock: Number(form.get("stock") || 0),
      }),
    });
    setMessage(res.ok ? "Kit saved" : "Could not save");
    if (res.ok) event.currentTarget.reset();
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Store kits</h1>
      <p className="text-sm text-[var(--muted)]">
        Kits are store products with type kit. Live inventory plus Setting catalog.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Sports kit" required />
        <Input name="sku" placeholder="SKU" />
        <Input name="price" type="number" placeholder="Price" />
        <Input name="vendor" placeholder="Vendor" />
        <Input name="stock" type="number" placeholder="Opening stock" />
        <Button type="submit">Add kit</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {row.name}
              {row.catalog ? ` · ${row.catalog.sku} · ₹${row.catalog.price}` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/store/kits/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Kit removed" : "Could not remove");
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

function DeliveriesPanel() {
  const [open, setOpen] = useState<
    Array<{ id: string; studentId: string; qty: number; status: string }>
  >([]);
  const [delivered, setDelivered] = useState<
    Array<{ id: string; studentId: string; qty: number; status: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [all, done] = await Promise.all([
      fetch("/api/v1/store/orders").then((r) => r.json()),
      fetch("/api/v1/store/deliveries").then((r) => r.json()),
    ]);
    setOpen(
      (all.data ?? []).filter(
        (row: { status: string }) => row.status !== "delivered",
      ),
    );
    setDelivered(done.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function deliver(orderId: string) {
    const res = await fetch("/api/v1/store/deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });
    setMessage(res.ok ? "Marked delivered" : "Could not deliver");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Store deliveries</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <ul className="space-y-2 text-sm">
        {open.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3">
            <span>
              {row.qty} · {row.status}
            </span>
            <Button type="button" size="sm" onClick={() => deliver(row.id)}>
              Deliver
            </Button>
          </li>
        ))}
        {!open.length ? (
          <li className="text-[var(--muted)]">No open orders.</li>
        ) : null}
      </ul>
      <h2 className="font-display text-2xl">Delivered</h2>
      <ul className="text-sm">
        {delivered.map((row) => (
          <li key={row.id}>
            {row.qty} · {row.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductsPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      name: string;
      catalog?: { sku: string; price: number; type: string; vendor: string } | null;
    }>
  >([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [json, v] = await Promise.all([
      fetch("/api/v1/store/products").then((r) => r.json()),
      fetch("/api/v1/store/vendors").then((r) => r.json()),
    ]);
    setRows(json.data ?? []);
    setVendors(v.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/store/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        sku: form.get("sku"),
        price: Number(form.get("price") || 0),
        type: form.get("type"),
        vendor: String(form.get("vendorCustom") || form.get("vendor") || ""),
        stock: Number(form.get("stock") || 0),
      }),
    });
    setMessage(res.ok ? "Product saved" : "Could not save");
    if (res.ok) event.currentTarget.reset();
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Store products</h1>
      <p className="text-sm text-[var(--muted)]">
        Live inventory items with kit / uniform price. Stock uses the School store.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Sports kit" required />
        <Input name="sku" placeholder="SKU" />
        <Input name="price" type="number" placeholder="Price" />
        <select name="type" className={SELECT} defaultValue="product">
          <option value="product">Product</option>
          <option value="kit">Kit</option>
          <option value="uniform">Uniform</option>
          <option value="bundle">Bundle</option>
        </select>
        <select name="vendor" className={SELECT} defaultValue="">
          <option value="">Vendor</option>
          {vendors.map((row) => (
            <option key={row.id} value={row.name}>
              {row.name}
            </option>
          ))}
        </select>
        <Input name="vendorCustom" placeholder="Or new vendor name" />
        <Input name="stock" type="number" placeholder="Opening stock" />
        <Button type="submit">Add product</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {row.name}
              {row.catalog
                ? ` · ${row.catalog.type} · ${row.catalog.sku} · ₹${row.catalog.price}`
                : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/store/products/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Product removed" : "Could not remove");
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

function OrdersPanel() {
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [orders, setOrders] = useState<
    Array<{ id: string; studentId: string; itemId: string; qty: number; status: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [p, s, o] = await Promise.all([
      fetch("/api/v1/store/products").then((r) => r.json()),
      fetch("/api/v1/students?pageSize=100").then((r) => r.json()),
      fetch("/api/v1/store/orders").then((r) => r.json()),
    ]);
    setProducts(p.data ?? []);
    setStudents(s.data ?? []);
    setOrders(o.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/store/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: form.get("studentId"),
        itemId: form.get("itemId"),
        qty: Number(form.get("qty") || 1),
      }),
    });
    setMessage(res.ok ? "Order saved" : "Could not save");
    load();
  }
  async function deliver(orderId: string) {
    const res = await fetch("/api/v1/store/deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });
    setMessage(res.ok ? "Marked delivered" : "Could not deliver");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Store orders</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="studentId" className={SELECT} required>
          {students.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select name="itemId" className={SELECT} required>
          {products.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Input name="qty" type="number" defaultValue="1" min={1} />
        <Button type="submit">Create order</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {orders.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3">
            <span>
              {row.qty} × {row.itemId.slice(0, 6)} · {row.status}
            </span>
            {row.status === "open" ? (
              <Button type="button" size="sm" onClick={() => deliver(row.id)}>
                Deliver
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmissionsPanel() {
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [formId, setFormId] = useState("");
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [rows, setRows] = useState<
    Array<{ id: string; respondentId: string; createdAt: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function loadForms() {
    const [q, s] = await Promise.all([
      fetch("/api/v1/questionnaires").then((r) => r.json()),
      fetch("/api/v1/students?pageSize=100").then((r) => r.json()),
    ]);
    const data = q.data ?? [];
    setForms(data);
    setStudents(s.data ?? []);
    if (!formId && data[0]?.id) setFormId(data[0].id);
  }
  async function loadRows(id: string) {
    if (!id) {
      setRows([]);
      return;
    }
    const j = await fetch(`/api/v1/questionnaires/${id}/submissions`).then((r) =>
      r.json(),
    );
    setRows(j.data ?? []);
  }
  useEffect(() => {
    loadForms();
  }, []);
  useEffect(() => {
    loadRows(formId);
  }, [formId]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let answers: Record<string, unknown> = {};
    try {
      answers = JSON.parse(String(form.get("answers") ?? "{}"));
    } catch {
      setMessage("Answers must be JSON");
      return;
    }
    const res = await fetch(`/api/v1/questionnaires/${formId}/submissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        student_id: form.get("studentId"),
        assignment_id: form.get("assignmentId") || undefined,
        answers,
      }),
    });
    setMessage(res.ok ? "Submission saved" : "Could not submit");
    if (res.ok) event.currentTarget.reset();
    loadRows(formId);
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Quiz submissions</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <select
        className={SELECT}
        value={formId}
        onChange={(event) => setFormId(event.target.value)}
      >
        {forms.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="studentId" className={SELECT} required>
          <option value="">Student</option>
          {students.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Input name="assignmentId" placeholder="Assignment id (optional)" />
        <textarea
          name="answers"
          rows={4}
          className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
          placeholder='{"fieldId":"answer"}'
          required
        />
        <Button type="submit">Submit</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            {row.respondentId} · {String(row.createdAt).slice(0, 10)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuizzesPanel() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      name: string;
      quiz?: { type: string; totalMarks: number; validFrom: string; validTill: string } | null;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [q, c] = await Promise.all([
      fetch("/api/v1/questionnaires").then((r) => r.json()),
      fetch("/api/v1/classes").then((r) => r.json()),
    ]);
    setRows(q.data ?? []);
    setClasses(c.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const questions = String(form.get("questions") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, marks] = line.split("|");
        return { label: (label ?? "").trim(), marks: Number(marks || 1) };
      });
    const res = await fetch("/api/v1/questionnaires", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        type: "Quiz",
        validFrom: form.get("validFrom"),
        validTill: form.get("validTill"),
        classId: form.get("classId") || undefined,
        questions,
      }),
    });
    setMessage(res.ok ? "Quiz saved" : "Could not save");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Questionnaires</h1>
      <p className="text-sm text-[var(--muted)]">
        One question per line as label|marks. Assign a live class for the validity window.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="title" placeholder="Term 1 quiz" required />
        <Input name="validFrom" type="datetime-local" />
        <Input name="validTill" type="datetime-local" />
        <select name="classId" className={SELECT}>
          <option value="">No class yet</option>
          {classes.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <textarea
          name="questions"
          rows={4}
          className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
          placeholder={"Capital of India|2\nLargest river|3"}
        />
        <Button type="submit">Add quiz</Button>
      </form>
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const id = String(form.get("formId") ?? "");
          const res = await fetch(`/api/v1/questionnaires/${id}/assign`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              class_id: form.get("classId"),
              valid_from: form.get("opensAt") || undefined,
              valid_till: form.get("closesAt") || undefined,
            }),
          });
          setMessage(res.ok ? "Assigned to class" : "Could not assign");
          if (res.ok) event.currentTarget.reset();
        }}
      >
        <h2 className="font-display text-2xl">Assign to class</h2>
        <select name="formId" className={SELECT} required>
          <option value="">Quiz</option>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select name="classId" className={SELECT} required>
          <option value="">Class</option>
          {classes.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Input name="opensAt" type="datetime-local" />
        <Input name="closesAt" type="datetime-local" />
        <Button type="submit">Assign</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {row.name}
              {row.quiz ? ` · ${row.quiz.type} · ${row.quiz.totalMarks} marks` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/questionnaires/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Quiz removed" : "Could not remove");
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

function ReportsPanel() {
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [assigns, setAssigns] = useState<Array<{ sectionId: string; templateId: string }>>([]);
  const [classes, setClasses] = useState<
    Array<{ id: string; name: string; sections: { id: string; name: string }[] }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [t, c] = await Promise.all([
      fetch("/api/v1/report-templates").then((r) => r.json()),
      fetch("/api/v1/classes").then((r) => r.json()),
    ]);
    setTemplates(t.data ?? []);
    setAssigns(t.assigns ?? []);
    setClasses(c.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/report-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        body: form.get("body"),
        section_id: form.get("sectionId") || undefined,
      }),
    });
    setMessage(res.ok ? "Template saved" : "Could not save");
    load();
  }
  const sections = classes.flatMap((klass) =>
    (klass.sections ?? []).map((section) => ({
      id: section.id,
      name: `${klass.name} / ${section.name}`,
    })),
  );
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Report card templates</h1>
      <p className="text-sm text-[var(--muted)]">
        Marks stay on the exam desk. Assign a marksheet body to a live section.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Term 1 card" required />
        <textarea
          name="body"
          required
          rows={5}
          className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
          defaultValue="{{name}} · {{class}} / {{section}} · {{admissionNo}}"
        />
        <select name="sectionId" className={SELECT}>
          <option value="">Save without class</option>
          {sections.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Button type="submit">Save template</Button>
      </form>
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const classId = String(form.get("classId") ?? "");
          const res = await fetch(`/api/v1/classes/${classId}/report-template`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ template_id: form.get("templateId") }),
          });
          setMessage(res.ok ? "Assigned to class sections" : "Need a class and a live template");
          if (res.ok) load();
        }}
      >
        <p className="text-sm text-[var(--muted)]">
          Assign one live marksheet to every section of a class.
        </p>
        <select name="classId" className={SELECT} required>
          <option value="">Class</option>
          {classes.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select name="templateId" className={SELECT} required>
          <option value="">Template</option>
          {templates.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Button type="submit">Assign to class</Button>
      </form>
      <ul className="text-sm">
        {templates.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {row.name}
              {assigns.some((a) => a.templateId === row.id) ? " · assigned" : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/report-templates/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Template removed" : "Could not remove");
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

function CsvPanel({ kind }: { kind: "fees" | "photos" }) {
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const res = await fetch(
      kind === "fees" ? "/api/v1/fees/upload" : "/api/v1/students/photos",
      { method: "POST", body: new FormData(form) },
    );
    const json = await res.json();
    setMessage(
      res.ok
        ? kind === "fees"
          ? `Paid ${json.paid} of ${json.total}`
          : `Updated ${json.updated} of ${json.total}`
        : json.message ?? "Upload failed",
    );
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">
        {kind === "fees" ? "Bulk fee upload" : "Bulk photo upload"}
      </h1>
      <p className="text-sm text-[var(--muted)]">
        {kind === "fees"
          ? "CSV columns: admissionNo, invoiceId, amount, method, paidAt."
          : "CSV columns: admissionNo or scholarNo or enrollmentNo, photoUrl."}
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="file" type="file" accept=".csv,text/csv" required />
        <Button type="submit">Upload</Button>
      </form>
    </div>
  );
}

function BulkPayPanel() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; admissionNo?: string }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/students?pageSize=50")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const method = String(form.get("method") ?? "CASH");
    const payments = rows
      .map((row) => {
        const amount = Number(form.get(`amount-${row.id}`));
        if (!Number.isFinite(amount) || amount <= 0) return null;
        return { studentId: row.id, amount, method };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const res = await fetch("/api/v1/fees/bulk-pay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ payments }),
    });
    const json = await res.json().catch(() => ({}));
    setMessage(
      res.ok
        ? `Paid ${json.paid} of ${json.total}${json.errors?.length ? ` · ${json.errors.length} failed` : ""}`
        : json.message ?? json.error ?? "Bulk pay failed",
    );
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Bulk pay</h1>
      <p className="text-sm text-[var(--muted)]">
        Amounts post through collect onto each student&apos;s first unpaid invoice.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="method" className={SELECT} defaultValue="CASH">
          <option value="CASH">Cash</option>
          <option value="CHEQUE">Cheque</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank transfer</option>
        </select>
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="grid grid-cols-[1fr_7rem] items-center gap-2">
              <span>
                {row.name}
                {row.admissionNo ? ` · ${row.admissionNo}` : ""}
              </span>
              <Input name={`amount-${row.id}`} type="number" min="0" step="0.01" placeholder="0" />
            </li>
          ))}
          {!rows.length ? <li className="text-[var(--muted)]">No students loaded.</li> : null}
        </ul>
        <Button type="submit">Pay selected amounts</Button>
      </form>
    </div>
  );
}

function CorporatesPanel() {
  const [corps, setCorps] = useState<Array<{ id: string; name: string }>>([]);
  const [sponsors, setSponsors] = useState<
    Array<{ studentId: string; corporateId: string; amount: number }>
  >([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [c, s] = await Promise.all([
      fetch("/api/v1/corporates").then((r) => r.json()),
      fetch("/api/v1/students?pageSize=100").then((r) => r.json()),
    ]);
    setCorps(c.data ?? []);
    setSponsors(c.sponsors ?? []);
    setStudents(s.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function addCorp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/corporates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    setMessage(res.ok ? "Corporate saved" : "Could not save");
    load();
  }
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/corporates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: form.get("studentId"),
        corporateId: form.get("corporateId"),
        amount: Number(form.get("amount") || 0),
      }),
    });
    setMessage(res.ok ? "Sponsor assigned" : "Could not assign");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Corporates</h1>
      <p className="text-sm text-[var(--muted)]">
        Sponsored students keep a live student id and a corporate name on fee category.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="flex gap-3" onSubmit={addCorp}>
        <Input name="name" placeholder="Trust / company" required />
        <Button type="submit">Add</Button>
      </form>
      <ul className="text-sm">
        {corps.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>{row.name}</span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/corporates/${row.id}`, {
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
      <form className="grid gap-3" onSubmit={assign}>
        <select name="corporateId" className={SELECT} required>
          {corps.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select name="studentId" className={SELECT} required>
          {students.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Input name="amount" type="number" placeholder="Sponsored amount" />
        <Button type="submit">Assign student</Button>
      </form>
      <ul className="text-sm">
        {sponsors.map((row) => (
          <li key={row.studentId}>
            {row.studentId.slice(0, 8)} · {row.corporateId} · ₹{row.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiaryPanel() {
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      studentId: string;
      kind: string;
      channel?: string;
      url: string;
      caption: string;
      at: string;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [s, d] = await Promise.all([
      fetch("/api/v1/students?pageSize=100").then((r) => r.json()),
      fetch("/api/v1/diary").then((r) => r.json()),
    ]);
    setStudents(s.data ?? []);
    setRows(d.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let url = "";
    try {
      url = await mediaUrlFromForm(form, "diary", {
        ownerId: String(form.get("studentId") ?? ""),
      });
    } catch {
      setMessage("Could not upload file");
      return;
    }
    const res = await fetch("/api/v1/diary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: form.get("studentId"),
        kind: form.get("kind"),
        caption: form.get("caption"),
        channel: form.get("channel") || "student",
        url: url || undefined,
      }),
    });
    setMessage(res.ok ? "Posted" : "HTTPS URL or hosted file required for media");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Student diary</h1>
      <p className="text-sm text-[var(--muted)]">
        Notes plus photo, voice, PDF, or video. Upload a file or paste an HTTPS link. This desk does not send push.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="studentId" className={SELECT} required>
          {students.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select name="kind" className={SELECT} defaultValue="note">
          <option value="note">Note</option>
          <option value="photo">Photo</option>
          <option value="voice">Voice</option>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
        </select>
        <select name="channel" className={SELECT} defaultValue="student">
          <option value="student">Student diary</option>
          <option value="daycare">Daycare diary</option>
        </select>
        <Input name="caption" placeholder="Caption" />
        <Input name="url" placeholder="https://… (or upload below)" />
        <Input name="file" type="file" />
        <Button type="submit">Post to diary</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {students.find((s) => s.id === row.studentId)?.name ?? row.studentId} ·{" "}
              {row.channel === "daycare" ? "daycare" : "student"} · {row.kind}
              {row.caption ? ` · ${row.caption}` : ""}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                await fetch(`/api/v1/diary?id=${row.id}`, { method: "DELETE" });
                load();
              }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EyfsPanel() {
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [areas, setAreas] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      studentId: string;
      area?: string;
      note: string;
      url: string;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [s, a, o] = await Promise.all([
      fetch("/api/v1/students?pageSize=100").then((r) => r.json()),
      fetch("/api/v1/eyfs/areas").then((r) => r.json()),
      fetch("/api/v1/eyfs").then((r) => r.json()),
    ]);
    setStudents(s.data ?? []);
    setAreas(a.data ?? []);
    setRows(o.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/eyfs/areas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    setMessage(res.ok ? "Area saved" : "Area name required");
    event.currentTarget.reset();
    load();
  }
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let url = "";
    try {
      url = await mediaUrlFromForm(form, "eyfs", {
        ownerId: String(form.get("studentId") ?? ""),
      });
    } catch {
      setMessage("Could not upload evidence");
      return;
    }
    const res = await fetch("/api/v1/eyfs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: form.get("studentId"),
        areaId: form.get("areaId"),
        note: form.get("note"),
        url: url || undefined,
      }),
    });
    setMessage(res.ok ? "Posted" : "Need an area, a note, and HTTPS or hosted evidence if linked");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">EYFS</h1>
      <p className="text-sm text-[var(--muted)]">
        Named areas of learning and observation notes. Optional evidence: upload a file or paste an HTTPS link.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onArea}>
        <Input name="name" placeholder="Area name (e.g. Communication and Language)" required />
        <Button type="submit">Save area</Button>
      </form>
      <ul className="text-sm">
        {areas.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>{row.name}</span>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/eyfs/areas/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Area removed" : "Could not remove area");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="studentId" className={SELECT} required>
          {students.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select name="areaId" className={SELECT} required>
          <option value="">Area of learning</option>
          {areas.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <textarea
          name="note"
          required
          className="min-h-20 rounded-md border border-[var(--rule)] bg-[var(--paper)] p-2 text-sm"
          placeholder="Observation"
        />
        <Input name="url" placeholder="https://… (optional evidence)" />
        <Input name="file" type="file" />
        <Button type="submit">Post observation</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {students.find((s) => s.id === row.studentId)?.name ?? row.studentId} ·{" "}
              {row.area} · {row.note}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                await fetch(`/api/v1/eyfs?id=${row.id}`, { method: "DELETE" });
                load();
              }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
