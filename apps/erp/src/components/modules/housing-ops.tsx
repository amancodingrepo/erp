"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode =
  | "hostels"
  | "rooms"
  | "assign"
  | "vacancy"
  | "routes"
  | "vehicles"
  | "transport-fees"
  | "gps"
  | "pickup-auth"
  | "fuel"
  | "slabs";

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function HousingOps({ mode }: { mode: Mode }) {
  if (mode === "rooms") return <RoomsPanel />;
  if (mode === "assign") return <AssignRoomPanel />;
  if (mode === "vacancy") return <VacancyPanel />;
  if (mode === "routes") return <RoutesPanel />;
  if (mode === "vehicles") return <VehiclesPanel />;
  if (mode === "transport-fees") return <TransportAssignPanel />;
  if (mode === "gps") return <GpsPanel />;
  if (mode === "pickup-auth") return <PickupAuthPanel />;
  if (mode === "fuel") return <FuelPanel />;
  if (mode === "slabs") return <SlabsPanel />;
  return <HostelsPanel />;
}

function HostelsPanel() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; feeAmount: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/hostels").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/hostels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        feeAmount: form.get("feeAmount"),
      }),
    });
    setMessage(res.ok ? "Hostel saved" : "Could not save");
    load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Hostels</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Block A" required />
        <Input name="feeAmount" placeholder="Fee head amount" required />
        <Button type="submit">Add hostel</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2">
            <span>
              {r.name} · ₹{r.feeAmount}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/hostels/${r.id}`, { method: "DELETE" });
                setMessage(res.ok ? "Hostel removed" : "Could not remove hostel");
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

function RoomsPanel() {
  const [hostels, setHostels] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/hostels")
      .then((r) => r.json())
      .then((j) => setHostels(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/hostels/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hostelId: form.get("hostelId"),
        number: form.get("number"),
        capacity: Number(form.get("capacity")),
        roomType: form.get("roomType"),
      }),
    });
    setMessage(res.ok ? "Room saved" : "Could not save");
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Hostel rooms</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="hostelId" className={SELECT} required>
          {hostels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <Input name="number" placeholder="Room number" required />
        <Input name="capacity" type="number" min={1} defaultValue={2} required />
        <Input name="roomType" defaultValue="2-share" />
        <Button type="submit">Add room</Button>
      </form>
    </div>
  );
}

function AssignRoomPanel() {
  const [vacancy, setVacancy] = useState<
    Array<{ id: string; hostel: string; number: string; vacant: number }>
  >([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/hostels")
      .then((r) => r.json())
      .then((j) => setVacancy(j.vacancy ?? []));
    fetch("/api/v1/students?pageSize=100")
      .then((r) => r.json())
      .then((j) => setStudents(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/hostels/allocate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: form.get("studentId"),
        roomId: form.get("roomId"),
      }),
    });
    const json = await res.json();
    setMessage(
      res.ok
        ? json.moved
          ? "Room changed"
          : "Allocated and hostel fee posted"
        : json.message ?? json.error,
    );
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Assign / change room</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="studentId" className={SELECT} required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="roomId" className={SELECT} required>
          {vacancy.map((r) => (
            <option key={r.id} value={r.id}>
              {r.hostel} {r.number} ({r.vacant} vacant)
            </option>
          ))}
        </select>
        <Button type="submit">Allocate</Button>
      </form>
    </div>
  );
}

function VacancyPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; hostel: string; number: string; occupied: number; capacity: number; vacant: number }>
  >([]);
  useEffect(() => {
    fetch("/api/v1/hostels")
      .then((r) => r.json())
      .then((j) => setRows(j.vacancy ?? []));
  }, []);
  return (
    <div>
      <h1 className="font-display text-4xl">Vacancy status</h1>
      <ul className="mt-4 text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.hostel} {r.number}: {r.occupied}/{r.capacity} occupied, {r.vacant} vacant
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoutesPanel() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      name: string;
      feeAmount: string;
      stopMap?: string[];
      pickups?: Array<{
        id: string;
        name: string;
        lat?: number | null;
        lng?: number | null;
        time?: string;
      }>;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/routes").then((r) => r.json());
    setRows(j.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const pickups = String(form.get("pickups") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/v1/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        fee_amount: form.get("feeAmount"),
        pickups,
      }),
    });
    setMessage(res.ok ? "Route saved" : "Could not save");
    load();
  }
  async function saveStops(event: FormEvent<HTMLFormElement>, routeId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const stops = String(form.get("stops") ?? "")
      .split(/\n/)
      .map((line) => {
        const [name, lat, lng, time] = line.split("|").map((part) => part.trim());
        if (!name) return null;
        return {
          name,
          lat: lat || undefined,
          lng: lng || undefined,
          time: time || undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const res = await fetch(`/api/v1/routes/${routeId}/stops`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stops }),
    });
    setMessage(res.ok ? "Stops saved" : "Could not save stops");
    if (res.ok) load();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Routes</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Route name" required />
        <Input name="feeAmount" placeholder="Transport fee" required />
        <Input name="pickups" placeholder="Pickup points, comma separated" />
        <Button type="submit">Add route</Button>
      </form>
      <ul className="space-y-4 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2">
            <p className="flex flex-wrap items-center gap-2">
              <span>
              {r.name} · ₹{r.feeAmount}
              {r.stopMap?.length ? ` · ${r.stopMap.join(" → ")}` : ""}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const res = await fetch(`/api/v1/routes/${r.id}`, {
                    method: "DELETE",
                  });
                  setMessage(res.ok ? "Route removed" : "Could not remove (route in use)");
                  if (res.ok) load();
                }}
              >
                Remove
              </Button>
            </p>
            <form className="grid gap-2" onSubmit={(event) => saveStops(event, r.id)}>
              <textarea
                name="stops"
                rows={Math.max(3, r.pickups?.length ?? 3)}
                className="rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm"
                defaultValue={(r.pickups ?? [])
                  .map((p) =>
                    p.lat == null && p.lng == null && !p.time
                      ? p.name
                      : [p.name, p.lat ?? "", p.lng ?? "", p.time ?? ""].join(" | "),
                  )
                  .join("\n")}
                placeholder={"Depot | 23.2 | 77.4 | 07:30\nMarket"}
              />
              <Button type="submit">Save stops</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VehiclesPanel() {
  const [routes, setRoutes] = useState<Array<{ id: string; name: string }>>([]);
  const [vehicles, setVehicles] = useState<
    Array<{
      id: string;
      registrationNo: string;
      route?: { name: string } | null;
      compliance?: {
        insuranceDue?: string;
        fitnessDue?: string;
        pucDue?: string;
      } | null;
      extras?: {
        capacity?: number | null;
        trackerId?: string;
        cctv?: boolean;
        fuelType?: string;
      } | null;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [fleet, routeJson] = await Promise.all([
      fetch("/api/v1/vehicles").then((r) => r.json()),
      fetch("/api/v1/routes").then((r) => r.json()),
    ]);
    setVehicles(fleet.data ?? []);
    setRoutes(routeJson.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/vehicles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registration_no: form.get("registrationNo"),
        route_id: form.get("routeId") || undefined,
        insurance_due: form.get("insuranceDue") || undefined,
        fitness_due: form.get("fitnessDue") || undefined,
        puc_due: form.get("pucDue") || undefined,
        capacity: form.get("capacity") || undefined,
        tracker_id: form.get("trackerId") || undefined,
        cctv: form.get("cctv") === "on",
        fuel_type: form.get("fuelType") || undefined,
      }),
    });
    setMessage(res.ok ? "Vehicle saved" : "Could not save");
    if (res.ok) {
      event.currentTarget.reset();
      load();
    }
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Vehicles</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="registrationNo" placeholder="MP-09-AB-1234" required />
        <select name="routeId" className={SELECT}>
          <option value="">Unassigned</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <Input name="insuranceDue" type="date" />
        <Input name="fitnessDue" type="date" />
        <Input name="pucDue" type="date" />
        <Input name="capacity" type="number" min="0" placeholder="Capacity" />
        <Input name="trackerId" placeholder="Tracker id" />
        <Input name="fuelType" placeholder="Fuel type" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="cctv" />
          CCTV
        </label>
        <Button type="submit">Add vehicle</Button>
      </form>
      <ul className="text-sm">
        {vehicles.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-2">
            <span>
            {v.registrationNo} · {v.route?.name ?? "Unassigned"}
            {v.compliance?.insuranceDue
              ? ` · insurance ${v.compliance.insuranceDue}`
              : ""}
            {v.compliance?.fitnessDue ? ` · fitness ${v.compliance.fitnessDue}` : ""}
            {v.compliance?.pucDue ? ` · PUC ${v.compliance.pucDue}` : ""}
            {v.extras?.trackerId ? ` · tracker ${v.extras.trackerId}` : ""}
            {v.extras?.capacity != null ? ` · ${v.extras.capacity} seats` : ""}
            {v.extras?.fuelType ? ` · ${v.extras.fuelType}` : ""}
            {v.extras?.cctv ? " · CCTV" : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/vehicles/${v.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Vehicle removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
        {!vehicles.length ? (
          <li className="text-[var(--muted)]">No vehicles yet.</li>
        ) : null}
      </ul>
    </div>
  );
}

function GpsPanel() {
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; registrationNo: string }>
  >([]);
  const [last, setLast] = useState<{
    lat: number;
    lng: number;
    at: string;
    tripId: string;
  } | null>(null);
  const [trip, setTrip] = useState<Array<{ lat: number; lng: number; at: string }>>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  async function loadVehicles() {
    const j = await fetch("/api/v1/vehicles").then((r) => r.json());
    setVehicles(j.data ?? []);
  }
  useEffect(() => {
    loadVehicles();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const vehicleId = String(form.get("vehicleId") ?? "");
    const res = await fetch("/api/v1/transport/pings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vehicleId,
        lat: Number(form.get("lat")),
        lng: Number(form.get("lng")),
        tripId: String(form.get("tripId") ?? "") || undefined,
      }),
    });
    setMessage(res.ok ? "Ping saved" : "Could not save ping");
    if (!res.ok) return;
    const live = await fetch("/api/v1/transport/live").then((r) => r.json());
    const row = (live.data ?? []).find(
      (item: { id: string; last?: { lat: number; lng: number; at: string; tripId: string } | null }) =>
        item.id === vehicleId,
    );
    setLast(row?.last ?? null);
    const tripId = row?.last?.tripId;
    if (tripId) {
      const playback = await fetch(
        `/api/v1/transport/trips?trip_id=${encodeURIComponent(tripId)}`,
      ).then((r) => r.json());
      setTrip(playback.data ?? []);
    }
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Bus location</h1>
      <p className="text-sm text-[var(--muted)]">
        Staff posts the last ping. Parents see that ping and the trip points — no live GPS vendor.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="vehicleId" className={SELECT} required>
          <option value="">Vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registrationNo}
            </option>
          ))}
        </select>
        <Input name="lat" placeholder="Latitude" required />
        <Input name="lng" placeholder="Longitude" required />
        <Input name="tripId" placeholder="Trip id (optional)" />
        <Button type="submit">Post ping</Button>
      </form>
      {last ? (
        <p className="text-sm">
          Last {last.lat}, {last.lng} at {last.at} · {last.tripId}
        </p>
      ) : null}
      <ul className="text-sm">
        {trip.map((p, i) => (
          <li key={`${p.at}-${i}`}>
            {p.at} · {p.lat}, {p.lng}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FuelPanel() {
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; registrationNo: string }>
  >([]);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      vehicleId: string;
      litres: number;
      amount: number;
      odometer: number | null;
      at: string;
      note: string;
    }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const [fleet, logs] = await Promise.all([
      fetch("/api/v1/vehicles").then((r) => r.json()),
      fetch("/api/v1/fuel-logs").then((r) => r.json()),
    ]);
    setVehicles(fleet.data ?? []);
    setRows(logs.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/fuel-logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vehicle_id: form.get("vehicleId"),
        litres: Number(form.get("litres")),
        amount: form.get("amount") ? Number(form.get("amount")) : undefined,
        odometer: form.get("odometer") ? Number(form.get("odometer")) : undefined,
        note: String(form.get("note") ?? "").trim() || undefined,
      }),
    });
    setMessage(res.ok ? "Fuel entry saved" : "Need a vehicle and litres");
    if (res.ok) {
      event.currentTarget.reset();
      load();
    }
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Fuel log</h1>
      <p className="text-sm text-[var(--muted)]">
        Fill entries against live vehicles. This desk does not connect a fuel card vendor.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="vehicleId" className={SELECT} required>
          <option value="">Vehicle</option>
          {vehicles.map((row) => (
            <option key={row.id} value={row.id}>
              {row.registrationNo}
            </option>
          ))}
        </select>
        <Input name="litres" type="number" min="0.01" step="0.01" placeholder="Litres" required />
        <Input name="amount" type="number" min="0" step="0.01" placeholder="Amount" />
        <Input name="odometer" type="number" min="0" step="0.1" placeholder="Odometer (optional)" />
        <Input name="note" placeholder="Note (optional)" />
        <Button type="submit">Add fill</Button>
      </form>
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
            {vehicles.find((v) => v.id === row.vehicleId)?.registrationNo ?? row.vehicleId} ·{" "}
            {row.litres} L · ₹{row.amount}
            {row.odometer != null ? ` · ${row.odometer} km` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/fuel-logs/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Fuel entry removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
        {!rows.length ? <li className="text-[var(--muted)]">No fuel entries yet.</li> : null}
      </ul>
    </div>
  );
}

function SlabsPanel() {
  const [rows, setRows] = useState<
    Array<{ id: string; name: string; fromKm: number; toKm: number | null; amount: number }>
  >([]);
  const [fee, setFee] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const json = await fetch("/api/v1/transport-slabs").then((r) => r.json());
    setRows(json.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const toKm = String(form.get("toKm") ?? "").trim();
    const res = await fetch("/api/v1/transport-slabs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        from_km: Number(form.get("fromKm")),
        to_km: toKm ? Number(toKm) : undefined,
        amount: Number(form.get("amount")),
      }),
    });
    setMessage(res.ok ? "Slab saved" : "Need a name, from km, and amount");
    if (res.ok) {
      event.currentTarget.reset();
      load();
    }
  }
  async function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const km = String(form.get("km") ?? "").trim();
    const json = await fetch(
      `/api/v1/transport-slabs?km=${encodeURIComponent(km)}`,
    ).then((r) => r.json());
    setFee(json.fee ?? null);
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Transport slabs</h1>
      <p className="text-sm text-[var(--muted)]">
        Named distance or area bands. Leave To km empty for an open upper bound.
      </p>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input name="name" placeholder="Slab name (e.g. Zone A or 0-5 km)" required />
        <Input name="fromKm" type="number" min="0" step="0.01" placeholder="From km" required />
        <Input name="toKm" type="number" min="0" step="0.01" placeholder="To km (optional)" />
        <Input name="amount" type="number" min="0" step="0.01" placeholder="Fee amount" required />
        <Button type="submit">Save slab</Button>
      </form>
      <form className="flex flex-wrap items-end gap-2" onSubmit={onLookup}>
        <Input name="km" type="number" min="0" step="0.01" placeholder="Lookup km" />
        <Button type="submit">Fee for distance</Button>
      </form>
      {fee != null ? <p className="text-sm">Fee ₹{fee}</p> : null}
      <ul className="text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
            {row.name} · {row.fromKm}
            {row.toKm != null ? `–${row.toKm}` : "+"} km · ₹{row.amount}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await fetch(`/api/v1/transport-slabs/${row.id}`, {
                  method: "DELETE",
                });
                setMessage(res.ok ? "Slab removed" : "Could not remove");
                if (res.ok) load();
              }}
            >
              Remove
            </Button>
          </li>
        ))}
        {!rows.length ? <li className="text-[var(--muted)]">No slabs yet.</li> : null}
      </ul>
    </div>
  );
}

function PickupAuthPanel() {
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<
    Array<{ id: string; name: string; phone: string; relation: string; studentId: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/students")
      .then((r) => r.json())
      .then((j) =>
        setStudents(
          (j.data ?? []).map((s: { id: string; firstName: string; lastName?: string }) => ({
            id: s.id,
            name: [s.firstName, s.lastName].filter(Boolean).join(" "),
          })),
        ),
      );
    fetch("/api/v1/pickup")
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []));
  }, []);
  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/pickup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: form.get("studentId"),
        name: form.get("name"),
        phone: form.get("phone"),
        relation: form.get("relation"),
        pin: form.get("pin"),
      }),
    });
    setMessage(res.ok ? "Authorised" : "Could not save");
    const j = await fetch("/api/v1/pickup").then((r) => r.json());
    setRows(j.data ?? []);
  }
  async function onCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/pickup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: form.get("studentId"),
        pin: form.get("pin"),
      }),
    });
    const json = await res.json();
    setMessage(
      res.ok
        ? `Gate ok · ${json.student?.name} · ${json.pickup?.name}`
        : json.message ?? json.error ?? "Not authorised",
    );
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Pickup authorisation</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSave}>
        <select name="studentId" className={SELECT} required>
          <option value="">Student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input name="name" placeholder="Authorised person" required />
        <Input name="phone" placeholder="Phone" />
        <Input name="relation" placeholder="Relation" />
        <Input name="pin" placeholder="4-6 digit PIN" required />
        <Button type="submit">Save</Button>
      </form>
      <form className="grid gap-3" onSubmit={onCheck}>
        <select name="studentId" className={SELECT} required>
          <option value="">Student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input name="pin" placeholder="PIN at gate" required />
        <Button type="submit">Check PIN</Button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.name} · {r.relation} · {r.phone}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TransportAssignPanel() {
  const [routes, setRoutes] = useState<
    Array<{ id: string; name: string; pickups: Array<{ id: string; name: string }> }>
  >([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [routeId, setRouteId] = useState("");
  const [outRouteId, setOutRouteId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/routes")
      .then((r) => r.json())
      .then((j) => {
        setRoutes(j.data ?? []);
        setRouteId(j.data?.[0]?.id ?? "");
      });
    fetch("/api/v1/students?pageSize=100")
      .then((r) => r.json())
      .then((j) => setStudents(j.data ?? []));
  }, []);
  const pickups = routes.find((r) => r.id === routeId)?.pickups ?? [];
  const outPickups = routes.find((r) => r.id === outRouteId)?.pickups ?? [];
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/transport/assign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: form.get("studentId"),
        routeId: form.get("routeId"),
        pickupPointId: form.get("pickupPointId"),
        outRouteId: form.get("outRouteId") || undefined,
        outPickupPointId: form.get("outPickupPointId") || undefined,
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Assigned; transport fee posted" : json.message ?? json.error);
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-4xl">Student transport fees</h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <select name="studentId" className={SELECT} required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="routeId"
          className={SELECT}
          value={routeId}
          onChange={(e) => setRouteId(e.target.value)}
          required
        >
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select name="pickupPointId" className={SELECT} required>
          {pickups.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          name="outRouteId"
          className={SELECT}
          value={outRouteId}
          onChange={(e) => setOutRouteId(e.target.value)}
        >
          <option value="">Out route (optional)</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select name="outPickupPointId" className={SELECT}>
          <option value="">Out stop</option>
          {outPickups.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button type="submit">Assign pickup</Button>
      </form>
    </div>
  );
}
