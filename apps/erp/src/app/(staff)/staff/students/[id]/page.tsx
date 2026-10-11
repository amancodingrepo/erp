"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { mediaUrlFromForm } from "@/lib/client-upload";

type Tab =
  | "profile"
  | "guardians"
  | "documents"
  | "fees"
  | "daycare"
  | "transport"
  | "immunization"
  | "siblings"
  | "attendance"
  | "exams"
  | "timeline";

type Student = {
  id: string;
  admissionNo: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  rollNo?: string | null;
  enrollmentNo?: string | null;
  mobile?: string | null;
  email?: string | null;
  gender?: string | null;
  dob?: string | null;
  status: string;
  aadhaarMasked?: string | null;
  panMasked?: string | null;
  category?: { name: string } | null;
  house?: { id: string; name: string } | null;
  janAadhaar?: string | null;
  scholarNo?: string | null;
  sssmId?: string | null;
  pen?: string | null;
  apaarId?: string | null;
  grn?: string | null;
  saralId?: string | null;
  bloodGroup?: string | null;
  isRte?: boolean;
  isOnlyChild?: boolean;
  admittedClass?: string | null;
  annualIncome?: string | null;
  lunchFromSchool?: boolean;
  isDefaulter?: boolean;
  rfid?: string | null;
  photoUrl?: string | null;
  parentLoginEnabled?: boolean;
  siblings?: {
    groupId: string | null;
    siblings: Array<{
      id: string;
      admissionNo: string;
      firstName: string;
      lastName: string | null;
    }>;
  };
  enrollments: Array<{
    id: string;
    isCurrent: boolean;
    rollNo?: string | null;
    class: { name: string };
    section: { name: string };
    session: { name: string };
  }>;
  guardians: Array<{
    relation: string;
    guardianId?: string;
    aadhaar?: string;
    altPhone?: string;
    education?: string;
    photoUrl?: string;
    residentialAddress?: string;
    permanentAddress?: string;
    sameAsResidential?: boolean;
    guardian: { id?: string; name: string; phone?: string | null };
  }>;
  addresses: Array<{ kind: string; line1?: string | null; city?: string | null; state?: string | null }>;
  documents: Array<{ id: string; title: string; fileUrl: string; createdAt: string }>;
  invoicesSummary: {
    count: number;
    total: number;
    paid: number;
    balance: number;
    rows: Array<{ id: string; status: string; total: number; paid: number }>;
    payments?: Array<{
      id: string;
      invoiceId: string;
      receiptNo: string;
      amount: number;
      method?: string;
      cancelledAt?: string | null;
      paidAt?: string | null;
    }>;
  };
  feeLedger?: {
    totalFees: string;
    totalPaid: string;
    totalUnpaid: string;
    installments: Array<{
      id: string;
      name: string;
      feeTypes: string[];
      subAmount: number;
      discount: number;
      lateFee: number;
      totalAmount: number;
      paidAmount: number;
      dueDate: string | null;
      status: string;
    }>;
  };
  transport?: {
    inRoute: string;
    inStop: string;
    outRoute: string | null;
    outStop: string | null;
    routeId: string;
    pickupPointId: string;
    outRouteId: string | null;
    outPickupPointId: string | null;
  } | null;
  daycare?: {
    enrolled: boolean;
    checkIn?: string | null;
    checkOut?: string | null;
    allowCctv: boolean;
    lastCheckInAt?: string | null;
    lastCheckOutAt?: string | null;
  } | null;
  immunizations?: Array<{
    id: string;
    vaccineName: string;
    scheduleDate?: string | null;
    administeredDate?: string | null;
    remarks?: string | null;
    status: string;
  }>;
  attendance: Array<{ id: string; date: string; status: string }>;
  exams: {
    withheld: boolean;
    marks: Array<{
      id: string;
      exam: string;
      group: string;
      status: string;
      marks: number | null;
    }>;
  };
  timeline: Array<{ at: string; event: string; detail: string }>;
};

