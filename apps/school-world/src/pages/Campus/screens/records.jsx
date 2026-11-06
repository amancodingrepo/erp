import React, { useMemo, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, Row, Screen, StudentPicker,
  apiCall, dateOnly, money, plural, rowsOf, staffName, titleCase, useLoad, useStatus, useStudentNames
} from "../kit.jsx";
import { moneyLabel } from "../../../school-locale.js";

// Native versions of the screens the old app built from one generic record panel
// (apps/erp/src/components/modules/remaining-screens.tsx -> /api/v1/ops/{collection}).
// The API only lists and creates, so these screens do the same. Where the old config let a record's
// type be typed freely (CMS kind, income vs expense head) the type is fixed per screen here, because a
// blank box silently saved the server default.

const when = (value) => (value ? new Date(value).toLocaleString() : "-");

/* ------------------------------------------------------------------ engine */

/**
 * fields: [{ name, label, type: text|number|date|datetime|textarea|select|student|checks, required,
 *            placeholder, options: [{value,label}] | (data) => [{value,label}], wide, min, step }]
 * fixed: values always sent (e.g. { kind: "EXPENSE" }).
 * paths: extra GET endpoints the options, filters or columns read.
 */
function RecordScreen({ title, hint, collection, fields = [], fixed = {}, paths = [], rowFilter, columns, readOnly, check, done = "Saved", formTitle = "Add", empty = "Nothing here yet.", search, top }) {
  const listPath = "/v1/ops/" + collection;
  const { data, error, reload, loaded } = useLoad([listPath, ...paths]);
  const all = rowsOf(data[listPath]);
  const rows = rowFilter ? all.filter((row) => rowFilter(row, data)) : all;
  const names = useStudentNames(rows.map((row) => row.studentId));
  const [student, setStudent] = useState(null);
  const [q, setQ] = useState("");
  const [status, run] = useStatus();
  const studentField = fields.find((f) => f.type === "student");
  const term = q.trim().toLowerCase();
  const shown = term ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term) || String(names[row.studentId] || "").toLowerCase().includes(term)) : rows;

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const body = { ...fixed };
    for (const field of fields) {
      if (field.type === "student") { if (student) body[field.name] = student.id; continue; }
      if (field.type === "checks") { const picked = values.getAll(field.name).map(String); if (picked.length) body[field.name] = picked; continue; }
      if (field.type === "bool") { body[field.name] = values.get(field.name) === "on"; continue; }
      const raw = values.get(field.name);
      if (raw == null || String(raw).trim() === "") continue;
      body[field.name] = field.type === "number" ? Number(raw) : String(raw).trim();
    }
    if (studentField?.required && !student) { run(() => Promise.reject(new Error("Select a student first."))); return; }
    const problem = check ? check(body, { rows: all, data }) : null;
    if (problem === false) return;
    if (problem) { run(() => Promise.reject(new Error(problem))); return; }
    const { ok } = await run(() => apiCall("POST", listPath, body), typeof done === "function" ? (json) => done(json, body) : done);
    if (ok) { form.reset(); setStudent(null); reload(); }
  }

  const optionsOf = (field) => (typeof field.options === "function" ? field.options(data) : field.options || []);
  return (
    <Screen title={title} hint={hint}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      {top}
      {!readOnly && (
        <Panel title={formTitle}>
          <Form onSubmit={submit}>
            {fields.map((field) => {
              if (field.type === "student") return <StudentPicker key={field.name} value={student} onPick={setStudent} />;
              if (field.type === "bool") return <Check key={field.name} name={field.name} label={field.label} />;
              if (field.type === "checks") {
                const options = optionsOf(field);
                return (
                  <Field key={field.name} label={field.label} wide>
                    {options.length ? <div className="ck-checklist">{options.map((o) => <Check key={o.value} name={field.name} value={o.value} label={o.label} />)}</div> : <div className="ck-empty">{field.emptyText || "Nothing to pick yet."}</div>}
                  </Field>
                );
              }
              const common = { name: field.name, required: field.required, placeholder: field.placeholder };
              let input;
              if (field.type === "select") {
                const options = optionsOf(field);
                input = (
                  <select {...common} defaultValue="" onChange={field.onChange ? (event) => field.onChange(event.target.value) : undefined}>
                    <option value="" disabled={field.required}>{field.required ? (options.length ? "Select" : field.emptyText || "Nothing to pick yet") : "None"}</option>
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                );
              } else if (field.type === "textarea") {
                input = <textarea {...common} rows={field.rows || 4} style={{ height: "auto", padding: 10 }} />;
              } else {
                const type = { number: "number", date: "date", datetime: "datetime-local", url: "url", email: "email", tel: "tel" }[field.type] || "text";
                input = <input {...common} type={type} min={field.min} step={field.step} />;
              }
              return <Field key={field.name} label={field.label} wide={field.wide || field.type === "textarea"}>{input}</Field>;
            })}
            <Button type="submit">{formTitle === "Add" ? "Save" : formTitle}</Button>
          </Form>
        </Panel>
      )}
      <Panel title={plural(shown.length, "record")} actions={search !== false && rows.length > 8 && <input aria-label="Search" placeholder="Search" value={q} onChange={(event) => setQ(event.target.value)} style={{ height: 34, borderRadius: 8, border: "1px solid var(--sd-border, #dfe7f1)", padding: "0 10px" }} />}>
        <DataTable rows={shown} empty={loaded ? (term ? "No record matches." : empty) : "Loading…"} columns={columns({ data, names })} />
      </Panel>
    </Screen>
  );
}

