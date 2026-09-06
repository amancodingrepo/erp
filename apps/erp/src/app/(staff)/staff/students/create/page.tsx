"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Option = { id: string; name: string };
type Klass = Option & { sections: Option[] };
type CustomField = {
  id: string;
  name: string;
  type: string;
  values?: string | null;
  required?: boolean;
};

const SELECT =
  "h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm";

function Field({
  id,
  label,
  children,
}: {
  id?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export default function CreateStudentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Klass[]>([]);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [classId, setClassId] = useState("");
  const [sameAddress, setSameAddress] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/classes").then((r) => r.json()),
      fetch("/api/v1/sessions").then((r) => r.json()),
      fetch("/api/v1/categories").then((r) => r.json()),
      fetch("/api/v1/custom-fields?belongTo=Student").then((r) => r.json()),
    ]).then(([c, s, cat, cf]) => {
      setClasses(c.data ?? []);
      setSessions(s.data ?? []);
      setCategories(cat.data ?? []);
      setCustomFields(cf.data ?? []);
    });
  }, []);

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const str = (name: string) => {
      const v = String(form.get(name) ?? "").trim();
      return v || undefined;
    };
    const payload = {
      admissionNo: str("admissionNo"),
      rollNo: str("rollNo"),
      enrollmentNo: str("enrollmentNo"),
      abcId: str("abcId"),
      admissionQuota: str("admissionQuota"),
      salutation: str("salutation"),
      firstName: str("firstName"),
      middleName: str("middleName"),
      lastName: str("lastName"),
      nameAs12th: str("nameAs12th"),
      nameAsAadhaar: str("nameAsAadhaar"),
      gender: str("gender"),
      dob: str("dob"),
      birthPlace: str("birthPlace"),
      categoryId: str("categoryId"),
      religion: str("religion"),
      caste: str("caste"),
      subCaste: str("subCaste"),
      nationality: str("nationality"),
      minority: str("minority"),
      domicileState: str("domicileState"),
      feeCategory: str("feeCategory"),
      admissionDate: str("admissionDate"),
      mobile: str("mobile"),
      email: str("email"),
      phone: str("phone"),
      instituteEmail: str("instituteEmail"),
      aadhaar: str("aadhaar"),
      pan: str("pan"),
      classId: str("classId"),
      sectionId: str("sectionId"),
      sessionId: str("sessionId"),
      addresses: {
        permanent: {
          line1: str("p_line1"),
          city: str("p_city"),
          district: str("p_district"),
          state: str("p_state"),
          pincode: str("p_pincode"),
          nation: str("p_nation"),
        },
        localSameAsPermanent: sameAddress,
        local: sameAddress
          ? undefined
          : {
              line1: str("l_line1"),
              city: str("l_city"),
              state: str("l_state"),
              pincode: str("l_pincode"),
            },
      },
      previousEdu: {
        qualification: str("qualification"),
        university: str("university"),
        universityState: str("universityState"),
        universityPrn: str("universityPrn"),
        lastClassName: str("lastClassName"),
        academicYear: str("academicYear"),
      },
      bank: {
        accountNo: str("accountNo"),
        holderName: str("holderName"),
        bankName: str("bankName"),
        ifsc: str("ifsc"),
        branchName: str("branchName"),
        accountType: str("accountType"),
      },
      guardians: {
        father: str("fatherName")
          ? {
              name: str("fatherName"),
              phone: str("fatherPhone"),
              occupation: str("fatherOccupation"),
              email: str("fatherEmail"),
            }
          : undefined,
        mother: str("motherName")
          ? {
              name: str("motherName"),
              phone: str("motherPhone"),
              occupation: str("motherOccupation"),
            }
          : undefined,
      },
      customFields: customFields.map((field) => ({
        fieldId: field.id,
        value: str(`cf_${field.id}`),
      })),
    };
    const res = await fetch("/api/v1/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? json.error ?? "Could not create student");
      return;
    }
    router.replace(`/staff/students/${json.id}`);
  }

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-4xl">Admit student</h1>
      <form className="mt-8 space-y-8" onSubmit={onSubmit}>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
            Identity
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="admissionNo" label="Student ID *">
              <Input id="admissionNo" name="admissionNo" required />
            </Field>
            <Field id="rollNo" label="Roll no">
              <Input id="rollNo" name="rollNo" />
            </Field>
            <Field id="enrollmentNo" label="Enrollment no">
              <Input id="enrollmentNo" name="enrollmentNo" />
            </Field>
            <Field id="abcId" label="ABC ID">
              <Input id="abcId" name="abcId" />
            </Field>
            <Field id="salutation" label="Salutation">
              <Input id="salutation" name="salutation" />
            </Field>
            <Field id="firstName" label="First name *">
              <Input id="firstName" name="firstName" required />
            </Field>
            <Field id="middleName" label="Middle name">
              <Input id="middleName" name="middleName" />
            </Field>
            <Field id="lastName" label="Last name">
              <Input id="lastName" name="lastName" />
            </Field>
            <Field id="nameAs12th" label="Name as 12th">
              <Input id="nameAs12th" name="nameAs12th" />
            </Field>
            <Field id="nameAsAadhaar" label="Name as Aadhaar">
              <Input id="nameAsAadhaar" name="nameAsAadhaar" />
            </Field>
            <Field id="gender" label="Gender">
              <select id="gender" name="gender" className={SELECT}>
                <option value="">—</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field id="dob" label="Date of birth">
              <Input id="dob" name="dob" type="date" />
            </Field>
            <Field id="birthPlace" label="Place of birth">
              <Input id="birthPlace" name="birthPlace" />
            </Field>
            <Field id="categoryId" label="Category">
              <select id="categoryId" name="categoryId" className={SELECT}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="religion" label="Religion">
              <Input id="religion" name="religion" />
            </Field>
            <Field id="caste" label="Caste">
              <Input id="caste" name="caste" />
            </Field>
            <Field id="subCaste" label="Sub caste">
              <Input id="subCaste" name="subCaste" />
            </Field>
            <Field id="nationality" label="Nationality">
              <Input id="nationality" name="nationality" />
            </Field>
            <Field id="minority" label="Minority">
              <Input id="minority" name="minority" />
            </Field>
            <Field id="domicileState" label="Domicile state">
              <Input id="domicileState" name="domicileState" />
            </Field>
            <Field id="admissionQuota" label="Admission quota">
              <Input id="admissionQuota" name="admissionQuota" />
            </Field>
            <Field id="admissionDate" label="Admission date">
              <Input id="admissionDate" name="admissionDate" type="date" />
            </Field>
            <Field id="feeCategory" label="Fee category">
              <Input id="feeCategory" name="feeCategory" />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
            Contact & IDs
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="mobile" label="Mobile">
              <Input id="mobile" name="mobile" />
            </Field>
            <Field id="phone" label="Phone">
              <Input id="phone" name="phone" />
            </Field>
            <Field id="email" label="Email">
              <Input id="email" name="email" type="email" />
            </Field>
            <Field id="instituteEmail" label="Allotted email">
              <Input id="instituteEmail" name="instituteEmail" type="email" />
            </Field>
            <Field id="aadhaar" label="Aadhaar">
              <Input id="aadhaar" name="aadhaar" />
            </Field>
            <Field id="pan" label="PAN">
              <Input id="pan" name="pan" />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
            Enrollment
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="sessionId" label="Session">
              <select id="sessionId" name="sessionId" className={SELECT}>
                <option value="">Current session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="classId" label="Class">
              <select
                id="classId"
                name="classId"
                className={SELECT}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="sectionId" label="Section">
              <select id="sectionId" name="sectionId" className={SELECT}>
                <option value="">—</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
            Addresses
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="p_line1" label="Permanent line 1">
              <Input id="p_line1" name="p_line1" />
            </Field>
            <Field id="p_city" label="City">
              <Input id="p_city" name="p_city" />
            </Field>
            <Field id="p_district" label="District">
              <Input id="p_district" name="p_district" />
            </Field>
            <Field id="p_state" label="State">
              <Input id="p_state" name="p_state" />
            </Field>
            <Field id="p_pincode" label="Pincode">
              <Input id="p_pincode" name="p_pincode" />
            </Field>
            <Field id="p_nation" label="Nation">
              <Input id="p_nation" name="p_nation" />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sameAddress}
              onChange={(e) => setSameAddress(e.target.checked)}
            />
            Local same as permanent
          </label>
          {!sameAddress ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field id="l_line1" label="Local line 1">
                <Input id="l_line1" name="l_line1" />
              </Field>
              <Field id="l_city" label="Local city">
                <Input id="l_city" name="l_city" />
              </Field>
              <Field id="l_state" label="Local state">
                <Input id="l_state" name="l_state" />
              </Field>
              <Field id="l_pincode" label="Local pincode">
                <Input id="l_pincode" name="l_pincode" />
              </Field>
            </div>
          ) : null}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
            Previous education
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="qualification" label="Qualification">
              <Input id="qualification" name="qualification" />
            </Field>
            <Field id="university" label="University / board">
              <Input id="university" name="university" />
            </Field>
            <Field id="universityState" label="University state">
              <Input id="universityState" name="universityState" />
            </Field>
            <Field id="universityPrn" label="University PRN">
              <Input id="universityPrn" name="universityPrn" />
            </Field>
            <Field id="lastClassName" label="Last class">
              <Input id="lastClassName" name="lastClassName" />
            </Field>
            <Field id="academicYear" label="Academic year">
              <Input id="academicYear" name="academicYear" />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
            Family
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="fatherName" label="Father name">
              <Input id="fatherName" name="fatherName" />
            </Field>
            <Field id="fatherPhone" label="Father phone">
              <Input id="fatherPhone" name="fatherPhone" />
            </Field>
            <Field id="fatherOccupation" label="Father occupation">
              <Input id="fatherOccupation" name="fatherOccupation" />
            </Field>
            <Field id="fatherEmail" label="Father email">
              <Input id="fatherEmail" name="fatherEmail" type="email" />
            </Field>
            <Field id="motherName" label="Mother name">
              <Input id="motherName" name="motherName" />
            </Field>
            <Field id="motherPhone" label="Mother phone">
              <Input id="motherPhone" name="motherPhone" />
            </Field>
            <Field id="motherOccupation" label="Mother occupation">
              <Input id="motherOccupation" name="motherOccupation" />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
            Bank
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="accountNo" label="Account no">
              <Input id="accountNo" name="accountNo" />
            </Field>
            <Field id="holderName" label="Holder name">
              <Input id="holderName" name="holderName" />
            </Field>
            <Field id="bankName" label="Bank">
              <Input id="bankName" name="bankName" />
            </Field>
            <Field id="ifsc" label="IFSC">
              <Input id="ifsc" name="ifsc" />
            </Field>
            <Field id="branchName" label="Branch">
              <Input id="branchName" name="branchName" />
            </Field>
            <Field id="accountType" label="Account type">
              <Input id="accountType" name="accountType" />
            </Field>
          </div>
        </section>

        {customFields.length ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
              Extra fields
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {customFields.map((field) => {
                const options = (field.values ?? "")
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean);
                const isDropdown = /dropdown|select/i.test(field.type);
                return (
                  <Field key={field.id} id={`cf_${field.id}`} label={field.name}>
                    {isDropdown ? (
                      <select
                        id={`cf_${field.id}`}
                        name={`cf_${field.id}`}
                        required={field.required}
                        className={SELECT}
                      >
                        <option value="">—</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={`cf_${field.id}`}
                        name={`cf_${field.id}`}
                        required={field.required}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          </section>
        ) : null}

        {error ? (
          <p className="text-sm text-[var(--stamp)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create student"}
        </Button>
      </form>
    </div>
  );
}
