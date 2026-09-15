"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  PREVIOUS_QUALIFICATIONS,
  publicApplicationSchema,
} from "@/lib/services/applications";

type Catalog = {
  campus: { name: string; code?: string | null };
  applicationFee: string;
  programs: Array<{ id: string; name: string; level: string }>;
};

type ApplyValues = z.infer<typeof publicApplicationSchema>;

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

function ReqLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}{" "}
      <span className="text-[var(--stamp)]" aria-hidden>
        *
      </span>
    </Label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-[var(--stamp)]" role="alert">
      {message}
    </p>
  );
}

export default function ApplyPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [campuses, setCampuses] = useState<Array<{ name: string; code: string | null }>>(
    [],
  );
  const [campusCode, setCampusCode] = useState("MAIN");
  const [message, setMessage] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const form = useForm<ApplyValues>({
    resolver: zodResolver(publicApplicationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      fatherName: "",
      mobile: "",
      email: "",
      parentEmail: undefined,
      dob: "",
      gender: undefined,
      programId: "",
      previousQualification: "",
      score: "",
      campusCode: "MAIN",
    },
  });

  useEffect(() => {
    fetch("/api/v1/public/campuses")
      .then((r) => r.json())
      .then((json) => setCampuses(json.data ?? []))
      .catch(() => setCampuses([]));
  }, []);

  useEffect(() => {
    fetch(`/api/v1/public/apply?campus=${encodeURIComponent(campusCode)}`)
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => setCatalog(null));
    form.setValue("campusCode", campusCode);
  }, [campusCode, form]);

  const mobileReg = form.register("mobile");

  async function onSubmit(values: ApplyValues) {
    setMessage(null);
    const res = await fetch("/api/v1/public/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, campusCode }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message ?? json.error ?? "Could not submit");
      return;
    }
    setRef(json.applicationNo);
    setAppId(json.id);
    form.reset({ campusCode });
  }

  async function onLookup(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch(
      `/api/v1/public/applications?ref=${encodeURIComponent(lookup)}&campus=${encodeURIComponent(campusCode)}`,
    );
    const json = await res.json();
    setStatus(
      json.data
        ? `${json.data.applicationNo}: ${json.data.status} · fee ${json.data.paymentStatus}`
        : "No application with that reference",
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">
        {catalog?.campus.name ?? "School / college"}
      </p>
      <h1 className="font-display mt-2 text-4xl">Online admission</h1>
      <div className="mt-4">
        <ReqLabel htmlFor="campusCode">Campus / branch</ReqLabel>
        <select
          id="campusCode"
          value={campusCode}
          onChange={(e) => setCampusCode(e.target.value)}
          className={SELECT}
        >
          {(campuses.length
            ? campuses
            : [{ name: "Main Campus", code: "MAIN" }]
          ).map((c) => (
            <option key={c.code ?? c.name} value={c.code ?? "MAIN"}>
              {c.name}
              {c.code ? ` (${c.code})` : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        For school and college admissions. Fields marked{" "}
        <span className="text-[var(--stamp)]">*</span> are required. Application
        fee ₹{catalog?.applicationFee ?? "—"}.
      </p>
      {ref ? (
        <p className="mt-4 border border-[var(--rule)] bg-[var(--paper-2)] p-4 text-sm">
          Submitted. Keep this reference number: <strong>{ref}</strong>
          {appId ? (
            <>
              {" "}
              <button
                type="button"
                className="underline"
                onClick={async () => {
                  const res = await fetch(
                    `/api/v1/public/applications/${appId}/pay-online`,
                    { method: "POST" },
                  );
                  const json = await res.json();
                  setMessage(
                    res.ok
                      ? `Pay ₹${json.amount} with order ${json.orderId}`
                      : json.message ?? "Online pay unavailable",
                  );
                }}
              >
                Pay application fee online
              </button>
            </>
          ) : null}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-[var(--stamp)]" role="alert">
          {message}
        </p>
      ) : null}
      <form className="mt-8 grid gap-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div>
          <ReqLabel htmlFor="firstName">First name</ReqLabel>
          <Input id="firstName" {...form.register("firstName")} autoComplete="given-name" />
          <FieldError message={form.formState.errors.firstName?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="lastName">Last name</ReqLabel>
          <Input id="lastName" {...form.register("lastName")} autoComplete="family-name" />
          <FieldError message={form.formState.errors.lastName?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="fatherName">Parent / guardian name</ReqLabel>
          <Input id="fatherName" {...form.register("fatherName")} />
          <FieldError message={form.formState.errors.fatherName?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="mobile">Mobile (10 digits)</ReqLabel>
          <Input
            id="mobile"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel-national"
            {...mobileReg}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
              mobileReg.onChange(event);
            }}
          />
          <FieldError message={form.formState.errors.mobile?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="email">Student / pupil email</ReqLabel>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="parentEmail">Parent email (for parent portal)</Label>
          <Input
            id="parentEmail"
            type="email"
            {...form.register("parentEmail")}
          />
          <FieldError message={form.formState.errors.parentEmail?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="dob">Date of birth</ReqLabel>
          <Input id="dob" type="date" {...form.register("dob")} />
          <FieldError message={form.formState.errors.dob?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="gender">Gender</ReqLabel>
          <select id="gender" className={SELECT} {...form.register("gender")}>
            <option value="">Select</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          <FieldError message={form.formState.errors.gender?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="programId">Class / course applying for</ReqLabel>
          <select id="programId" className={SELECT} {...form.register("programId")}>
            <option value="">Select</option>
            {(catalog?.programs ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.programId?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="previousQualification">
            Previous class / qualification passed
          </ReqLabel>
          <select
            id="previousQualification"
            className={SELECT}
            {...form.register("previousQualification")}
          >
            <option value="">Select</option>
            {PREVIOUS_QUALIFICATIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.previousQualification?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="score">Percentage in last exam</ReqLabel>
          <Input
            id="score"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.01"
            {...form.register("score")}
          />
          <FieldError message={form.formState.errors.score?.message} />
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Submitting…" : "Submit application"}
        </Button>
      </form>
      <form className="mt-10 space-y-3 border-t border-[var(--rule)] pt-6" onSubmit={onLookup}>
        <Label htmlFor="lookup">Check status</Label>
        <div className="flex gap-3">
          <Input
            id="lookup"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="APP-2026-0001"
          />
          <Button type="submit" variant="ghost">
            Look up
          </Button>
        </div>
        {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
      </form>
      <p className="mt-8 text-sm">
        <Link href="/login" className="underline-offset-4 hover:underline">
          Staff / student / parent login
        </Link>
      </p>
    </div>
  );
}