const opts = (path, label = (row) => row.name, value = (row) => row.id) => (data) => rowsOf(data[path]).map((row) => ({ value: value(row), label: label(row) }));
const studentCol = { key: "student", label: "Student", render: (row, ctx) => (row.studentId ? ctx.names[row.studentId] || "Loading…" : "-") };
const withCtx = (cols) => (ctx) => cols.map((c) => (c.render && c.render.length > 1 ? { ...c, render: (row) => c.render(row, ctx) } : c));

/* ---------------------------------------------------------------- Canteen */

export function CanteenOutlets() {
  return <RecordScreen title="Canteen master" hint="The canteens or counters that serve food." collection="canteen-outlets"
    fields={[{ name: "name", label: "Canteen name", required: true }, { name: "code", label: "Code" }]}
    check={(b, { rows }) => (rows.some((r) => r.name.toLowerCase() === b.name.toLowerCase()) ? b.name + " already exists." : null)}
    done="Canteen saved" columns={() => [{ key: "name", label: "Canteen" }, { key: "code", label: "Code", render: (r) => r.code || "-" }]} />;
}
export function CanteenMenuTypes() {
  return <RecordScreen title="Menu type master" hint="Meal times such as breakfast, lunch or snacks." collection="canteen-types"
    fields={[{ name: "name", label: "Menu type", placeholder: "Lunch", required: true }]}
    check={(b, { rows }) => (rows.some((r) => r.name.toLowerCase() === b.name.toLowerCase()) ? b.name + " already exists." : null)}
    done="Menu type saved" columns={() => [{ key: "name", label: "Menu type" }]} />;
}
export function CanteenItems() {
  return <RecordScreen title="Food item master" hint="Dishes and their prices." collection="canteen-items"
    fields={[{ name: "name", label: "Item", required: true }, { name: "price", label: moneyLabel("Price"), type: "number", min: 0, step: "0.01", required: true }]}
    done="Item saved" columns={() => [{ key: "name", label: "Item" }, { key: "price", label: "Price", render: (r) => money(r.price) }]} />;
}
export function CanteenMenus() {
  return <RecordScreen title="Menus" hint="What each canteen serves, for which meal and on which day." collection="canteen-menus" formTitle="Add menu"
    paths={["/v1/ops/canteen-outlets", "/v1/ops/canteen-types", "/v1/ops/canteen-items"]}
    fields={[
      { name: "name", label: "Menu name", required: true },
      { name: "outletId", label: "Canteen", type: "select", required: true, options: opts("/v1/ops/canteen-outlets"), emptyText: "Add a canteen first" },
      { name: "menuTypeId", label: "Meal", type: "select", options: opts("/v1/ops/canteen-types") },
      { name: "servedOn", label: "Served on", type: "date" },
      { name: "itemIds", label: "Items", type: "checks", options: opts("/v1/ops/canteen-items", (r) => r.name + " · " + money(r.price)), emptyText: "Add food items first." },
    ]}
    done="Menu saved"
    columns={({ data }) => {
      const items = rowsOf(data["/v1/ops/canteen-items"]);
      return [
        { key: "name", label: "Menu" },
        { key: "outlet", label: "Canteen", render: (r) => r.outlet?.name || "-" },
        { key: "type", label: "Meal", render: (r) => r.menuType?.name || "-" },
        { key: "servedOn", label: "Served on", render: (r) => dateOnly(r.servedOn) || "Any day" },
        { key: "items", label: "Items", render: (r) => (Array.isArray(r.itemIds) ? r.itemIds : []).map((id) => items.find((i) => i.id === id)?.name).filter(Boolean).join(", ") || "-" },
      ];
    }} />;
}
export function CanteenCoupons() {
  return <RecordScreen title="Create coupon" hint="Prepaid meal coupons. Each code can be used once." collection="canteen-coupons" formTitle="Create coupon"
    fields={[{ name: "code", label: "Coupon code", required: true, placeholder: "LUNCH-001" }, { name: "amount", label: moneyLabel("Value"), type: "number", min: 0, step: "0.01", required: true }, { name: "studentId", label: "Student", type: "student" }]}
    // The API redeems an existing code instead of creating it, so a duplicate would silently spend a coupon.
    check={(b, { rows }) => (rows.some((r) => r.code === b.code.toUpperCase()) ? "Coupon " + b.code.toUpperCase() + " already exists. Use a new code." : null)}
    done="Coupon created"
    columns={withCtx([
      { key: "code", label: "Code" },
      { key: "amount", label: "Value", render: (r) => money(r.amount) },
      studentCol,
      { key: "state", label: "Status", render: (r) => (r.redeemedAt ? <span className="ck-badge ck-badge-warn">Used {when(r.redeemedAt)}</span> : <span className="ck-badge">Unused</span>) },
    ])} />;
}

