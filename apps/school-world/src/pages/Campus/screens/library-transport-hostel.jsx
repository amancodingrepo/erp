import React, { useEffect, useState } from "react";
import {
  Button, Check, DataTable, Field, Form, Notice, Panel, RemoveButton, Row, Screen, StudentPicker,
  apiCall, dateOnly, formObject, money, plural, rowsOf, staffName, useLoad, useStatus
} from "../kit.jsx";

// Ported from apps/erp/src/components/modules/library-ops.tsx and housing-ops.tsx,
// with the same endpoints.

const today = () => new Date().toISOString().slice(0, 10);

/* ================================================================ Library */

export function BookList() {
  const { data, error, reload, loaded } = useLoad(["/v1/library/books"]);
  const books = rowsOf(data["/v1/library/books"]);
  const [q, setQ] = useState("");
  const [status, run] = useStatus();
  const term = q.trim().toLowerCase();
  const shown = term ? books.filter((row) => [row.title, row.author, row.isbn, row.accessionNo, row.rack].some((v) => String(v || "").toLowerCase().includes(term))) : books;

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/library/books", {
      title: v.title, isbn: v.isbn || undefined, author: v.author || undefined, publisher: v.publisher || undefined,
      qty: Number(v.qty), rack: v.rack || undefined, price: v.price || undefined,
    }), "Book saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/library/books/" + row.id), "Book removed");
    if (ok) reload();
  }
  async function weedout(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const book = books.find((row) => row.id === v.bookId);
    const qty = Number(v.qty);
    if (book && qty > Number(book.available)) { run(() => Promise.reject(new Error("Only " + book.available + " copies of " + book.title + " are on the shelf."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/library/weedout", { bookId: v.bookId, qty, reason: v.reason || undefined }), plural(qty, "copy").replace("copys", "copies") + " weeded out");
    if (ok) { form.reset(); reload(); }
  }

  return (
    <Screen title="Book list" hint="The library catalogue with copies on the shelf. Weed out damaged or old copies so they cannot be issued.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add book">
        <Form onSubmit={add}>
          <Field label="Title" wide><input name="title" required /></Field>
          <Field label="Author"><input name="author" /></Field>
          <Field label="Publisher"><input name="publisher" /></Field>
          <Field label="ISBN"><input name="isbn" /></Field>
          <Field label="Copies"><input name="qty" type="number" min="1" defaultValue="1" required /></Field>
          <Field label="Rack"><input name="rack" /></Field>
          <Field label="Price (₹)"><input name="price" type="number" min="0" step="0.01" /></Field>
          <Button type="submit">Add book</Button>
        </Form>
      </Panel>
      <Panel>
        <Form onSubmit={(event) => event.preventDefault()}>
          <Field label="Search" wide><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Title, author, ISBN, accession or rack" /></Field>
        </Form>
      </Panel>
      <DataTable rows={shown} empty={loaded ? (term ? "No book matches." : "No books yet.") : "Loading…"} columns={[
        { key: "accessionNo", label: "Accession", render: (row) => row.accessionNo || "-" },
        { key: "title", label: "Title" },
        { key: "author", label: "Author", render: (row) => row.author || "-" },
        { key: "rack", label: "Rack", render: (row) => row.rack || "-" },
        { key: "copies", label: "On shelf / copies", render: (row) => <Row>{row.available + " / " + row.qty}{Number(row.available) === 0 && <span className="ck-badge ck-badge-warn">None free</span>}</Row> },
        { key: "weeded", label: "Weeded", render: (row) => row.weededQty || 0 },
        { key: "price", label: "Price", render: (row) => (Number(row.price) ? money(row.price) : "-") },
        { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row)} /> },
      ]} />
      <Panel title="Weed out copies">
        <Form onSubmit={weedout}>
          <Field label="Book" wide>
            <select name="bookId" required defaultValue="">
              <option value="" disabled>Select book</option>
              {books.map((row) => <option key={row.id} value={row.id}>{row.title} ({row.available} on shelf)</option>)}
            </select>
          </Field>
          <Field label="Copies"><input name="qty" type="number" min="1" defaultValue="1" required /></Field>
          <Field label="Reason"><input name="reason" placeholder="Damaged" /></Field>
          <Button type="submit">Weed out</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

function memberLabel(row) {
  return (row.memberNo ? row.memberNo + " · " : "") + (row.name || "Member");
}

export function IssueReturn() {
  const { data, error, reload, loaded } = useLoad(["/v1/library/books", "/v1/library/members", "/v1/library/issues"]);
  const books = rowsOf(data["/v1/library/books"]);
  const members = rowsOf(data["/v1/library/members"]);
  const issues = rowsOf(data["/v1/library/issues"]);
  const [memberQ, setMemberQ] = useState("");
  const [status, run] = useStatus();
  const now = today();
  const overdue = issues.filter((row) => dateOnly(row.dueOn) < now).length;
  const memberTerm = memberQ.trim().toLowerCase();
  const memberOptions = memberTerm ? members.filter((row) => memberLabel(row).toLowerCase().includes(memberTerm)) : members;

  async function issue(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const book = books.find((row) => row.id === v.bookId);
    const { ok, result } = await run(() => apiCall("POST", "/v1/library/issues", { bookId: v.bookId, memberId: v.memberId }),
      (json) => (book?.title || "Book") + " issued, due " + dateOnly(json.dueOn));
    if (ok && result) { form.reset(); setMemberQ(""); reload(); }
  }
  async function giveBack(row) {
    const late = dateOnly(row.dueOn) < now;
    if (late && !window.confirm(row.title + " is overdue. Returning it adds a late fine to the member's fee account. Continue?")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/library/issues/" + row.id + "/return"),
      (json) => row.title + " returned" + (Number(json.fine) > 0 ? ". Fine " + money(json.fine) + " added to fees." : "."));
    if (ok) reload();
  }

  return (
    <Screen title="Issue / return" hint="Lend books to members and take them back. Late returns add a fine to the member's fee account.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {loaded && !members.length && <p className="ck-notice ck-notice-error">No library members yet. Add students or staff as members first.</p>}
      <Panel title="Issue a book">
        <Form onSubmit={issue}>
          <Field label="Find member"><input value={memberQ} onChange={(event) => setMemberQ(event.target.value)} placeholder="Member no or name" /></Field>
          <Field label={"Member (" + memberOptions.length + ")"}>
            <select name="memberId" required defaultValue="" key={memberTerm}>
              <option value="" disabled>Select member</option>
              {memberOptions.map((row) => <option key={row.id} value={row.id}>{memberLabel(row)}</option>)}
            </select>
          </Field>
          <Field label="Book" wide>
            <select name="bookId" required defaultValue="">
              <option value="" disabled>Select book</option>
              {books.map((row) => <option key={row.id} value={row.id} disabled={Number(row.available) < 1}>{row.title} ({row.available} on shelf)</option>)}
            </select>
          </Field>
          <Button type="submit">Issue</Button>
        </Form>
      </Panel>
      <Panel title={plural(issues.length, "book") + " out" + (overdue ? " · " + overdue + " overdue" : "")}>
        <DataTable rows={issues} empty={loaded ? "No books are out." : "Loading…"} columns={[
          { key: "title", label: "Book" },
          { key: "memberNo", label: "Member" },
          { key: "dueOn", label: "Due", render: (row) => <Row>{dateOnly(row.dueOn)}{dateOnly(row.dueOn) < now && <span className="ck-badge ck-badge-warn">Overdue</span>}</Row> },
          { key: "act", label: "", render: (row) => <Button variant="ghost" onClick={() => giveBack(row)}>Return</Button> },
        ]} />
      </Panel>
    </Screen>
  );
}

function LibraryMembers({ kind }) {
  const paths = ["/v1/library/members", ...(kind === "staff" ? ["/v1/staff"] : [])];
  const { data, error, reload, loaded } = useLoad(paths);
  const members = rowsOf(data["/v1/library/members"]);
  const staff = rowsOf(data["/v1/staff"]);
  const [student, setStudent] = useState(null);
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const v = formObject(event);
    const body = kind === "staff" ? { staffId: v.staffId } : { studentId: student?.id };
    if (!body.staffId && !body.studentId) return;
    const { ok } = await run(() => apiCall("POST", "/v1/library/members", body), (json) => "Member " + (json.memberNo || "") + " added");
    if (ok) { setStudent(null); event.target.reset?.(); reload(); }
  }

  return (
    <Screen title={kind === "staff" ? "Add staff member" : "Add student member"} hint={"Give a " + (kind === "staff" ? "staff member" : "student") + " a library card so books can be issued to them."}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add member">
        <Form onSubmit={add}>
          {kind === "staff" ? (
            <Field label="Staff">
              <select name="staffId" required defaultValue="">
                <option value="" disabled>Select staff</option>
                {staff.map((row) => <option key={row.id} value={row.id}>{staffName(row)}</option>)}
              </select>
            </Field>
          ) : <StudentPicker value={student} onPick={setStudent} />}
          <Button type="submit" disabled={kind !== "staff" && !student}>Add member</Button>
        </Form>
      </Panel>
      <DataTable rows={members} empty={loaded ? "No members yet." : "Loading…"} columns={[
        { key: "memberNo", label: "Member no" },
        { key: "name", label: "Name" },
      ]} />
    </Screen>
  );
}

export function StudentMembers() { return <LibraryMembers kind="student" />; }
export function StaffMembers() { return <LibraryMembers kind="staff" />; }

/* ============================================================== Transport */

function StopEditor({ route, onSaved }) {
  const [stops, setStops] = useState(() => (route.pickups || []).map((p) => ({ name: p.name, lat: p.lat ?? "", lng: p.lng ?? "", time: p.time ?? "" })));
  const [status, run] = useStatus();
  const patch = (index, value) => setStops((list) => list.map((row, i) => (i === index ? { ...row, ...value } : row)));
  const move = (index, delta) => setStops((list) => {
    const next = list.slice();
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return next;
  });
  async function save() {
    const clean = stops.filter((row) => row.name.trim());
    const { ok } = await run(() => apiCall("PUT", "/v1/routes/" + route.id + "/stops", {
      stops: clean.map((row) => ({ name: row.name.trim(), lat: row.lat === "" ? undefined : row.lat, lng: row.lng === "" ? undefined : row.lng, time: row.time || undefined })),
    }), "Stops saved");
    if (ok) onSaved();
  }
  return (
    <Panel title={"Pickup points · " + route.name} actions={<Row><Button variant="ghost" onClick={() => setStops((list) => [...list, { name: "", lat: "", lng: "", time: "" }])}>Add stop</Button><Button onClick={save}>Save stops</Button></Row>}>
      <Notice status={status} />
      <p style={{ margin: "0 0 8px" }}>Stops run in this order. A stop that students are assigned to is kept even if you remove it here.</p>
      <DataTable rows={stops.map((row, index) => ({ ...row, index }))} rowKey={(row) => row.index} empty="No stops yet." columns={[
        { key: "order", label: "#", render: (row) => row.index + 1 },
        { key: "name", label: "Stop", render: (row) => <input aria-label={"Stop " + (row.index + 1) + " name"} value={row.name} onChange={(event) => patch(row.index, { name: event.target.value })} /> },
        { key: "time", label: "Time", render: (row) => <input aria-label={"Stop " + (row.index + 1) + " time"} type="time" value={row.time} onChange={(event) => patch(row.index, { time: event.target.value })} /> },
        { key: "lat", label: "Latitude", render: (row) => <input aria-label={"Stop " + (row.index + 1) + " latitude"} inputMode="decimal" style={{ width: 100 }} value={row.lat} onChange={(event) => patch(row.index, { lat: event.target.value })} /> },
        { key: "lng", label: "Longitude", render: (row) => <input aria-label={"Stop " + (row.index + 1) + " longitude"} inputMode="decimal" style={{ width: 100 }} value={row.lng} onChange={(event) => patch(row.index, { lng: event.target.value })} /> },
        { key: "act", label: "", render: (row) => (
          <Row>
            <Button variant="ghost" disabled={row.index === 0} onClick={() => move(row.index, -1)} aria-label="Move up">↑</Button>
            <Button variant="ghost" disabled={row.index === stops.length - 1} onClick={() => move(row.index, 1)} aria-label="Move down">↓</Button>
            <Button variant="ghost" onClick={() => setStops((list) => list.filter((_, i) => i !== row.index))}>Remove</Button>
          </Row>
        ) },
      ]} />
    </Panel>
  );
}

export function TransportRoutes() {
  const { data, error, reload, loaded } = useLoad(["/v1/routes"]);
  const routes = rowsOf(data["/v1/routes"]);
  const [openId, setOpenId] = useState(null);
  const [status, run] = useStatus();
  const open = routes.find((row) => row.id === openId);

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const pickups = String(v.pickups || "").split(",").map((s) => s.trim()).filter(Boolean);
    const { ok, result } = await run(() => apiCall("POST", "/v1/routes", { name: v.name, fee_amount: v.feeAmount, pickups }), "Route saved");
    if (ok) { form.reset(); await reload(); if (result?.id) setOpenId(result.id); }
  }
  async function setFee(row) {
    const next = window.prompt("Transport fee for " + row.name + " (₹)", String(row.feeAmount ?? ""));
    if (next == null || next.trim() === "") return;
    if (!(Number(next) >= 0)) { run(() => Promise.reject(new Error("Enter a fee of 0 or more."))); return; }
    const { ok } = await run(() => apiCall("PATCH", "/v1/routes/" + row.id, { feeAmount: next.trim() }), "Fee for " + row.name + " updated. New assignments are charged the new fee.");
    if (ok) reload();
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/routes/" + row.id), "Route removed");
    if (ok) { if (openId === row.id) setOpenId(null); reload(); }
  }

  return (
    <Screen title="Routes and pickup points" hint="Each route has a transport fee and an ordered list of pickup points.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="New route">
        <Form onSubmit={add}>
          <Field label="Route name"><input name="name" placeholder="Route 3" required /></Field>
          <Field label="Transport fee (₹)"><input name="feeAmount" type="number" min="0" step="0.01" required /></Field>
          <Field label="Pickup points" wide><input name="pickups" placeholder="Depot, Market, Station (comma separated)" /></Field>
          <Button type="submit">Add route</Button>
        </Form>
      </Panel>
      <DataTable rows={routes} empty={loaded ? "No routes yet." : "Loading…"} columns={[
        { key: "name", label: "Route" },
        { key: "fee", label: "Fee", render: (row) => money(row.feeAmount) },
        { key: "stops", label: "Pickup points", render: (row) => (row.stopMap || []).join(" → ") || "-" },
        { key: "vehicles", label: "Vehicles", render: (row) => (row.vehicles || []).map((v) => v.registrationNo).join(", ") || "-" },
        { key: "act", label: "", render: (row) => (
          <Row>
            <Button variant="ghost" onClick={() => setOpenId(openId === row.id ? null : row.id)}>{openId === row.id ? "Close stops" : "Edit stops"}</Button>
            <Button variant="ghost" onClick={() => setFee(row)}>Change fee</Button>
            <RemoveButton onRemove={() => remove(row)} />
          </Row>
        ) },
      ]} />
      {open && <StopEditor key={open.id} route={open} onSaved={reload} />}
    </Screen>
  );
}

function dueBadge(label, value) {
  if (!value) return null;
  const date = dateOnly(value);
  const soon = new Date(date) - new Date(today()) < 30 * 86400000;
  return <span key={label} className={"ck-badge" + (soon ? " ck-badge-warn" : "")} title={soon ? "Due within 30 days or overdue" : ""}>{label} {date}</span>;
}

function VehiclesScreen({ assignOnly }) {
  const { data, error, reload, loaded } = useLoad(["/v1/vehicles", "/v1/routes"]);
  const vehicles = rowsOf(data["/v1/vehicles"]);
  const routes = rowsOf(data["/v1/routes"]);
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const reg = v.registrationNo.trim().toUpperCase();
    if (vehicles.some((row) => String(row.registrationNo).toUpperCase() === reg)) { run(() => Promise.reject(new Error(reg + " is already listed."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/vehicles", {
      registration_no: reg, route_id: v.routeId || undefined, insurance_due: v.insuranceDue || undefined, fitness_due: v.fitnessDue || undefined,
      puc_due: v.pucDue || undefined, capacity: v.capacity || undefined, tracker_id: v.trackerId || undefined, cctv: v.cctv === "on", fuel_type: v.fuelType || undefined,
    }), "Vehicle saved");
    if (ok) { form.reset(); reload(); }
  }
  async function assign(row, routeId) {
    const route = routes.find((r) => r.id === routeId);
    const { ok } = await run(() => apiCall("PATCH", "/v1/vehicles/" + row.id, { routeId: routeId || null }), row.registrationNo + (route ? " assigned to " + route.name : " unassigned"));
    if (ok) reload();
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/vehicles/" + row.id), "Vehicle removed");
    if (ok) reload();
  }

  return (
    <Screen title={assignOnly ? "Assign vehicle" : "Vehicles"} hint={assignOnly ? "Put each vehicle on a route." : "The fleet, its route, and when insurance, fitness and PUC certificates are due."}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      {!assignOnly && (
        <Panel title="Add vehicle">
          <Form onSubmit={add}>
            <Field label="Registration no"><input name="registrationNo" placeholder="MP09AB1234" required /></Field>
            <Field label="Route">
              <select name="routeId" defaultValue="">
                <option value="">Not on a route</option>
                {routes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </Field>
            <Field label="Seats"><input name="capacity" type="number" min="0" /></Field>
            <Field label="Fuel"><input name="fuelType" placeholder="Diesel" /></Field>
            <Field label="Insurance due"><input name="insuranceDue" type="date" /></Field>
            <Field label="Fitness due"><input name="fitnessDue" type="date" /></Field>
            <Field label="PUC due"><input name="pucDue" type="date" /></Field>
            <Field label="GPS tracker id"><input name="trackerId" /></Field>
            <Check name="cctv" label="CCTV fitted" />
            <Button type="submit">Add vehicle</Button>
          </Form>
        </Panel>
      )}
      <DataTable rows={vehicles} empty={loaded ? "No vehicles yet." : "Loading…"} columns={[
        { key: "registrationNo", label: "Vehicle" },
        { key: "route", label: "Route", render: (row) => (
          <select aria-label={"Route for " + row.registrationNo} value={row.route?.id || row.routeId || ""} onChange={(event) => assign(row, event.target.value)}>
            <option value="">Not on a route</option>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        ) },
        ...(assignOnly ? [] : [
          { key: "seats", label: "Seats", render: (row) => row.extras?.capacity ?? "-" },
          { key: "due", label: "Certificates", render: (row) => <Row>{[dueBadge("Insurance", row.compliance?.insuranceDue), dueBadge("Fitness", row.compliance?.fitnessDue), dueBadge("PUC", row.compliance?.pucDue)]}{!row.compliance?.insuranceDue && !row.compliance?.fitnessDue && !row.compliance?.pucDue && "-"}</Row> },
          { key: "extra", label: "Other", render: (row) => [row.extras?.fuelType, row.extras?.cctv ? "CCTV" : "", row.extras?.trackerId ? "GPS " + row.extras.trackerId : ""].filter(Boolean).join(" · ") || "-" },
          { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row)} /> },
        ]),
      ]} />
    </Screen>
  );
}

