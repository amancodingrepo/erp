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
  | "transport-fees";

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

export default function HousingOps({ mode }: { mode: Mode }) {
  if (mode === "rooms") return <RoomsPanel />;
  if (mode === "assign") return <AssignRoomPanel />;
  if (mode === "vacancy") return <VacancyPanel />;
  if (mode === "routes") return <RoutesPanel />;
  if (mode === "vehicles") return <VehiclesPanel />;
  if (mode === "transport-fees") return <TransportAssignPanel />;
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
          <li key={r.id}>
            {r.name} · ₹{r.feeAmount}
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
  const [rows, setRows] = useState<Array<{ id: string; name: string; feeAmount: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    const j = await fetch("/api/v1/transport/routes").then((r) => r.json());
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
    const res = await fetch("/api/v1/transport/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        feeAmount: form.get("feeAmount"),
        pickups,
      }),
    });
    setMessage(res.ok ? "Route saved" : "Could not save");
    load();
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
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            {r.name} · ₹{r.feeAmount}
          </li>
        ))}
      </ul>
    </div>
  );
}

function VehiclesPanel() {
  const [routes, setRoutes] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/transport/routes")
      .then((r) => r.json())
      .then((j) => setRoutes(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/v1/transport/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        registrationNo: form.get("registrationNo"),
        routeId: form.get("routeId") || undefined,
      }),
    });
    setMessage(res.ok ? "Vehicle saved" : "Could not save");
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
        <Button type="submit">Add vehicle</Button>
      </form>
    </div>
  );
}

function TransportAssignPanel() {
  const [routes, setRoutes] = useState<
    Array<{ id: string; name: string; pickups: Array<{ id: string; name: string }> }>
  >([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [routeId, setRouteId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/transport/routes")
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
        <Button type="submit">Assign pickup</Button>
      </form>
    </div>
  );
}