export function CanteenAuditor() {
  const { data, error, reload, loaded } = useLoad(["/v1/ops/canteen-coupons"]);
  const coupons = rowsOf(data["/v1/ops/canteen-coupons"]);
  const [status, run] = useStatus();
  const used = coupons.filter((c) => c.redeemedAt);
  async function redeem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const code = String(new FormData(form).get("code") || "").trim().toUpperCase();
    const coupon = coupons.find((c) => c.code === code);
    if (!coupon) { run(() => Promise.reject(new Error("No coupon " + code + "."))); return; }
    if (coupon.redeemedAt) { run(() => Promise.reject(new Error(code + " was already used on " + when(coupon.redeemedAt) + "."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/ops/canteen-coupons", { code, redeem: true }), code + " accepted · " + money(coupon.amount));
    if (ok) { form.reset(); reload(); }
  }
  return (
    <Screen title="Canteen auditor" hint="Accept a coupon at the counter. Each coupon works once.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Redeem">
        <Form onSubmit={redeem}>
          <Field label="Coupon code"><input name="code" required autoFocus autoComplete="off" /></Field>
          <Button type="submit">Redeem</Button>
        </Form>
      </Panel>
      <Panel title={plural(used.length, "coupon") + " used · " + money(used.reduce((s, c) => s + Number(c.amount || 0), 0))}>
        <DataTable rows={used} empty={loaded ? "No coupon used yet." : "Loading…"} columns={[
          { key: "code", label: "Code" }, { key: "amount", label: "Value", render: (r) => money(r.amount) }, { key: "redeemedAt", label: "Used", render: (r) => when(r.redeemedAt) },
        ]} />
      </Panel>
    </Screen>
  );
}

/* -------------------------------------------------------- Railway concession */

const railwayColumns = withCtx([
  studentCol,
  { key: "route", label: "From → to", render: (r) => r.fromStation + " → " + r.toStation },
  { key: "className", label: "Class", render: (r) => titleCase(r.className) },
  { key: "period", label: "Period", render: (r) => [dateOnly(r.periodFrom), dateOnly(r.periodTo)].filter(Boolean).join(" to ") || "-" },
  { key: "status", label: "Status", render: (r) => titleCase(r.status) },
  { key: "createdAt", label: "Applied", render: (r) => dateOnly(r.createdAt) },
]);
export function RailwayConcession() {
  return <RecordScreen title="Railway concession" hint="Concession forms for students who travel by train." collection="railway-concessions" formTitle="Add concession"
    fields={[
      { name: "studentId", label: "Student", type: "student", required: true },
      { name: "fromStation", label: "From station", required: true }, { name: "toStation", label: "To station", required: true },
      { name: "className", label: "Class", type: "select", options: [{ value: "SECOND", label: "Second" }, { value: "FIRST", label: "First" }] },
      { name: "periodFrom", label: "Valid from", type: "date" }, { name: "periodTo", label: "Valid to", type: "date" },
    ]}
    check={(b) => (b.periodFrom && b.periodTo && b.periodTo < b.periodFrom ? "The end date is before the start date." : null)}
    done="Concession saved" columns={railwayColumns} />;
}
export function RailwayConcessionReport() {
  return <RecordScreen title="Railway concession report" hint="Every concession on file." collection="railway-concessions" readOnly columns={railwayColumns} />;
}

/* ------------------------------------------------------------ Online course */

export function CourseCategories() {
  return <RecordScreen title="Course category" hint="Groups for online courses." collection="lms-categories"
    fields={[{ name: "name", label: "Category", required: true }]} done="Category saved" columns={() => [{ key: "name", label: "Category" }]} />;
}
export function OnlineCourses() {
  return <RecordScreen title="Online course" hint="Courses students can enrol in." collection="lms-courses" paths={["/v1/ops/lms-categories"]}
    fields={[{ name: "title", label: "Course title", required: true, wide: true }, { name: "categoryId", label: "Category", type: "select", options: opts("/v1/ops/lms-categories") }, { name: "price", label: moneyLabel("Price"), type: "number", min: 0, step: "0.01" }]}
    done="Course saved"
    columns={() => [{ key: "title", label: "Course" }, { key: "category", label: "Category", render: (r) => r.category?.name || "-" }, { key: "price", label: "Price", render: (r) => (Number(r.price) ? money(r.price) : "Free") }, { key: "n", label: "Enrolled", render: (r) => r._count?.enrollments ?? 0 }]} />;
}
const enrolColumns = withCtx([
  { key: "course", label: "Course", render: (r) => r.course?.title || "-" }, studentCol,
  { key: "paid", label: "Payment", render: (r) => (r.paid ? <span className="ck-badge">Paid</span> : <span className="ck-badge ck-badge-warn">Not paid</span>) },
  { key: "createdAt", label: "Enrolled", render: (r) => dateOnly(r.createdAt) },
]);
export function CourseOfflinePayment() {
  return <RecordScreen title="Offline course payment" hint="Enrol a student who paid in person, or mark an existing enrolment paid." collection="lms-enrollments" paths={["/v1/ops/lms-courses"]} formTitle="Record payment"
    fields={[{ name: "courseId", label: "Course", type: "select", required: true, options: opts("/v1/ops/lms-courses", (r) => r.title + (Number(r.price) ? " · " + money(r.price) : "")) }, { name: "studentId", label: "Student", type: "student", required: true }]}
    fixed={{ paid: true }} done="Payment recorded and student enrolled" columns={enrolColumns} />;
}
// Read-only: the old form re-submitted enrolments without "paid", which reset paid ones to unpaid.
export function CourseReport() {
  return <RecordScreen title="Online course report" hint="Who is enrolled in which course, and whether they have paid." collection="lms-enrollments" readOnly columns={enrolColumns} />;
}

function QuestionScreen({ title, hint, collection, parent, parentLabel, parentPath, defaultOptions, marks }) {
  return <RecordScreen title={title} hint={hint} collection={collection} paths={[parentPath]} formTitle="Add question"
    fields={[
      { name: parent, label: parentLabel, type: "select", required: true, options: opts(parentPath, (r) => r.title) },
      { name: "body", label: "Question", type: "textarea", required: true },
      { name: "optionsText", label: "Choices (comma separated)", placeholder: defaultOptions, wide: true },
      { name: "answer", label: "Correct choice", required: true },
      ...(marks ? [{ name: "marks", label: "Marks", type: "number", min: 1 }] : []),
    ]}
    check={(b) => {
      const options = String(b.optionsText || defaultOptions).split(",").map((s) => s.trim()).filter(Boolean);
      delete b.optionsText;
      if (options.length < 2) return "Give at least two choices.";
      if (!options.includes(b.answer)) return "The correct choice must be one of: " + options.join(", ") + ".";
      b.options = [...new Set(options)];
      return null;
    }}
    done="Question saved"
    columns={() => [
      { key: "parent", label: parentLabel, render: (r) => (r.course || r.exam)?.title || "-" },
      { key: "body", label: "Question", render: (r) => String(r.body).slice(0, 120) },
      { key: "options", label: "Choices", render: (r) => (Array.isArray(r.options) ? r.options.join(" · ") : "-") },
      { key: "answer", label: "Answer" },
      ...(marks ? [{ key: "marks", label: "Marks" }] : []),
    ]} />;
}
export function CourseQuestions() {
  return <QuestionScreen title="Course question bank" hint="Quiz questions for online courses." collection="lms-questions" parent="courseId" parentLabel="Course" parentPath="/v1/ops/lms-courses" defaultOptions="Yes, No" />;
}

/* ------------------------------------------------------- Online examinations */

export function OnlineExams() {
  return <RecordScreen title="Online exam" hint="Computer-based tests." collection="cbt-exams"
    fields={[{ name: "title", label: "Exam title", required: true, wide: true }, { name: "durationMin", label: "Minutes", type: "number", min: 1, placeholder: "60" }]}
    done="Exam saved"
    columns={() => [{ key: "title", label: "Exam" }, { key: "durationMin", label: "Minutes" }, { key: "q", label: "Questions", render: (r) => r._count?.questions ?? 0 }, { key: "a", label: "Attempts", render: (r) => r._count?.attempts ?? 0 }]} />;
}
export function OnlineExamQuestions() {
  return <QuestionScreen title="Question bank" hint="Questions for online exams." collection="cbt-questions" parent="examId" parentLabel="Exam" parentPath="/v1/ops/cbt-exams" defaultOptions="A, B, C, D" marks />;
}
export function OnlineExamReport() {
  return <RecordScreen title="Online exam report" hint="Submitted attempts and scores." collection="cbt-attempts" readOnly
    columns={withCtx([{ key: "exam", label: "Exam", render: (r) => r.exam?.title || "-" }, studentCol, { key: "score", label: "Score", render: (r) => (r.score == null ? "-" : String(Number(r.score))) }, { key: "submittedAt", label: "Submitted", render: (r) => when(r.submittedAt || r.createdAt) }])} />;
}

/* --------------------------------------------------------------- Inventory */

const uniqueName = (b, { rows }) => (rows.some((r) => String(r.name).toLowerCase() === String(b.name).toLowerCase()) ? b.name + " already exists." : null);
export function ItemCategories() {
  return <RecordScreen title="Item category" hint="Groups for stock items." collection="item-categories" fields={[{ name: "name", label: "Category", required: true }]} check={uniqueName} done="Category saved" columns={() => [{ key: "name", label: "Category" }]} />;
}
export function ItemStores() {
  return <RecordScreen title="Item store" hint="Places where stock is kept." collection="item-stores" fields={[{ name: "name", label: "Store", required: true }]} check={uniqueName} done="Store saved" columns={() => [{ key: "name", label: "Store" }]} />;
}
export function ItemSuppliers() {
  return <RecordScreen title="Item supplier" hint="Who the school buys stock from." collection="item-suppliers" fields={[{ name: "name", label: "Supplier", required: true }, { name: "phone", label: "Phone", type: "tel" }]} check={uniqueName} done="Supplier saved" columns={() => [{ key: "name", label: "Supplier" }, { key: "phone", label: "Phone", render: (r) => r.phone || "-" }]} />;
}
const stockTotal = (r) => (r.stocks || []).reduce((s, st) => s + Number(st.qty || 0), 0);
export function InventoryItems() {
  return <RecordScreen title="Add item" hint="Things the school keeps in stock." collection="items" paths={["/v1/ops/item-categories"]}
    fields={[{ name: "name", label: "Item", required: true }, { name: "categoryId", label: "Category", type: "select", options: opts("/v1/ops/item-categories") }, { name: "unit", label: "Unit", placeholder: "pcs" }]}
    check={uniqueName} done="Item saved"
    columns={() => [{ key: "name", label: "Item" }, { key: "category", label: "Category", render: (r) => r.category?.name || "-" }, { key: "unit", label: "Unit" }, { key: "qty", label: "In stock", render: (r) => stockTotal(r) }]} />;
}
export function AddItemStock() {
  return <RecordScreen title="Add item stock" hint="Record stock received into a store. It adds to what is already there." collection="item-stock" paths={["/v1/ops/items", "/v1/ops/item-stores"]} formTitle="Add stock"
    fields={[{ name: "itemId", label: "Item", type: "select", required: true, options: opts("/v1/ops/items", (r) => r.name + " (" + r.unit + ")"), emptyText: "Add items first" }, { name: "storeId", label: "Store", type: "select", required: true, options: opts("/v1/ops/item-stores"), emptyText: "Add a store first" }, { name: "qty", label: "Quantity", type: "number", min: 1, required: true }, { name: "note", label: "Note", placeholder: "Invoice no" }]}
    done={(json, b) => "Stock added. " + (json?.qty ?? "") + " now in this store."}
    columns={() => [{ key: "item", label: "Item", render: (r) => r.item?.name || "-" }, { key: "store", label: "Store", render: (r) => r.store?.name || "-" }, { key: "qty", label: "Quantity" }, { key: "note", label: "Last note", render: (r) => r.note || "-" }]} />;
}
export function IssueItem() {
  return <RecordScreen title="Issue item" hint="Give stock out to a student or staff member. It is taken from the chosen store." collection="item-issues" paths={["/v1/ops/items", "/v1/ops/item-stores", "/v1/staff"]} formTitle="Issue"
    fields={[
      { name: "itemId", label: "Item", type: "select", required: true, options: opts("/v1/ops/items", (r) => r.name + " · " + stockTotal(r) + " " + r.unit + " in stock") },
      { name: "storeId", label: "From store", type: "select", required: true, options: opts("/v1/ops/item-stores") },
      { name: "qty", label: "Quantity", type: "number", min: 1, required: true },
      { name: "staffId", label: "To staff", type: "select", options: opts("/v1/staff", staffName) },
      { name: "studentId", label: "Or to student", type: "student" },
    ]}
    check={(b) => (b.staffId && b.studentId ? "Issue to a staff member or a student, not both." : null)}
    done="Item issued"
    columns={withCtx([{ key: "item", label: "Item", render: (r) => r.item?.name || "-" }, { key: "qty", label: "Quantity" }, { key: "to", label: "Issued to", render: (r, ctx) => (r.studentId ? ctx.names[r.studentId] || "Student" : staffName(rowsOf(ctx.data["/v1/staff"]).find((s) => s.id === r.staffId)) || "-") }, { key: "issuedAt", label: "Issued", render: (r) => when(r.issuedAt) }])} />;
}
export function InventoryReport() {
  return <RecordScreen title="Inventory report" hint="Every item and how much is in each store." collection="items" readOnly
    columns={() => [{ key: "name", label: "Item" }, { key: "category", label: "Category", render: (r) => r.category?.name || "-" }, { key: "qty", label: "Total", render: (r) => stockTotal(r) + " " + r.unit }]} />;
}

/* ---------------------------------------------------- Student support, alumni */

export function SupportTopics() {
  return <RecordScreen title="Student support topics" hint="What students can ask for help with." collection="support-topics" fields={[{ name: "name", label: "Topic", required: true }]} check={uniqueName} done="Topic saved" columns={() => [{ key: "name", label: "Topic" }]} />;
}
export function SupportTickets() {
  return <RecordScreen title="Student support list" hint="Help requests raised for or by students." collection="support-tickets" paths={["/v1/ops/support-topics"]} formTitle="Raise request"
    fields={[{ name: "topicId", label: "Topic", type: "select", required: true, options: opts("/v1/ops/support-topics"), emptyText: "Add topics first" }, { name: "title", label: "Subject", required: true, wide: true }, { name: "body", label: "Details", type: "textarea" }, { name: "studentId", label: "Student", type: "student" }]}
    done="Request raised"
    columns={withCtx([{ key: "createdAt", label: "Raised", render: (r) => dateOnly(r.createdAt) }, { key: "topic", label: "Topic", render: (r) => r.topic?.name || "-" }, { key: "title", label: "Subject" }, studentCol, { key: "status", label: "Status", render: (r) => titleCase(r.status) }])} />;
}
const alumniColumns = () => [{ key: "name", label: "Name" }, { key: "year", label: "Batch", render: (r) => r.year || "-" }, { key: "email", label: "Email", render: (r) => r.email || "-" }, { key: "phone", label: "Phone", render: (r) => r.phone || "-" }];
export function Alumni() {
  return <RecordScreen title="Manage alumni" hint="Former students the school keeps in touch with." collection="alumni"
    fields={[{ name: "name", label: "Name", required: true }, { name: "year", label: "Passing year", placeholder: "2024" }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone", type: "tel" }, { name: "studentId", label: "Link to student record", type: "student" }]}
    done="Alumnus saved" columns={alumniColumns} />;
}
export function AlumniReport() {
  return <RecordScreen title="Alumni report" hint="Every alumnus on file." collection="alumni" readOnly columns={alumniColumns} />;
}
export function AlumniEvents() {
  return <RecordScreen title="Alumni events" hint="Reunions and meet-ups." collection="alumni-events" fields={[{ name: "title", label: "Event", required: true }, { name: "heldOn", label: "Date", type: "date" }, { name: "venue", label: "Venue" }]} done="Event saved"
    columns={() => [{ key: "title", label: "Event" }, { key: "heldOn", label: "Date", render: (r) => dateOnly(r.heldOn) || "-" }, { key: "venue", label: "Venue", render: (r) => r.venue || "-" }]} />;
}

/* --------------------------------------------------------------- Front CMS */

function CmsScreen({ title, hint, kind }) {
  return <RecordScreen title={title} hint={hint + " Shown on the public website."} collection="cms-pages" fixed={{ kind }} rowFilter={(r) => (r.kind || "page") === kind} formTitle={"Add " + title.toLowerCase()}
    fields={[{ name: "title", label: "Title", required: true }, { name: "slug", label: "Web address (slug)", placeholder: "annual-day-2026", required: true }, { name: "body", label: kind === "gallery" || kind === "media" || kind === "banner" ? "Image links or text" : "Content", type: "textarea", required: true }]}
    check={(b, { rows }) => {
      b.slug = b.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!b.slug) return "Enter a web address using letters or numbers.";
      return rows.some((r) => r.slug === b.slug) ? "Web address /" + b.slug + " is already used." : null;
    }}
    done="Saved"
    columns={() => [{ key: "title", label: "Title" }, { key: "slug", label: "Address", render: (r) => "/" + r.slug }, { key: "body", label: "Content", render: (r) => String(r.body || "").slice(0, 100) }]} />;
}
export const CmsPages = () => <CmsScreen title="Pages" hint="Website pages such as About or Contact." kind="page" />;
export const CmsNews = () => <CmsScreen title="News" hint="News items." kind="news" />;
export const CmsEvents = () => <CmsScreen title="Events" hint="Upcoming events." kind="event" />;
export const CmsGallery = () => <CmsScreen title="Gallery" hint="Photo albums." kind="gallery" />;
export const CmsBanners = () => <CmsScreen title="Banner images" hint="Homepage banners." kind="banner" />;
export const CmsMedia = () => <CmsScreen title="Media manager" hint="Files and images used on the site." kind="media" />;
export const CmsMenus = () => <CmsScreen title="Menus" hint="Website menu entries." kind="menu" />;

/* -------------------------------------------------------- Income and expense */

function FinanceHeads({ kind }) {
  const label = kind === "EXPENSE" ? "Expense" : "Income";
  return <RecordScreen title={label + " head"} hint={"Categories for " + label.toLowerCase() + " entries."} collection="finance-heads" fixed={{ kind }} rowFilter={(r) => r.kind === kind}
    fields={[{ name: "name", label: label + " head", required: true }]}
    check={(b, { rows }) => (rows.some((r) => r.kind === kind && r.name.toLowerCase() === b.name.toLowerCase()) ? b.name + " already exists." : null)}
    done={label + " head saved"} columns={() => [{ key: "name", label: label + " head" }]} />;
}
export const IncomeHeads = () => <FinanceHeads kind="INCOME" />;
export const ExpenseHeads = () => <FinanceHeads kind="EXPENSE" />;

function FinanceEntries({ kind, searchOnly }) {
  const label = kind === "EXPENSE" ? "Expense" : "Income";
  const [range, setRange] = useState({ from: "", to: "", headId: "" });
  const inRange = (r) => (!range.from || dateOnly(r.entryOn) >= range.from) && (!range.to || dateOnly(r.entryOn) <= range.to) && (!range.headId || r.headId === range.headId);
  return (
    <>
      <RecordScreen top={searchOnly && <FinanceFilter kind={kind} range={range} setRange={setRange} />} title={(searchOnly ? "Search " : "Add ") + label.toLowerCase()} hint={searchOnly ? "Find " + label.toLowerCase() + " entries by date and head." : "Record money " + (kind === "EXPENSE" ? "spent" : "received") + " outside fee collection."}
        collection="finance-entries" paths={["/v1/ops/finance-heads"]} readOnly={searchOnly} formTitle={"Add " + label.toLowerCase()}
        rowFilter={(r) => r.head?.kind === kind && (!searchOnly || inRange(r))}
        fields={[
          { name: "headId", label: label + " head", type: "select", required: true, options: (data) => rowsOf(data["/v1/ops/finance-heads"]).filter((h) => h.kind === kind).map((h) => ({ value: h.id, label: h.name })), emptyText: "Add a " + label.toLowerCase() + " head first" },
          { name: "amount", label: moneyLabel("Amount"), type: "number", min: 0.01, step: "0.01", required: true },
          { name: "entryOn", label: "Date", type: "date", required: true },
          { name: "description", label: "Description", wide: true },
        ]}
        done={label + " recorded"}
        columns={() => [{ key: "entryOn", label: "Date", render: (r) => dateOnly(r.entryOn) }, { key: "head", label: "Head", render: (r) => r.head?.name || "-" }, { key: "amount", label: "Amount", render: (r) => money(r.amount) }, { key: "description", label: "Description", render: (r) => r.description || "-" }]} />
    </>
  );
}
function FinanceFilter({ kind, range, setRange }) {
  const { data } = useLoad(["/v1/ops/finance-heads"]);
  const heads = rowsOf(data["/v1/ops/finance-heads"]).filter((h) => h.kind === kind);
  const set = (name) => (event) => setRange((r) => ({ ...r, [name]: event.target.value }));
  return (
    <Panel title="Filter">
      <Form onSubmit={(event) => event.preventDefault()}>
        <Field label="From"><input type="date" value={range.from} onChange={set("from")} /></Field>
        <Field label="To"><input type="date" value={range.to} onChange={set("to")} /></Field>
        <Field label="Head">
          <select value={range.headId} onChange={set("headId")}>
            <option value="">All heads</option>
            {heads.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </Field>
      </Form>
    </Panel>
  );
}
export const AddIncome = () => <FinanceEntries kind="INCOME" />;
export const SearchIncome = () => <FinanceEntries kind="INCOME" searchOnly />;
export const AddExpense = () => <FinanceEntries kind="EXPENSE" />;
export const SearchExpense = () => <FinanceEntries kind="EXPENSE" searchOnly />;

/* -------------------------------------------------- Placements, CV, activities */

export function TnpCompanies() {
  return <RecordScreen title="Placement companies" hint="Companies that recruit from the school." collection="tnp-companies" fields={[{ name: "name", label: "Company", required: true }, { name: "sector", label: "Sector" }, { name: "contact", label: "Contact" }]} check={uniqueName} done="Company saved"
    columns={() => [{ key: "name", label: "Company" }, { key: "sector", label: "Sector", render: (r) => r.sector || "-" }, { key: "contact", label: "Contact", render: (r) => r.contact || "-" }, { key: "drives", label: "Drives", render: (r) => (r.drives || []).length }]} />;
}
export function TnpDrives() {
  return <RecordScreen title="Training and placements" hint="Placement drives by company." collection="tnp-drives" paths={["/v1/ops/tnp-companies"]} fields={[{ name: "companyId", label: "Company", type: "select", required: true, options: opts("/v1/ops/tnp-companies"), emptyText: "Add a company first" }, { name: "title", label: "Drive", required: true }, { name: "heldOn", label: "Date", type: "date" }]} done="Drive saved"
    columns={() => [{ key: "heldOn", label: "Date", render: (r) => dateOnly(r.heldOn) || "-" }, { key: "company", label: "Company", render: (r) => r.company?.name || "-" }, { key: "title", label: "Drive" }]} />;
}
export function BuildCv() {
  return <RecordScreen title="Build CV" hint="Each student has one CV. Saving again replaces it." collection="resumes" formTitle="Save CV"
    fields={[{ name: "studentId", label: "Student", type: "student", required: true }, { name: "headline", label: "Headline", required: true, wide: true }, { name: "body", label: "CV", type: "textarea", rows: 10, required: true }]}
    check={(b, { rows }) => (rows.some((r) => r.studentId === b.studentId) && !window.confirm("This student already has a CV. Replace it?") ? false : null)}
    done="CV saved" columns={withCtx([studentCol, { key: "headline", label: "Headline" }])} />;
}
export function DownloadCv() {
  const { data, error, loaded } = useLoad(["/v1/ops/resumes"]);
  const rows = rowsOf(data["/v1/ops/resumes"]);
  const names = useStudentNames(rows.map((r) => r.studentId));
  const [open, setOpen] = useState(null);
  function print(row) {
    const w = window.open("", "_blank", "noopener,width=800,height=900");
    if (!w) return;
    const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    w.document.write("<!doctype html><title>CV</title><body style=\"font:15px/1.5 Georgia,serif;max-width:720px;margin:40px auto\"><h1>" + esc(names[row.studentId] || "Student") + "</h1><h3>" + esc(row.headline) + "</h3><div style=\"white-space:pre-wrap\">" + esc(row.body) + "</div></body>");
    w.document.close();
    w.print();
  }
  return (
    <Screen title="Download CV" hint="View or print a student's CV.">
      <Notice status={{ error }} />
      <DataTable rows={rows} empty={loaded ? "No CVs yet." : "Loading…"} columns={[
        { key: "student", label: "Student", render: (r) => names[r.studentId] || "Loading…" },
        { key: "headline", label: "Headline" },
        { key: "act", label: "", render: (r) => <Row><Button variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "View"}</Button><Button variant="ghost" onClick={() => print(r)}>Print / PDF</Button></Row> },
      ]} />
      {rows.filter((r) => r.id === open).map((r) => <Panel key={r.id} title={(names[r.studentId] || "") + " · " + r.headline}><div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div></Panel>)}
    </Screen>
  );
}
const activityColumns = () => [{ key: "heldOn", label: "Date", render: (r) => dateOnly(r.heldOn) || "-" }, { key: "title", label: "Activity" }, { key: "venue", label: "Venue", render: (r) => r.venue || "-" }, { key: "notes", label: "Notes", render: (r) => r.notes || "-" }];
export function AddActivity() {
  return <RecordScreen title="Add activity" hint="School activities and events." collection="activities" fields={[{ name: "title", label: "Activity", required: true }, { name: "heldOn", label: "Date", type: "date" }, { name: "venue", label: "Venue" }, { name: "notes", label: "Notes", type: "textarea" }]} done="Activity saved" columns={activityColumns} />;
}
export function ActivityList() { return <RecordScreen title="Activity list" hint="Every activity on file." collection="activities" readOnly columns={activityColumns} />; }
export function ActivityReport() { return <RecordScreen title="Activity report" hint="Every activity with its date and venue." collection="activities" readOnly columns={activityColumns} />; }

/* ------------------------------------------- Lesson plans, homework, downloads */

const lessonColumns = ({ data }) => {
  const classes = rowsOf(data["/v1/classes"]);
  const subjects = rowsOf(data["/v1/subjects"]);
  return [
    { key: "weekNo", label: "Week", render: (r) => r.weekNo ?? "-" },
    { key: "class", label: "Class", render: (r) => classes.find((c) => c.id === r.classId)?.name || "-" },
    { key: "subject", label: "Subject", render: (r) => subjects.find((s) => s.id === r.subjectId)?.name || "-" },
    { key: "title", label: "Lesson" }, { key: "topic", label: "Topic", render: (r) => r.topic || "-" },
  ];
};
export function LessonPlans() {
  return <RecordScreen title="Lesson plan" hint="Lessons by class, subject and week." collection="lesson-plans" paths={["/v1/classes", "/v1/subjects"]} formTitle="Add lesson"
    fields={[
      { name: "classId", label: "Class", type: "select", options: opts("/v1/classes") }, { name: "subjectId", label: "Subject", type: "select", options: opts("/v1/subjects") },
      { name: "weekNo", label: "Week", type: "number", min: 1 }, { name: "title", label: "Lesson", required: true }, { name: "topic", label: "Topic" }, { name: "body", label: "Plan", type: "textarea" },
    ]}
    done="Lesson saved" columns={lessonColumns} />;
}
export function LessonPlanReport() {
  return <RecordScreen title="Lesson plan report" hint="Every lesson planned, by class and subject." collection="lesson-plans" paths={["/v1/classes", "/v1/subjects"]} readOnly columns={lessonColumns} />;
}

export function AddAssignment() {
  const { data } = useLoad(["/v1/classes", "/v1/subjects"]);
  const classes = rowsOf(data["/v1/classes"]);
  const [classId, setClassId] = useState("");
  const sections = classes.find((c) => c.id === classId)?.sections || [];
  // The old form listed every section in the school; here sections follow the chosen class.
  return <RecordScreen title="Add assignment" hint="Homework for a class section, with a due date." collection="homework" paths={["/v1/classes", "/v1/subjects"]} formTitle="Add assignment"
    fields={[
      { name: "title", label: "Assignment", required: true, wide: true },
      { name: "classPick", label: "Class", type: "select", required: true, options: () => classes.map((c) => ({ value: c.id, label: c.name })), onChange: setClassId },
      { name: "sectionId", label: "Section", type: "select", required: true, options: () => sections.map((s) => ({ value: s.id, label: s.name })), emptyText: "Pick a class first" },
      { name: "subjectId", label: "Subject", type: "select", options: opts("/v1/subjects") },
      { name: "assignedOn", label: "Given on", type: "date", required: true }, { name: "dueOn", label: "Due on", type: "date", required: true },
      { name: "description", label: "Details", type: "textarea" },
    ]}
    check={(b) => {
      b.classId = b.classPick; delete b.classPick;
      if (!classes.find((c) => c.id === b.classId)?.sections?.some((s) => s.id === b.sectionId)) return "Pick a section of the chosen class.";
      return b.dueOn < b.assignedOn ? "The due date is before the date it was given." : null;
    }}
    done="Assignment saved"
    columns={({ data: d }) => {
      const subjects = rowsOf(d["/v1/subjects"]);
      return [
        { key: "class", label: "Class", render: (r) => { const c = classes.find((x) => x.id === r.classId); return (c?.name || "-") + " " + (c?.sections?.find((s) => s.id === r.sectionId)?.name || ""); } },
        { key: "subject", label: "Subject", render: (r) => subjects.find((s) => s.id === r.subjectId)?.name || "-" },
        { key: "title", label: "Assignment" }, { key: "assignedOn", label: "Given", render: (r) => dateOnly(r.assignedOn) }, { key: "dueOn", label: "Due", render: (r) => dateOnly(r.dueOn) },
      ];
    }} />;
}

export function ContentTypes() {
  return <RecordScreen title="Content type" hint="Kinds of shared files, such as notes or syllabus." collection="download-types" fields={[{ name: "name", label: "Content type", required: true }]} check={uniqueName} done="Content type saved" columns={() => [{ key: "name", label: "Content type" }]} />;
}
const contentColumns = () => [{ key: "title", label: "Title" }, { key: "type", label: "Type", render: (r) => r.type?.name || "-" }, { key: "audience", label: "For", render: (r) => titleCase(r.audience) }, { key: "url", label: "Link", render: (r) => <a href={r.url} target="_blank" rel="noreferrer">Open</a> }];
export function UploadContent() {
  return <RecordScreen title="Upload / share content" hint="Share a link to notes, papers or videos." collection="contents" paths={["/v1/ops/download-types"]} formTitle="Share"
    fields={[{ name: "title", label: "Title", required: true }, { name: "url", label: "Link", type: "url", placeholder: "https://", required: true, wide: true }, { name: "typeId", label: "Type", type: "select", options: opts("/v1/ops/download-types") }, { name: "audience", label: "Share with", type: "select", options: [{ value: "all", label: "Everyone" }, { value: "student", label: "Students" }, { value: "staff", label: "Staff" }] }]}
    check={(b) => (/^https?:\/\//i.test(b.url) ? null : "The link must start with http:// or https://.")}
    done="Content shared" columns={contentColumns} />;
}
export function ContentShareList() { return <RecordScreen title="Content share list" hint="Everything shared so far." collection="contents" readOnly columns={contentColumns} />; }

/* -------------------------------------------------------------- Room booking */

export function BookableRooms() {
  return <RecordScreen title="Booking system" hint="Rooms and halls that staff can book." collection="rooms" fields={[{ name: "name", label: "Room", required: true }, { name: "capacity", label: "Seats", type: "number", min: 1, placeholder: "20" }]} check={uniqueName} done="Room saved"
    columns={() => [{ key: "name", label: "Room" }, { key: "capacity", label: "Seats" }, { key: "b", label: "Bookings", render: (r) => (r.bookings || []).length }]} />;
}
const bookingColumns = () => [{ key: "room", label: "Room", render: (r) => r.room?.name || "-" }, { key: "title", label: "For" }, { key: "startAt", label: "From", render: (r) => when(r.startAt) }, { key: "endAt", label: "To", render: (r) => when(r.endAt) }, { key: "status", label: "Status", render: (r) => titleCase(r.status) }];
export function BookRoom() {
  return <RecordScreen title="Booking request" hint="Book a room for a time. Overlapping bookings are flagged before saving." collection="room-bookings" paths={["/v1/ops/rooms"]} formTitle="Book"
    fields={[{ name: "roomId", label: "Room", type: "select", required: true, options: opts("/v1/ops/rooms", (r) => r.name + " · " + r.capacity + " seats"), emptyText: "Add rooms first" }, { name: "title", label: "Purpose", required: true }, { name: "startAt", label: "From", type: "datetime", required: true }, { name: "endAt", label: "To", type: "datetime", required: true }]}
    check={(b, { rows }) => {
      if (new Date(b.endAt) <= new Date(b.startAt)) return "The booking must end after it starts.";
      const clash = rows.find((r) => r.roomId === b.roomId && r.status !== "CANCELLED" && new Date(r.startAt) < new Date(b.endAt) && new Date(b.startAt) < new Date(r.endAt));
      return clash && !window.confirm("This overlaps \"" + clash.title + "\" (" + when(clash.startAt) + " to " + when(clash.endAt) + "). Book anyway?") ? false : null;
    }}
    done="Room booked" columns={bookingColumns} />;
}
export function BookingList() { return <RecordScreen title="Booking request list" hint="Every room booking." collection="room-bookings" readOnly columns={bookingColumns} />; }