const TABS: Tab[] = [
  "profile",
  "guardians",
  "documents",
  "fees",
  "daycare",
  "transport",
  "immunization",
  "siblings",
  "attendance",
  "exams",
  "timeline",
];

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [student, setStudent] = useState<Student | null>(null);
  const [tab, setTab] = useState<Tab>(
    TABS.includes(requestedTab as Tab) ? (requestedTab as Tab) : "profile",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Array<{ id: string; name: string }>>([]);
  const [reasonId, setReasonId] = useState("");

  async function load() {
    const res = await fetch(`/api/v1/students/${id}`);
    setStudent(await res.json());
  }

  useEffect(() => {
    if (id) load();
    fetch("/api/v1/disable-reasons")
      .then((r) => r.json())
      .then((j) => setReasons(j.data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleDisabled() {
    if (student?.status !== "DISABLED" && !reasonId) {
      setMessage("Select a disable reason");
      return;
    }
    const path =
      student?.status === "DISABLED"
        ? `/api/v1/students/${id}/reactivate`
        : `/api/v1/students/${id}/deactivate`;
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        student?.status === "DISABLED" ? {} : { reason_id: reasonId },
      ),
    });
    setMessage(res.ok ? "Updated" : "Could not update");
    load();
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const res = await fetch(`/api/v1/students/${id}/documents`, {
      method: "POST",
      body: data,
    });
    setMessage(res.ok ? "Document saved" : "Upload failed");
    if (res.ok) form.reset();
    load();
  }

  if (!student?.id) {
    return <p className="text-[var(--muted)]">Loading student…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--brass)]">
            {student.admissionNo} · {student.status}
          </p>
          <h1 className="font-display text-4xl">
            {student.firstName} {student.lastName}
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {student.status !== "DISABLED" ? (
            <select
              className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
              value={reasonId}
              onChange={(e) => setReasonId(e.target.value)}
            >
              <option value="">Disable reason</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button variant="danger" onClick={toggleDisabled}>
            {student.status === "DISABLED" ? "Enable login" : "Disable student"}
          </Button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              tab === t ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-2)]"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6 border border-[var(--rule)] bg-[var(--paper-2)] p-5 text-sm">
        {tab === "profile" ? (
          <div className="space-y-6">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Item label="Mobile" value={student.mobile} />
            <Item label="Email" value={student.email} />
            <Item label="Gender" value={student.gender} />
            <Item label="DOB" value={student.dob?.slice(0, 10)} />
            <Item label="Category" value={student.category?.name} />
            <Item label="Enrollment no" value={student.enrollmentNo} />
            <Item label="Roll" value={student.enrollments.find((e) => e.isCurrent)?.rollNo ?? student.rollNo} />
            <Item label="Aadhaar" value={student.aadhaarMasked} />
            <Item label="PAN" value={student.panMasked} />
            <Item label="House" value={student.house?.name} />
            <Item label="PEN" value={student.pen} />
            <Item label="APAAR ID" value={student.apaarId} />
            <Item label="Scholar no" value={student.scholarNo} />
            <Item label="SSSM ID" value={student.sssmId} />
            <Item label="GRN" value={student.grn} />
            <Item label="Saral ID" value={student.saralId} />
            <Item label="Jan Aadhaar" value={student.janAadhaar} />
            <Item label="Blood group" value={student.bloodGroup} />
            <Item label="RFID" value={student.rfid} />
            <Item label="Admitted class" value={student.admittedClass} />
            <Item label="Annual income" value={student.annualIncome} />
            <Item label="Parent login" value={student.parentLoginEnabled === false ? "Off" : "On"} />
            <Item label="RTE" value={student.isRte ? "Yes" : "No"} />
            <Item label="Only child" value={student.isOnlyChild ? "Yes" : "No"} />
            <Item label="Lunch from school" value={student.lunchFromSchool ? "Yes" : "No"} />
            <Item label="Defaulter" value={student.isDefaulter ? "Yes" : "No"} />
            {student.enrollments.map((e) => (
              <Item
                key={e.id}
                label={e.isCurrent ? "Current class" : "Previous"}
                value={`${e.session.name} · ${e.class.name} / ${e.section.name}`}
              />
            ))}
            {student.addresses.map((a) => (
              <Item
                key={a.kind}
                label={a.kind}
                value={[a.line1, a.city, a.state].filter(Boolean).join(", ")}
              />
            ))}
          </dl>
          <IdsForm student={student} onSaved={load} onMessage={setMessage} />
          </div>
        ) : null}
        {tab === "guardians" ? (
          <GuardiansForm student={student} onSaved={load} onMessage={setMessage} />
        ) : null}
        {tab === "documents" ? (
          <div className="space-y-4">
            <form className="flex flex-wrap items-end gap-3" onSubmit={onUpload}>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div>
                <Label htmlFor="file">File (jpg/png/pdf, 5MB)</Label>
                <Input id="file" name="file" type="file" required />
              </div>
              <Button type="submit">Upload</Button>
            </form>
            <ul className="space-y-1">
              {student.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2">
                  {d.title} ·{" "}
                  <a className="underline" href={d.fileUrl} target="_blank" rel="noreferrer">
                    {d.fileUrl}
                  </a>
                  <button
                    type="button"
                    className="underline"
                    onClick={async () => {
                      const res = await fetch(
                        `/api/v1/students/${id}/documents/${d.id}`,
                        { method: "DELETE" },
                      );
                      setMessage(res.ok ? "Document deleted" : "Could not delete");
                      if (res.ok) load();
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
              {!student.documents.length ? <li>No documents.</li> : null}
            </ul>
          </div>
        ) : null}
        {tab === "fees" ? (
          <FeeTab student={student} onSaved={load} onMessage={setMessage} />
        ) : null}
        {tab === "daycare" ? (
          <DaycareTab student={student} onSaved={load} />
        ) : null}
        {tab === "transport" ? (
          <TransportTab student={student} onSaved={load} />
        ) : null}
        {tab === "immunization" ? (
          <ImmunizationTab student={student} onSaved={load} />
        ) : null}
        {tab === "siblings" ? (
          <SiblingsTab student={student} onSaved={load} onMessage={setMessage} />
        ) : null}
        {tab === "attendance" ? (
          <ul className="space-y-1">
            {student.attendance.map((a) => (
              <li key={a.id}>
                {String(a.date).slice(0, 10)} · {a.status}
              </li>
            ))}
            {!student.attendance.length ? <li>No recent attendance.</li> : null}
          </ul>
        ) : null}
        {tab === "exams" ? (
          <ul className="space-y-1">
            {student.exams.marks.map((m) => (
              <li key={m.id}>
                {m.group} / {m.exam}:{" "}
                {m.status === "withheld" ? "Result withheld" : m.marks}
              </li>
            ))}
            {!student.exams.marks.length ? <li>No marks.</li> : null}
          </ul>
        ) : null}
        {tab === "timeline" ? (
          <ul className="space-y-1">
            {student.timeline.map((t, i) => (
              <li key={i}>
                {String(t.at).slice(0, 10)} · {t.event} · {t.detail}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function IdsForm({
  student,
  onSaved,
  onMessage,
}: {
  student: Student;
  onSaved: () => void;
  onMessage: (m: string | null) => void;
}) {
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/v1/students/${student.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        enrollmentNo: form.get("enrollmentNo") || undefined,
        rollNo: form.get("rollNo") || undefined,
        scholarNo: form.get("scholarNo") || undefined,
        pen: form.get("pen") || undefined,
        apaarId: form.get("apaarId") || undefined,
        sssmId: form.get("sssmId") || undefined,
        grn: form.get("grn") || undefined,
        saralId: form.get("saralId") || undefined,
        janAadhaar: form.get("janAadhaar") || undefined,
        parentLoginEnabled: form.get("parentLoginEnabled") === "on",
        rfid: form.get("rfid") || undefined,
        isDefaulter: form.get("isDefaulter") === "on",
        photoUrl: form.get("photoUrl") || undefined,
      }),
    });
    onMessage(res.ok ? "IDs saved" : "Could not save IDs");
    if (res.ok) onSaved();
  }
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
      <h2 className="font-display text-2xl sm:col-span-2">School IDs</h2>
      <Input name="enrollmentNo" defaultValue={student.enrollmentNo ?? ""} placeholder="Enrollment no" />
      <Input name="rollNo" defaultValue={student.rollNo ?? ""} placeholder="Roll" />
      <Input name="scholarNo" defaultValue={student.scholarNo ?? ""} placeholder="Scholar no" />
      <Input name="pen" defaultValue={student.pen ?? ""} placeholder="PEN" />
      <Input name="apaarId" defaultValue={student.apaarId ?? ""} placeholder="APAAR" />
      <Input name="sssmId" defaultValue={student.sssmId ?? ""} placeholder="SSSM" />
      <Input name="grn" defaultValue={student.grn ?? ""} placeholder="GRN" />
      <Input name="saralId" defaultValue={student.saralId ?? ""} placeholder="Saral" />
      <Input name="janAadhaar" defaultValue={student.janAadhaar ?? ""} placeholder="Jan Aadhaar" />
      <Input name="rfid" defaultValue={student.rfid ?? ""} placeholder="RFID card" />
      <Input name="photoUrl" defaultValue={student.photoUrl ?? ""} placeholder="Photo URL" />
      <label className="sm:col-span-2 text-sm">
        Photo file
        <input
          className="mt-1 block w-full text-sm"
          type="file"
          accept="image/jpeg,image/png"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const data = new FormData();
            data.append("file", file);
            const res = await fetch(`/api/v1/students/${student.id}/photo`, {
              method: "POST",
              body: data,
            });
            onMessage(res.ok ? "Photo uploaded" : "Could not upload photo");
            if (res.ok) onSaved();
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="parentLoginEnabled"
          defaultChecked={student.parentLoginEnabled !== false}
        />
        Parent login enabled
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isDefaulter"
          defaultChecked={student.isDefaulter === true}
        />
        Defaulter
      </label>
      <Button type="submit" size="sm">
        Save IDs
      </Button>
    </form>
  );
}

function GuardiansForm({
  student,
  onSaved,
  onMessage,
}: {
  student: Student;
  onSaved: () => void;
  onMessage: (m: string | null) => void;
}) {
  const father =
    student.guardians.find((g) => g.relation === "father") ??
    student.guardians.find((g) => g.relation === "spouse");
  const mother = student.guardians.find((g) => g.relation === "mother");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/v1/students/${student.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fatherName: form.get("fatherName") || undefined,
        motherName: form.get("motherName") || undefined,
      }),
    });
    onMessage(res.ok ? "Guardians saved" : "Could not save guardians");
    if (res.ok) onSaved();
  }
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {student.guardians.map((g, i) => (
          <li key={g.guardian.id ?? i}>
            {g.relation}: {g.guardian.name} {g.guardian.phone ?? ""}
            {g.aadhaar ? ` · Aadhaar ${g.aadhaar}` : ""}
            {g.residentialAddress ? ` · ${g.residentialAddress}` : ""}
          </li>
        ))}
        {!student.guardians.length ? <li>No guardians on file.</li> : null}
      </ul>
      <form className="grid max-w-md gap-3" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="fatherName">Father / spouse</Label>
          <Input
            id="fatherName"
            name="fatherName"
            defaultValue={father?.guardian.name ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="motherName">Mother</Label>
          <Input
            id="motherName"
            name="motherName"
            defaultValue={mother?.guardian.name ?? ""}
          />
        </div>
        <Button type="submit" size="sm">
          Save names
        </Button>
      </form>
      <form
        className="grid max-w-md gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          let photoUrl = "";
          try {
            photoUrl = await mediaUrlFromForm(form, "guardian", {
              urlName: "photoUrl",
              fileName: "photoFile",
            });
          } catch {
            onMessage("Could not upload photo");
            return;
          }
          const res = await fetch(`/api/v1/students/${student.id}/guardians`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: form.get("name"),
              relation: form.get("relation"),
              phone: form.get("phone") || undefined,
              aadhaar: form.get("aadhaar") || undefined,
              altPhone: form.get("altPhone") || undefined,
              education: form.get("education") || undefined,
              photoUrl: photoUrl || undefined,
              residentialAddress: form.get("residentialAddress") || undefined,
              sameAsResidential: form.get("sameAsResidential") === "on",
            }),
          });
          onMessage(res.ok ? "Guardian saved" : "Could not save guardian");
          if (res.ok) {
            event.currentTarget.reset();
            onSaved();
          }
        }}
      >
        <h2 className="font-display text-2xl">Add guardian</h2>
        <select
          name="relation"
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          defaultValue="other"
        >
          <option value="father">Father</option>
          <option value="mother">Mother</option>
          <option value="spouse">Spouse</option>
          <option value="guardian">Guardian</option>
          <option value="other">Other</option>
        </select>
        <Input name="name" placeholder="Name" required />
        <Input name="phone" placeholder="Phone" />
        <Input name="aadhaar" placeholder="Aadhaar (12 digits)" />
        <Input name="altPhone" placeholder="Alt phone" />
        <Input name="education" placeholder="Education" />
        <Input name="photoUrl" placeholder="Photo https:// or upload" />
        <Input name="photoFile" type="file" accept="image/*" />
        <Input name="residentialAddress" placeholder="Residential address" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sameAsResidential" />
          Permanent same as residential
        </label>
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      {student.guardians.map((g) => {
        const gid = g.guardian.id;
        if (!gid) return null;
        return (
          <form
            key={gid}
            className="grid max-w-md gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              let photoUrl = "";
              try {
                photoUrl = await mediaUrlFromForm(form, "guardian", {
                  urlName: "photoUrl",
                  fileName: "photoFile",
                });
              } catch {
                onMessage("Could not upload photo");
                return;
              }
              const res = await fetch(`/api/v1/guardians/${gid}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  aadhaar: form.get("aadhaar") || undefined,
                  altPhone: form.get("altPhone") || undefined,
                  education: form.get("education") || undefined,
                  photoUrl: photoUrl || undefined,
                  residentialAddress: form.get("residentialAddress") || undefined,
                  sameAsResidential: form.get("sameAsResidential") === "on",
                }),
              });
              onMessage(res.ok ? "Guardian extras saved" : "Could not save extras");
              if (res.ok) onSaved();
            }}
          >
            <h2 className="font-display text-2xl">
              {g.guardian.name} extras
            </h2>
            <Input name="aadhaar" placeholder="Aadhaar" defaultValue={g.aadhaar ?? ""} />
            <Input name="altPhone" placeholder="Alt phone" defaultValue={g.altPhone ?? ""} />
            <Input name="education" placeholder="Education" defaultValue={g.education ?? ""} />
            <Input name="photoUrl" placeholder="Photo https:// or upload" defaultValue={g.photoUrl ?? ""} />
            <Input name="photoFile" type="file" accept="image/*" />
            <Input
              name="residentialAddress"
              placeholder="Residential address"
              defaultValue={g.residentialAddress ?? ""}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="sameAsResidential"
                defaultChecked={Boolean(g.sameAsResidential)}
              />
              Permanent same as residential
            </label>
            <Button type="submit" size="sm">
              Save extras
            </Button>
          </form>
        );
      })}
    </div>
  );
}

function FeeTab({
  student,
  onSaved,
  onMessage,
}: {
  student: Student;
  onSaved: () => void;
  onMessage: (m: string | null) => void;
}) {
  const ledger = student.feeLedger;
  const enrollmentId =
    student.enrollments.find((e) => e.isCurrent)?.id ?? student.enrollments[0]?.id;
  const invoiceId = student.invoicesSummary.rows[0]?.id;
  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollmentId || !invoiceId) {
      onMessage("No enrollment or invoice for this student");
      return;
    }
    const form = new FormData(event.currentTarget);
    const partial = String(form.get("intent") ?? "") === "partial";
    const res = await fetch(
      `/api/v1/students/${student.id}/fees/${partial ? "pay-partial" : "pay"}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          enrollmentId,
          invoiceId,
          amount: Number(form.get("amount")),
          method: form.get("method"),
          note: form.get("note") || undefined,
        }),
      },
    );
    const json = await res.json().catch(() => ({}));
    onMessage(res.ok ? `Receipt ${json.receiptNo}` : json.message ?? "Payment failed");
    if (res.ok) {
      event.currentTarget.reset();
      onSaved();
    }
  }
  async function reverse(paymentId: string) {
    const reason = window.prompt("Reason to reverse this receipt");
    if (!reason?.trim()) return;
    const res = await fetch(`/api/v1/payments/${paymentId}/reverse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    onMessage(res.ok ? "Payment reversed" : "Could not reverse");
    if (res.ok) onSaved();
  }
  async function remind() {
    const res = await fetch("/api/v1/fees/remind", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "SMS" }),
    });
    const json = await res.json().catch(() => ({}));
    onMessage(res.ok ? `Reminders sent ${json.sent ?? 0}` : "Could not send reminders");
  }
  return (
    <div className="space-y-4">
      <p>
        Fees {ledger?.totalFees ?? student.invoicesSummary.total} · paid{" "}
        {ledger?.totalPaid ?? student.invoicesSummary.paid} · unpaid{" "}
        {ledger?.totalUnpaid ?? student.invoicesSummary.balance}
      </p>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="text-[var(--muted)]">
            <th className="py-1">Installment</th>
            <th>Types</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Late fee</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(ledger?.installments ?? []).map((row) => (
            <tr key={row.id}>
              <td className="py-1">{row.name}</td>
              <td>{row.feeTypes.join(", ") || "—"}</td>
              <td>{row.totalAmount}</td>
              <td>{row.paidAmount}</td>
              <td>{row.lateFee}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!ledger?.installments.length ? (
        <ul className="mt-3 space-y-1">
          {student.invoicesSummary.rows.map((row) => (
            <li key={row.id}>
              {row.status} · {row.paid}/{row.total}
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="space-y-2 text-sm">
        {(student.invoicesSummary.payments ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2">
            <span>
              {p.receiptNo} · {p.amount}
              {p.cancelledAt ? " · reversed" : ""}
            </span>
            {!p.cancelledAt && p.amount > 0 ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => reverse(p.id)}>
                Reverse
              </Button>
            ) : null}
            {!p.cancelledAt && p.amount > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const reason = window.prompt("Reason to refund this receipt");
                  if (!reason?.trim()) return;
                  const res = await fetch(`/api/v1/payments/${p.id}/refund`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ reason: reason.trim() }),
                  });
                  onMessage(res.ok ? "Payment refunded" : "Could not refund");
                  if (res.ok) onSaved();
                }}
              >
                Refund
              </Button>
            ) : null}
            {!p.cancelledAt && p.amount > 0 && p.method === "CHEQUE" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const reason = window.prompt("Cheque bounce reason");
                  if (!reason?.trim()) return;
                  const res = await fetch(`/api/v1/payments/${p.id}/cheque-bounce`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ reason: reason.trim() }),
                  });
                  onMessage(res.ok ? "Cheque bounced" : "Could not bounce cheque");
                  if (res.ok) onSaved();
                }}
              >
                Bounce cheque
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <form className="grid max-w-lg gap-3 sm:grid-cols-2" onSubmit={pay}>
        <Input name="amount" type="number" min="1" step="0.01" placeholder="Amount" required />
        <select name="method" className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm" defaultValue="CASH">
          <option value="CASH">Cash</option>
          <option value="CHEQUE">Cheque</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank transfer</option>
        </select>
        <Input name="note" placeholder="Note" className="sm:col-span-2" />
        <Button type="submit" name="intent" value="pay" size="sm">
          Collect
        </Button>
        <Button type="submit" name="intent" value="partial" size="sm" variant="ghost">
          Pay partial
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={remind}>
          Send fee reminders
        </Button>
      </form>
      <ConcessionForm studentId={student.id} onMessage={onMessage} />
    </div>
  );
}

function ConcessionForm({
  studentId,
  onMessage,
}: {
  studentId: string;
  onMessage: (m: string | null) => void;
}) {
  const [discounts, setDiscounts] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<Array<{ id: string; discount: string; note: string }>>(
    [],
  );
  async function load() {
    const [d, c] = await Promise.all([
      fetch("/api/v1/discount-types").then((r) => r.json()),
      fetch(`/api/v1/students/${studentId}/concessions`).then((r) => r.json()),
    ]);
    setDiscounts(d.data ?? []);
    setRows(c.data ?? []);
  }
  useEffect(() => {
    load();
  }, [studentId]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/v1/students/${studentId}/concessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        discountId: form.get("discountId"),
        note: String(form.get("note") ?? "").trim() || undefined,
      }),
    });
    onMessage(res.ok ? "Concession saved" : "Need a named discount");
    if (res.ok) load();
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Standing concession</p>
      <form className="grid max-w-lg gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
        <select
          name="discountId"
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
          required
        >
          <option value="">Discount</option>
          {discounts.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <Input name="note" placeholder="Note (optional)" />
        <Button type="submit" size="sm">
          Save concession
        </Button>
      </form>
      <ul className="text-sm text-[var(--muted)]">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span>
              {row.discount}
              {row.note ? ` · ${row.note}` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                const res = await fetch(`/api/v1/fees/concessions/${row.id}`, {
                  method: "DELETE",
                });
                onMessage(res.ok ? "Concession removed" : "Could not remove");
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

function DaycareTab({
  student,
  onSaved,
}: {
  student: Student;
  onSaved: () => void;
}) {
  const d = student.daycare;
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch(`/api/v1/students/${student.id}/daycare`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        enrolled: form.get("enrolled") === "yes",
        checkIn: form.get("checkIn") || null,
        checkOut: form.get("checkOut") || null,
        allowCctv: form.get("allowCctv") === "on",
      }),
    });
    onSaved();
  }
  return (
    <form className="grid max-w-md gap-3" onSubmit={onSubmit}>
      <label className="text-sm">
        Enrolled
        <select
          name="enrolled"
          className="mt-1 h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3"
          defaultValue={d?.enrolled ? "yes" : "no"}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </label>
      <label className="text-sm">
        Check-in
        <Input name="checkIn" defaultValue={d?.checkIn ?? ""} placeholder="08:00" />
      </label>
      <label className="text-sm">
        Check-out
        <Input name="checkOut" defaultValue={d?.checkOut ?? ""} placeholder="16:30" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="allowCctv" defaultChecked={d?.allowCctv} />
        Allow CCTV
      </label>
      <p className="text-[var(--muted)]">
        Last in {d?.lastCheckInAt ? String(d.lastCheckInAt).slice(0, 16) : "—"} · last out{" "}
        {d?.lastCheckOutAt ? String(d.lastCheckOutAt).slice(0, 16) : "—"}
      </p>
      <div className="flex gap-2">
        <Button type="submit">Save daycare</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            await fetch(`/api/v1/students/${student.id}/daycare/check-in`, {
              method: "POST",
            });
            onSaved();
          }}
        >
          Check in
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            await fetch(`/api/v1/students/${student.id}/daycare/check-out`, {
              method: "POST",
            });
            onSaved();
          }}
        >
          Check out
        </Button>
      </div>
    </form>
  );
}

function TransportTab({
  student,
  onSaved,
}: {
  student: Student;
  onSaved: () => void;
}) {
  const [routes, setRoutes] = useState<
    Array<{ id: string; name: string; pickups: Array<{ id: string; name: string }> }>
  >([]);
  const [inRouteId, setInRouteId] = useState(student.transport?.routeId ?? "");
  const [outRouteId, setOutRouteId] = useState(student.transport?.outRouteId ?? "");
  useEffect(() => {
    fetch("/api/v1/transport/routes")
      .then((r) => r.json())
      .then((j) => setRoutes(j.data ?? []));
  }, []);
  const inPickups = routes.find((r) => r.id === inRouteId)?.pickups ?? [];
  const outPickups = routes.find((r) => r.id === outRouteId)?.pickups ?? [];
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch(`/api/v1/students/${student.id}/transport`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        routeId: form.get("routeId"),
        pickupPointId: form.get("pickupPointId"),
        outRouteId: form.get("outRouteId") || undefined,
        outPickupPointId: form.get("outPickupPointId") || undefined,
      }),
    });
    onSaved();
  }
  return (
    <form className="grid max-w-md gap-3" onSubmit={onSubmit}>
      <p className="text-[var(--muted)]">
        In: {student.transport?.inRoute ?? "—"} / {student.transport?.inStop ?? "—"} · Out:{" "}
        {student.transport?.outRoute ?? "—"} / {student.transport?.outStop ?? "—"}
      </p>
      <Label htmlFor="routeId">In route</Label>
      <select
        id="routeId"
        name="routeId"
        className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3"
        value={inRouteId}
        onChange={(e) => setInRouteId(e.target.value)}
        required
      >
        <option value="">—</option>
        {routes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <select
        name="pickupPointId"
        className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3"
        defaultValue={student.transport?.pickupPointId ?? ""}
        required
      >
        {inPickups.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Label htmlFor="outRouteId">Out route</Label>
      <select
        id="outRouteId"
        name="outRouteId"
        className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3"
        value={outRouteId}
        onChange={(e) => setOutRouteId(e.target.value)}
      >
        <option value="">—</option>
        {routes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <select
        name="outPickupPointId"
        className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3"
        defaultValue={student.transport?.outPickupPointId ?? ""}
      >
        {outPickups.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button type="submit">Save stops</Button>
    </form>
  );
}

function ImmunizationTab({
  student,
  onSaved,
}: {
  student: Student;
  onSaved: () => void;
}) {
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch(`/api/v1/students/${student.id}/immunizations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vaccineName: form.get("vaccineName"),
        scheduleDate: form.get("scheduleDate") || undefined,
        administeredDate: form.get("administeredDate") || undefined,
        remarks: form.get("remarks") || undefined,
        status: form.get("status") || "SCHEDULED",
      }),
    });
    event.currentTarget.reset();
    onSaved();
  }
  return (
    <div className="space-y-4">
      <form className="grid max-w-md gap-3" onSubmit={onSubmit}>
        <Input name="vaccineName" placeholder="Vaccine" required />
        <Input name="scheduleDate" type="date" />
        <Input name="administeredDate" type="date" />
        <select
          name="status"
          className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3"
          defaultValue="SCHEDULED"
        >
          <option value="SCHEDULED">Scheduled</option>
          <option value="ADMINISTERED">Administered</option>
          <option value="MISSED">Missed</option>
        </select>
        <Input name="remarks" placeholder="Remarks" />
        <Button type="submit">Add immunization</Button>
      </form>
      <ul className="space-y-1">
        {(student.immunizations ?? []).map((row) => (
          <li key={row.id}>
            {row.vaccineName} · {row.status} ·{" "}
            {row.scheduleDate ? String(row.scheduleDate).slice(0, 10) : "—"}
          </li>
        ))}
        {!(student.immunizations ?? []).length ? <li>No immunization rows.</li> : null}
      </ul>
    </div>
  );
}

