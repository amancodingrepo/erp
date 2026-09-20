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
} from "@/lib/services/application-schema";
import { LanguageToggle, useI18n } from "@/lib/i18n/provider";

type Catalog = {
  campus: { name: string; code?: string | null };
  applicationFee: string;
  programs: Array<{ id: string; name: string; level: string }>;
};

type ApplyValues = z.infer<typeof publicApplicationSchema>;

const SELECT =
  "h-10 w-full rounded-xl border border-[var(--rule)] bg-white px-3 text-sm";

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
  const { t } = useI18n();
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
    setLookup(json.applicationNo ?? "");
    setStatus(null);
    form.reset({ campusCode });
  }

  function startAnother() {
    setRef(null);
    setAppId(null);
    setMessage(null);
    setStatus(null);
    setLookup("");
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

  if (ref) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="em-card p-8">
          <p className="text-[12.5px] font-semibold text-[var(--green-dark)]">
            {catalog?.campus.name ?? "School / college"}
          </p>
          <div className="mb-2 flex justify-end">
            <LanguageToggle />
          </div>
          <h1 className="font-display mt-2 text-3xl">{t("Application submitted")}</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {t(
              "Keep this reference number. You do not need to pay now. Staff will mark the fee paid before enrollment.",
            )}
          </p>
          <p className="mt-6 rounded-2xl bg-[#e9f7ef] px-4 py-4 text-center text-2xl font-extrabold tracking-tight text-[var(--green-dark)]">
            {ref}
          </p>
          {message ? (
            <p className="mt-3 text-sm text-[var(--stamp)]" role="alert">
              {message}
            </p>
          ) : null}
          {appId ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-4 w-full"
              onClick={async () => {
                const res = await fetch(
                  `/api/v1/public/applications/${appId}/pay-online`,
                  { method: "POST" },
                );
                const json = await res.json();
                setMessage(
                  res.ok
                    ? `Pay ₹${json.amount} with order ${json.orderId}`
                    : json.message ?? "Online pay unavailable — staff can mark fee paid",
                );
              }}
            >
              {t("Pay application fee online (optional)")}
            </Button>
          ) : null}
          <form className="mt-8 space-y-3 border-t border-[var(--rule)] pt-6" onSubmit={onLookup}>
            <Label htmlFor="lookup">{t("Check status")}</Label>
            <div className="flex gap-3">
              <Input
                id="lookup"
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="APP-2026-0001"
              />
              <Button type="submit" variant="ghost">
                {t("Look up")}
              </Button>
            </div>
            {status ? (
              <p className="text-sm text-[var(--muted)]">{status}</p>
            ) : null}
          </form>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/login" className="w-full">
              <Button type="button" className="w-full">
                {t("Student / parent / staff login")}
              </Button>
            </Link>
            <Button type="button" variant="ghost" className="w-full" onClick={startAnother}>
              {t("Submit another application")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="em-card p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">
        {catalog?.campus.name ?? "School / college"}
      </p>
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display mt-2 text-4xl">{t("Online admission")}</h1>
        <LanguageToggle />
      </div>
      <div className="mt-4">
        <ReqLabel htmlFor="campusCode">{t("Campus / branch")}</ReqLabel>
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
      {message ? (
        <p className="mt-3 text-sm text-[var(--stamp)]" role="alert">
          {message}
        </p>
      ) : null}
      <form className="mt-8 grid gap-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div>
          <ReqLabel htmlFor="firstName">{t("First name")}</ReqLabel>
          <Input id="firstName" {...form.register("firstName")} autoComplete="given-name" />
          <FieldError message={form.formState.errors.firstName?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="lastName">{t("Last name")}</ReqLabel>
          <Input id="lastName" {...form.register("lastName")} autoComplete="family-name" />
          <FieldError message={form.formState.errors.lastName?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="fatherName">{t("Parent / guardian name")}</ReqLabel>
          <Input id="fatherName" {...form.register("fatherName")} />
          <FieldError message={form.formState.errors.fatherName?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="mobile">{t("Mobile (10 digits)")}</ReqLabel>
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
          <ReqLabel htmlFor="email">{t("Student / pupil email")}</ReqLabel>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="parentEmail">{t("Parent email (for parent portal)")}</Label>
          <Input
            id="parentEmail"
            type="email"
            {...form.register("parentEmail")}
          />
          <FieldError message={form.formState.errors.parentEmail?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="dob">{t("Date of birth")}</ReqLabel>
          <Input id="dob" type="date" {...form.register("dob")} />
          <FieldError message={form.formState.errors.dob?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="gender">{t("Gender")}</ReqLabel>
          <select id="gender" className={SELECT} {...form.register("gender")}>
            <option value="">{t("Select")}</option>
            <option value="MALE">{t("Male")}</option>
            <option value="FEMALE">{t("Female")}</option>
            <option value="OTHER">{t("Other")}</option>
          </select>
          <FieldError message={form.formState.errors.gender?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="programId">{t("Class / course applying for")}</ReqLabel>
          <select id="programId" className={SELECT} {...form.register("programId")}>
            <option value="">{t("Select")}</option>
            {(catalog?.programs ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {t(p.name)}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.programId?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="previousQualification">
            {t("Previous class / qualification passed")}
          </ReqLabel>
          <select
            id="previousQualification"
            className={SELECT}
            {...form.register("previousQualification")}
          >
            <option value="">{t("Select")}</option>
            {PREVIOUS_QUALIFICATIONS.map((q) => (
              <option key={q} value={q}>
                {t(q)}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.previousQualification?.message} />
        </div>
        <div>
          <ReqLabel htmlFor="score">{t("Percentage in last exam")}</ReqLabel>
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
          {form.formState.isSubmitting ? t("Submitting…") : t("Submit application")}
        </Button>
      </form>
      <form className="mt-10 space-y-3 border-t border-[var(--rule)] pt-6" onSubmit={onLookup}>
        <Label htmlFor="lookup">{t("Check status")}</Label>
        <div className="flex gap-3">
          <Input
            id="lookup"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="APP-2026-0001"
          />
          <Button type="submit" variant="ghost">
            {t("Look up")}
          </Button>
        </div>
        {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
      </form>
      <p className="mt-8 text-sm">
        <Link href="/login" className="font-semibold text-[var(--green-dark)] underline-offset-4 hover:underline">
          {t("Staff / student / parent login")}
        </Link>
      </p>
      </div>
    </div>
  );
}
