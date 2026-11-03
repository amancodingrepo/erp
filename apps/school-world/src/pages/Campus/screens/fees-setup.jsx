import React, { useEffect, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Screen,
  apiDelete, apiGet, apiPost, apiPut, dateOnly, formObject, money, rowsOf, useList, useStatus
} from "../kit.jsx";

const FEE_TYPE_FLAGS = [["isRefundable", "Refundable"], ["cgst", "CGST"], ["sgst", "SGST"], ["igst", "IGST"], ["visible", "Visible"]];

function feeTypeFlags(form) {
  const data = new FormData(form);
  return Object.fromEntries(FEE_TYPE_FLAGS.map(([key]) => [key, data.get(key) === "on"]));
}

export function FeeTypes() {
  const { rows, error, reload } = useList("/v1/fee-types");
  const [status, run] = useStatus();
  const [typeId, setTypeId] = useState("");
  const selectedId = typeId || rows[0]?.id || "";
  const selected = rows.find((row) => row.id === selectedId);

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const { ok } = await run(
      () => apiPost("/v1/fee-types", { name: values.get("name"), code: values.get("code") || undefined, ...feeTypeFlags(form) }),
      "Fee type saved"
    );
    if (ok) { form.reset(); reload(); }
  }
  async function saveFlags(event) {
    event.preventDefault();
    const { ok } = await run(() => apiPut("/v1/fee-types/" + selectedId, feeTypeFlags(event.currentTarget)), "Flags saved");
    if (ok) reload();
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete("/v1/fee-types/" + id), "Fee type removed");
    if (ok) reload();
  }

  return (
    <Screen title="Fee types" hint="Heads you can bill, such as tuition, transport or exam fees.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add fee type">
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" required /></Field>
          <Field label="Code"><input name="code" /></Field>
          {FEE_TYPE_FLAGS.map(([key, label]) => <Check key={key} name={key} label={label} defaultChecked={key === "visible"} />)}
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      {rows.length > 0 && (
        <Panel title="Edit flags">
          <Form onSubmit={saveFlags}>
            <Field label="Fee type">
              <select value={selectedId} onChange={(event) => setTypeId(event.target.value)}>
                {rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </Field>
            {FEE_TYPE_FLAGS.map(([key, label]) => (
              <Check key={selectedId + key} name={key} label={label} defaultChecked={key === "visible" ? selected?.visible !== false : Boolean(selected?.[key])} />
            ))}
            <Button type="submit">Save flags</Button>
          </Form>
        </Panel>
      )}
      <DataTable
        rows={rows}
        empty="No fee types yet."
        columns={[
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
          { key: "flags", label: "Flags", render: (row) => FEE_TYPE_FLAGS.filter(([key]) => (key === "visible" ? row.visible === false : row[key])).map(([key, label]) => (key === "visible" ? "Hidden" : label)).join(", ") },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

function NamedMaster({ title, hint, path, singular }) {
  const { rows, error, reload } = useList(path);
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const { name } = formObject(event);
    const { ok } = await run(() => apiPost(path, { name }), singular + " saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete(path + "/" + id), singular + " removed");
    if (ok) reload();
  }

  return (
    <Screen title={title} hint={hint}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title={"Add " + singular.toLowerCase()}>
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" required /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable
        rows={rows}
        columns={[
          { key: "name", label: "Name" },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

export function FeeGroups() {
  return <NamedMaster title="Fee groups" hint="Group fee heads so one template can bill them together." path="/v1/fee-groups" singular="Fee group" />;
}

export function FeeInstallments() {
  return <NamedMaster title="Fee installments" hint="Instalment names used when a fee master splits a head over dates." path="/v1/fee-installments" singular="Installment" />;
}

const BLANK_LINE = { feeTypeId: "", amount: "", dueDate: "", installmentId: "" };

export function FeeMasters() {
  const sessions = useList("/v1/sessions");
  const groups = useList("/v1/fee-groups");
  const types = useList("/v1/fee-types");
  const installments = useList("/v1/fee-installments");
  const templates = useList("/v1/fee-templates");
  const [status, run] = useStatus();
  const [lines, setLines] = useState([{ ...BLANK_LINE }]);

  const firstType = types.rows[0]?.id || "";
  const shownLines = lines.map((line) => ({ ...line, feeTypeId: line.feeTypeId || firstType }));
  const loadError = sessions.error || groups.error || types.error || installments.error || templates.error;

  function setLine(index, patch) {
    setLines((current) => current.map((line, at) => (at === index ? { ...shownLines[at], ...patch } : line)));
  }

  async function save(event) {
    event.preventDefault();
    const form = formObject(event);
    const body = {
      sessionId: form.sessionId,
      groupId: form.groupId,
      lines: shownLines
        .filter((line) => line.feeTypeId && Number(line.amount) > 0)
        .map((line) => ({
          feeTypeId: line.feeTypeId,
          amount: Number(line.amount),
          dueDate: line.dueDate || undefined,
          installmentId: line.installmentId || undefined,
        })),
    };
    if (!body.lines.length) { run(async () => { throw new Error("Add at least one fee line with an amount."); }); return; }
    const { ok } = await run(() => apiPost("/v1/fee-templates", body), "Template saved");
    if (ok) { setLines([{ ...BLANK_LINE }]); templates.reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete("/v1/fee-templates/" + id), "Template removed");
    if (ok) templates.reload();
  }

  return (
    <Screen title="Fee master" hint="Build a fee template for a session and fee group, with one line per fee head.">
      <Notice status={{ error: loadError || status.error, message: status.message }} />
      <Panel title="New template">
        <Form onSubmit={save}>
          <Field label="Session">
            <select name="sessionId" required>{sessions.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          </Field>
          <Field label="Fee group">
            <select name="groupId" required>{groups.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          </Field>
          <div className="ck-lines">
            {shownLines.map((line, index) => (
              <div className="ck-line" key={index}>
                <Field label="Fee type">
                  <select value={line.feeTypeId} onChange={(event) => setLine(index, { feeTypeId: event.target.value })}>
                    {types.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </Field>
                <Field label="Installment">
                  <select value={line.installmentId} onChange={(event) => setLine(index, { installmentId: event.target.value })}>
                    <option value="">None</option>
                    {installments.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </Field>
                <Field label="Amount">
                  <input type="number" min="0" step="0.01" value={line.amount} onChange={(event) => setLine(index, { amount: event.target.value })} />
                </Field>
                <Field label="Due date">
                  <input type="date" value={line.dueDate} onChange={(event) => setLine(index, { dueDate: event.target.value })} />
                </Field>
              </div>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setLines((current) => [...current, { ...BLANK_LINE }])}>Add installment line</Button>
          <Button type="submit">Save template</Button>
        </Form>
      </Panel>
      <DataTable
        rows={templates.rows}
        empty="No fee templates yet."
        columns={[
          { key: "group", label: "Group", render: (row) => row.group?.name || "" },
          { key: "installment", label: "Installment" },
          { key: "dueDate", label: "Due", render: (row) => dateOnly(row.dueDate) },
          { key: "lines", label: "Heads", render: (row) => (row.lines || []).map((line) => (line.feeType?.name || "Head") + " " + money(line.amount)).join(" · ") },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

export function AssignFeeMaster() {
  const masters = useList("/v1/fee-templates");
  const classes = useList("/v1/classes");
  const [status, run] = useStatus();

  async function assign(event) {
    event.preventDefault();
    const { masterId, classId } = formObject(event);
    await run(
      () => apiPost("/v1/fee-templates/" + masterId + "/apply", { class_ids: [classId] }),
      (result) => "Created " + (result?.created ?? 0) + " invoices"
    );
  }

  return (
    <Screen title="Assign fee master" hint="Bill every student of a class from a fee template.">
      <Notice status={{ error: masters.error || classes.error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={assign}>
          <Field label="Fee master">
            <select name="masterId" required>{masters.rows.map((row) => <option key={row.id} value={row.id}>{row.group?.name || row.id}</option>)}</select>
          </Field>
          <Field label="Class">
            <select name="classId" required>{classes.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          </Field>
          <Button type="submit">Assign to class</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

export function FeeDiscounts() {
  const { rows, error, reload } = useList("/v1/discount-types");
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formObject(event);
    const { ok } = await run(() => apiPost("/v1/discount-types", {
      name: values.name,
      kind: values.kind,
      percentage: values.kind === "percent" ? Number(values.value) : undefined,
      amount: values.kind === "fixed" ? Number(values.value) : undefined,
    }), "Discount saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete("/v1/discount-types/" + id), "Discount removed");
    if (ok) reload();
  }

  return (
    <Screen title="Fee discounts" hint="Fixed or percentage discounts and scholarships applied at collection.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add discount">
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" required /></Field>
          <Field label="Kind">
            <select name="kind" defaultValue="fixed"><option value="fixed">Fixed</option><option value="percent">Percent</option></select>
          </Field>
          <Field label="Value"><input name="value" type="number" step="0.01" min="0" required /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable
        rows={rows}
        columns={[
          { key: "name", label: "Name" },
          { key: "kind", label: "Kind" },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

export function FineRules() {
  const { rows, error, reload } = useList("/v1/late-fee-rules");
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formObject(event);
    const { ok } = await run(() => apiPost("/v1/late-fee-rules", {
      name: values.name,
      afterDays: Number(values.afterDays),
      kind: values.kind,
      value: Number(values.value),
    }), "Rule saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete("/v1/late-fee-rules/" + id), "Rule removed");
    if (ok) reload();
  }

  return (
    <Screen title="Fine rules" hint="Late fee charged once a due date has passed by the set number of days.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add rule">
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" required /></Field>
          <Field label="After days"><input name="afterDays" type="number" min="0" required /></Field>
          <Field label="Kind">
            <select name="kind" defaultValue="fixed"><option value="fixed">Fixed</option><option value="percent">Percent</option></select>
          </Field>
          <Field label="Value"><input name="value" type="number" step="0.01" min="0" required /></Field>
          <Button type="submit">Add</Button>
        </Form>
      </Panel>
      <DataTable
        rows={rows}
        columns={[
          { key: "name", label: "Name" },
          { key: "afterDays", label: "After days" },
          { key: "kind", label: "Kind" },
          { key: "value", label: "Value" },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}

export function DueFees() {
  const groups = useList("/v1/fee-groups");
  const [rows, setRows] = useState([]);
  const [searched, setSearched] = useState(false);
  const [status, run] = useStatus();

  async function search(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    new FormData(event.currentTarget).getAll("feeGroupIds").forEach((id) => params.append("feeGroupIds[]", String(id)));
    const { ok, result } = await run(() => apiGet("/v1/fees?" + params));
    if (ok) { setRows(rowsOf(result)); setSearched(true); }
  }

  return (
    <Screen title="Search due fees" hint="Pick fee groups to list students who still owe fees.">
      <Notice status={{ error: groups.error || status.error }} />
      <Panel title="Fee groups">
        <Form onSubmit={search}>
          <div className="ck-checklist" style={{ flex: "1 1 100%" }}>
            {groups.rows.map((group) => <Check key={group.id} name="feeGroupIds" value={group.id} label={group.name} />)}
          </div>
          <Button type="submit">Search dues</Button>
        </Form>
      </Panel>
      {searched && (
        <DataTable
          rows={rows}
          empty="No dues for those fee groups."
          rowKey={(row, index) => row.admissionNo + "-" + index}
          columns={[
            { key: "admissionNo", label: "Admission no" },
            { key: "name", label: "Student" },
            { key: "description", label: "Fee" },
            { key: "balance", label: "Balance" },
          ]}
        />
      )}
    </Screen>
  );
}

export function FeeReceipts() {
  const initial = new URLSearchParams(window.location.search).get("receiptNo") || "";
  const [receiptNo, setReceiptNo] = useState(initial);
  const [payload, setPayload] = useState(null);
  const [status, run] = useStatus();

  async function open(number) {
    if (!number) return;
    const { ok, result } = await run(() => apiGet("/v1/fees/receipts/" + encodeURIComponent(number)));
    setPayload(ok ? result : null);
  }
  useEffect(() => { if (initial) open(initial); }, []);

  const view = payload?.view;
  return (
    <Screen title="Fee receipts" hint="Open a receipt by its number and download the PDF.">
      <Notice status={status} />
      <Panel>
        <Form onSubmit={(event) => { event.preventDefault(); open(receiptNo.trim()); }}>
          <Field label="Receipt no"><input value={receiptNo} onChange={(event) => setReceiptNo(event.target.value)} placeholder="Receipt no" /></Field>
          <Button type="submit">Open</Button>
          {view && <a className="ck-btn ck-btn-ghost" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }} href={"/api/v1/fees/receipts/" + encodeURIComponent(view.receiptNo) + "?format=pdf"} target="_blank" rel="noreferrer">PDF</a>}
        </Form>
      </Panel>
      {view && (
        <Panel title={"Receipt " + view.receiptNo}>
          <div className="ck-receipt">
            <dl>
              <div><dt>Student</dt><dd>{view.studentName}</dd></div>
              <div><dt>Admission no</dt><dd>{view.admissionNo}</dd></div>
              <div><dt>Paid on</dt><dd>{view.paidAt}</dd></div>
              <div><dt>Method</dt><dd>{view.method}</dd></div>
              <div><dt>Amount</dt><dd>{money(view.amount)}</dd></div>
              <div><dt>Discount</dt><dd>{money(view.discount)}</dd></div>
              <div><dt>Fine</dt><dd>{money(view.fine)}</dd></div>
              <div><dt>Status</dt><dd>{view.cancelled ? <span className="ck-badge ck-badge-warn">Cancelled</span> : <span className="ck-badge">Paid</span>}</dd></div>
            </dl>
            <DataTable
              rows={view.lines || []}
              rowKey={(row, index) => row.description + index}
              columns={[
                { key: "description", label: "Fee" },
                { key: "amount", label: "Billed", render: (row) => money(row.amount) },
                { key: "paid", label: "Paid", render: (row) => money(row.paid) },
                { key: "balance", label: "Balance", render: (row) => money(row.balance) },
              ]}
            />
          </div>
        </Panel>
      )}
    </Screen>
  );
}

export function DepositSlips() {
  const [slips, setSlips] = useState([]);
  const [undeposited, setUndeposited] = useState([]);
  const [picked, setPicked] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [status, run] = useStatus();

  async function load() {
    try {
      const json = await apiGet("/v1/deposit-slips");
      setSlips(json?.data ?? []);
      setUndeposited(json?.undeposited ?? []);
      setPicked([]);
      setLoadError("");
    } catch (reason) {
      setLoadError(reason.message || "Could not load deposit slips.");
    }
  }
  useEffect(() => { load(); }, []);

  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formObject(event);
    const { ok } = await run(() => apiPost("/v1/deposit-slips", {
      depositedAt: values.depositedAt, bankName: values.bankName, accountRef: values.accountRef, note: values.note, paymentIds: picked,
    }), "Slip saved");
    if (ok) { form.reset(); load(); }
  }
  async function remove(id) {
    const { ok } = await run(() => apiDelete("/v1/deposit-slips/" + id), "Slip removed");
    if (ok) load();
  }
  function toggle(id, on) {
    setPicked((current) => (on ? [...current, id] : current.filter((item) => item !== id)));
  }

  return (
    <Screen title="Deposit slips" hint="Bank cash, cheque and DD collections. Each receipt sits on one slip.">
      <Notice status={{ error: loadError || status.error, message: status.message }} />
      <Panel title="New slip">
        <Form onSubmit={create}>
          <Field label="Deposited on"><input name="depositedAt" type="date" required /></Field>
          <Field label="Bank"><input name="bankName" required /></Field>
          <Field label="Account"><input name="accountRef" /></Field>
          <Field label="Note"><input name="note" /></Field>
          <div className="ck-checklist" style={{ flex: "1 1 100%" }}>
            {undeposited.length === 0 && <span className="ck-empty">No undeposited receipts.</span>}
            {undeposited.map((row) => (
              <Check key={row.id} checked={picked.includes(row.id)} onChange={(event) => toggle(row.id, event.target.checked)}
                label={row.receiptNo + " · " + row.method + " · " + money(row.amount) + " · " + row.studentName} />
            ))}
          </div>
          <Button type="submit" disabled={!picked.length}>Create slip</Button>
        </Form>
      </Panel>
      <DataTable
        rows={slips}
        empty="No deposit slips yet."
        columns={[
          { key: "slipNo", label: "Slip" },
          { key: "depositedAt", label: "Deposited", render: (row) => dateOnly(row.depositedAt) },
          { key: "bankName", label: "Bank" },
          { key: "amount", label: "Amount", render: (row) => money(row.amount) },
          { key: "pdf", label: "", render: (row) => <a href={"/api/v1/deposit-slips/" + row.id + "?format=pdf"} target="_blank" rel="noreferrer">PDF</a> },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row.id)} /> },
        ]}
      />
    </Screen>
  );
}