function SiblingsTab({
  student,
  onSaved,
  onMessage,
}: {
  student: Student;
  onSaved: () => void;
  onMessage: (m: string | null) => void;
}) {
  const [others, setOthers] = useState<Array<{ id: string; name: string; admissionNo: string }>>(
    [],
  );
  useEffect(() => {
    fetch("/api/v1/students?pageSize=100")
      .then((r) => r.json())
      .then((j) => setOthers(j.data ?? []));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const otherId = String(form.get("otherId") ?? "");
    const res = await fetch("/api/v1/students/siblings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentIds: [student.id, otherId] }),
    });
    onMessage(res.ok ? "Sibling linked" : "Could not link sibling");
    if (res.ok) onSaved();
  }
  const linked = student.siblings?.siblings ?? [];
  return (
    <div className="space-y-4">
      <form className="flex max-w-xl flex-wrap gap-3" onSubmit={onSubmit}>
        <select name="otherId" className="h-10 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3" required>
          {others
            .filter((row) => row.id !== student.id)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.admissionNo}
              </option>
            ))}
        </select>
        <Button type="submit">Link sibling</Button>
      </form>
      <ul className="space-y-1">
        {linked.map((row) => (
          <li key={row.id}>
            <a className="underline" href={`/staff/students/${row.id}`}>
              {row.firstName} {row.lastName ?? ""} · {row.admissionNo}
            </a>
          </li>
        ))}
        {!linked.length ? <li>No siblings linked.</li> : null}
      </ul>
    </div>
  );
}