export function Vehicles() { return <VehiclesScreen />; }
export function AssignVehicle() { return <VehiclesScreen assignOnly />; }

export function StudentTransport() {
  const { data, error } = useLoad(["/v1/routes"]);
  const routes = rowsOf(data["/v1/routes"]);
  const [student, setStudent] = useState(null);
  const [routeId, setRouteId] = useState("");
  const [pickupId, setPickupId] = useState("");
  const [outRouteId, setOutRouteId] = useState("");
  const [outPickupId, setOutPickupId] = useState("");
  const [status, run] = useStatus();
  const route = routes.find((row) => row.id === routeId);
  const pickups = route?.pickups || [];
  const outPickups = routes.find((row) => row.id === outRouteId)?.pickups || [];

  async function submit(event) {
    event.preventDefault();
    if (!student || !route) return;
    if (!window.confirm("Put " + student.name + " on " + route.name + "? If they have no transport yet, a transport fee of " + money(route.feeAmount) + " is added to their fees.")) return;
    const { ok } = await run(() => apiCall("POST", "/v1/transport/assign", {
      studentId: student.id, routeId, pickupPointId: pickupId, outRouteId: outRouteId || undefined, outPickupPointId: outRouteId ? outPickupId : undefined,
    }), (json) => student.name + " assigned to " + route.name + (json?.invoiceId ? "; transport fee added." : "; pickup updated."));
    if (ok) { setStudent(null); setPickupId(""); setOutRouteId(""); setOutPickupId(""); }
  }

  return (
    <Screen title="Student transport fees" hint="Put a student on a route and pickup point. The first assignment adds the route's transport fee to their fees; changing it later does not charge again.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={submit}>
          <StudentPicker value={student} onPick={setStudent} />
          <Field label="Route">
            <select value={routeId} onChange={(event) => { setRouteId(event.target.value); setPickupId(""); }} required>
              <option value="" disabled>Select route</option>
              {routes.map((row) => <option key={row.id} value={row.id}>{row.name} · {money(row.feeAmount)}</option>)}
            </select>
          </Field>
          <Field label="Pickup point">
            <select value={pickupId} onChange={(event) => setPickupId(event.target.value)} required disabled={!route}>
              <option value="" disabled>{route && !pickups.length ? "This route has no stops" : "Select stop"}</option>
              {pickups.map((row) => <option key={row.id} value={row.id}>{row.name}{row.time ? " · " + row.time : ""}</option>)}
            </select>
          </Field>
          <Field label="Return route (optional)">
            <select value={outRouteId} onChange={(event) => { setOutRouteId(event.target.value); setOutPickupId(""); }}>
              <option value="">Same as morning</option>
              {routes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          {outRouteId && (
            <Field label="Drop point">
              <select value={outPickupId} onChange={(event) => setOutPickupId(event.target.value)} required>
                <option value="" disabled>Select stop</option>
                {outPickups.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </Field>
          )}
          <Button type="submit" disabled={!student || !pickupId || (outRouteId && !outPickupId)}>Assign</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

/* ================================================================= Hostel */

export function Hostels() {
  const { data, error, reload, loaded } = useLoad(["/v1/hostels"]);
  const hostels = rowsOf(data["/v1/hostels"]);
  const vacancy = data["/v1/hostels"]?.vacancy || [];
  const [status, run] = useStatus();
  const stats = (hostel) => {
    const rooms = vacancy.filter((row) => row.hostel === hostel.name);
    return { rooms: rooms.length, beds: rooms.reduce((s, r) => s + r.capacity, 0), free: rooms.reduce((s, r) => s + r.vacant, 0) };
  };

  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formObject(event);
    const { ok } = await run(() => apiCall("POST", "/v1/hostels", { name: v.name, feeAmount: v.feeAmount }), "Hostel saved");
    if (ok) { form.reset(); reload(); }
  }
  async function remove(row) {
    const { ok } = await run(() => apiCall("DELETE", "/v1/hostels/" + row.id), "Hostel removed");
    if (ok) reload();
  }

  return (
    <Screen title="Hostels" hint="Hostel blocks and the fee charged when a student is first given a room.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel title="Add hostel">
        <Form onSubmit={add}>
          <Field label="Name"><input name="name" placeholder="Boys hostel A" required /></Field>
          <Field label="Hostel fee (₹)"><input name="feeAmount" type="number" min="0" step="0.01" required /></Field>
          <Button type="submit">Add hostel</Button>
        </Form>
      </Panel>
      <DataTable rows={hostels} empty={loaded ? "No hostels yet." : "Loading…"} columns={[
        { key: "name", label: "Hostel" },
        { key: "fee", label: "Fee", render: (row) => money(row.feeAmount) },
        { key: "rooms", label: "Rooms", render: (row) => stats(row).rooms },
        { key: "beds", label: "Beds free", render: (row) => stats(row).free + " / " + stats(row).beds },
        { key: "act", label: "", render: (row) => <RemoveButton onRemove={() => remove(row)} /> },
      ]} />
    </Screen>
  );
}

export function HostelRooms() {
  const { data, error, reload, loaded } = useLoad(["/v1/hostels"]);
  const hostels = rowsOf(data["/v1/hostels"]);
  const vacancy = data["/v1/hostels"]?.vacancy || [];
  const [status, run] = useStatus();

  async function add(event) {
    event.preventDefault();
    const v = formObject(event);
    const hostel = hostels.find((row) => row.id === v.hostelId);
    const number = v.number.trim();
    if ((hostel?.rooms || []).some((room) => String(room.number).toLowerCase() === number.toLowerCase())) { run(() => Promise.reject(new Error("Room " + number + " already exists in " + hostel.name + "."))); return; }
    const { ok } = await run(() => apiCall("POST", "/v1/hostels/rooms", { hostelId: v.hostelId, number, capacity: Number(v.capacity), roomType: v.roomType || undefined }), "Room " + number + " added");
    if (ok) { event.target.querySelector("[name=number]").value = ""; reload(); }
  }

  return (
    <Screen title="Hostel rooms" hint="Rooms in each hostel and how many beds they have.">
      <Notice status={{ error: error || status.error, message: status.message }} />
      {loaded && !hostels.length && <p className="ck-notice ck-notice-error">Add a hostel first.</p>}
      <Panel title="Add room">
        <Form onSubmit={add}>
          <Field label="Hostel">
            <select name="hostelId" required defaultValue="">
              <option value="" disabled>Select hostel</option>
              {hostels.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Room no"><input name="number" required /></Field>
          <Field label="Beds"><input name="capacity" type="number" min="1" defaultValue="2" required /></Field>
          <Field label="Room type"><input name="roomType" placeholder="2-share AC" /></Field>
          <Button type="submit">Add room</Button>
        </Form>
      </Panel>
      <RoomTable rows={vacancy} loaded={loaded} />
    </Screen>
  );
}

function RoomTable({ rows, loaded, onlyFree }) {
  const shown = (onlyFree ? rows.filter((row) => row.vacant > 0) : rows).slice().sort((a, b) => a.hostel.localeCompare(b.hostel) || String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
  return (
    <DataTable rows={shown} empty={loaded ? (onlyFree ? "No free beds." : "No rooms yet.") : "Loading…"} columns={[
      { key: "hostel", label: "Hostel" },
      { key: "number", label: "Room" },
      { key: "roomType", label: "Type", render: (row) => row.roomType || "-" },
      { key: "beds", label: "Occupied / beds", render: (row) => row.occupied + " / " + row.capacity },
      { key: "vacant", label: "Free", render: (row) => (row.vacant ? <span className="ck-badge">{plural(row.vacant, "bed")} free</span> : <span className="ck-badge ck-badge-warn">Full</span>) },
    ]} />
  );
}

export function VacancyStatus() {
  const { data, error, reload, loaded } = useLoad(["/v1/hostels"]);
  const vacancy = data["/v1/hostels"]?.vacancy || [];
  const [onlyFree, setOnlyFree] = useState(false);
  const beds = vacancy.reduce((s, r) => s + r.capacity, 0);
  const free = vacancy.reduce((s, r) => s + r.vacant, 0);
  return (
    <Screen title="Vacancy status" hint="Free beds in every hostel room.">
      <Notice status={{ error }} />
      <Panel title={plural(free, "bed") + " free of " + beds} actions={<Row><Check label="Only rooms with free beds" checked={onlyFree} onChange={(event) => setOnlyFree(event.target.checked)} /><Button variant="ghost" onClick={reload}>Refresh</Button></Row>}>
        <RoomTable rows={vacancy} loaded={loaded} onlyFree={onlyFree} />
      </Panel>
    </Screen>
  );
}

function AssignRoomScreen({ change }) {
  const { data, error, reload } = useLoad(["/v1/hostels"]);
  const vacancy = (data["/v1/hostels"]?.vacancy || []).filter((row) => row.vacant > 0);
  const [student, setStudent] = useState(null);
  const [status, run] = useStatus();

  async function submit(event) {
    event.preventDefault();
    if (!student) return;
    const v = formObject(event);
    const room = vacancy.find((row) => row.id === v.roomId);
    const text = change
      ? "Move " + student.name + " to " + room.hostel + " room " + room.number + "?"
      : "Give " + student.name + " a bed in " + room.hostel + " room " + room.number + "? If they have no room yet, the hostel fee is added to their fees.";
    if (!window.confirm(text)) return;
    const { ok } = await run(() => apiCall("POST", "/v1/hostels/allocate", { studentId: student.id, roomId: v.roomId }),
      (json) => student.name + (json?.moved ? " moved to " : " given a bed in ") + room.hostel + " " + room.number + (json?.moved ? "." : "; hostel fee added."));
    if (ok) { setStudent(null); reload(); }
  }

  return (
    <Screen title={change ? "Change room" : "Assign room"} hint={change ? "Move a student who already has a room. No new fee is charged for a move." : "Give a student a bed. Their first room adds the hostel fee to their fees."}>
      <Notice status={{ error: error || status.error, message: status.message }} />
      <Panel>
        <Form onSubmit={submit}>
          <StudentPicker value={student} onPick={setStudent} />
          <Field label="Room" wide>
            <select name="roomId" required defaultValue="">
              <option value="" disabled>{vacancy.length ? "Select room" : "No room has a free bed"}</option>
              {vacancy.map((row) => <option key={row.id} value={row.id}>{row.hostel} · room {row.number}{row.roomType ? " · " + row.roomType : ""} ({plural(row.vacant, "bed")} free)</option>)}
            </select>
          </Field>
          <Button type="submit" disabled={!student || !vacancy.length}>{change ? "Move student" : "Assign room"}</Button>
        </Form>
      </Panel>
    </Screen>
  );
}

export function AssignRoom() { return <AssignRoomScreen />; }
export function ChangeRoom() { return <AssignRoomScreen change />; }
