import { describe, expect, it } from "vitest";
import { HttpError } from "@/lib/errors";
import {
  belongToForKind,
  extraAnswersPayload,
  fieldControl,
  formIsOpen,
  notesWithAnswers,
  openForms,
  packEnquiryRemarks,
  parseAdmissionForms,
  parseApplicationNotes,
  selectOptions,
  dropForm,
  upsertForm,
} from "./admission-forms";
import { houseIdOrNull } from "./diary";
import { parsePromoteProcedure, promoteNeedsTarget } from "./promotion";

describe("parseAdmissionForms", () => {
  it("keeps live window rows and skips junk without a hardcoded form catalog", () => {
    const forms = parseAdmissionForms([
      { id: "a1", name: "2026 intake", kind: "admission", status: "open" },
      { name: "Walk-in enquiry", kind: "enquiry", status: "hidden" },
      { name: "   " },
      null,
      { id: "x", name: "Odd", kind: "other", status: "weird" },
    ]);
    expect(forms.map((f) => f.name)).toEqual([
      "2026 intake",
      "Walk-in enquiry",
      "Odd",
    ]);
    expect(forms[0]?.belongTo).toBe("Admission");
    expect(forms[1]?.belongTo).toBe("Enquiry");
    expect(forms[1]?.status).toBe("hidden");
    expect(forms[2]?.kind).toBe("admission");
    expect(forms[2]?.status).toBe("open");
  });

  it("drops a form window by id", () => {
    const forms = upsertForm([], { name: "Intake" });
    expect(dropForm(forms, forms[0]!.id)).toEqual([]);
    expect(() => dropForm(forms, "missing")).toThrow();
  });
});

describe("formIsOpen", () => {
  const now = new Date("2026-06-15T10:00:00Z");

  it("hides closed windows and respects the stored date range", () => {
    expect(
      formIsOpen(
        {
          id: "1",
          name: "A",
          kind: "admission",
          status: "hidden",
          belongTo: "Admission",
        },
        now,
      ),
    ).toBe(false);
    expect(
      formIsOpen(
        {
          id: "2",
          name: "B",
          kind: "admission",
          status: "open",
          belongTo: "Admission",
          opensAt: "2026-07-01",
        },
        now,
      ),
    ).toBe(false);
    expect(
      formIsOpen(
        {
          id: "3",
          name: "C",
          kind: "enquiry",
          status: "open",
          belongTo: "Enquiry",
          closesAt: "2026-06-01",
        },
        now,
      ),
    ).toBe(false);
    expect(
      formIsOpen(
        {
          id: "4",
          name: "D",
          kind: "admission",
          status: "open",
          belongTo: "Admission",
          opensAt: "2026-06-01",
          closesAt: "2026-06-30",
        },
        now,
      ),
    ).toBe(true);
  });
});

describe("openForms", () => {
  it("filters by stored kind", () => {
    const forms = parseAdmissionForms([
      { id: "a", name: "A", kind: "admission", status: "open" },
      { id: "e", name: "E", kind: "enquiry", status: "open" },
      { id: "h", name: "H", kind: "admission", status: "hidden" },
    ]);
    expect(openForms(forms, "admission").map((f) => f.id)).toEqual(["a"]);
    expect(openForms(forms, "enquiry").map((f) => f.id)).toEqual(["e"]);
  });
});

describe("template fields", () => {
  it("maps control type and options from the stored custom field", () => {
    expect(fieldControl("Number")).toBe("number");
    expect(fieldControl("select")).toBe("select");
    expect(selectOptions("A, B, C")).toEqual(["A", "B", "C"]);
    expect(belongToForKind("enquiry")).toBe("Enquiry");
  });

  it("requires only fields marked required on the live template", () => {
    expect(() =>
      extraAnswersPayload(
        [
          { id: "f1", name: "Sibling", required: true },
          { id: "f2", name: "Notes", required: false },
        ],
        {},
      ),
    ).toThrow(HttpError);
    const packed = extraAnswersPayload(
      [
        { id: "f1", name: "Sibling", required: true },
        { id: "f2", name: "Notes", required: false },
      ],
      { f1: "Yes" },
    );
    expect(packed).toEqual({ f1: "Yes" });
  });

  it("stores extra answers as JSON notes without a new column", () => {
    const notes = notesWithAnswers(null, "a1", { f1: "Yes" });
    expect(parseApplicationNotes(notes)).toEqual({
      formId: "a1",
      answers: { f1: "Yes" },
    });
    expect(packEnquiryRemarks("call back", { f1: "bus" })).toContain("bus");
  });
});

describe("upsertForm", () => {
  it("inserts or replaces by id", () => {
    const first = upsertForm([], {
      name: "Intake",
      kind: "admission",
      status: "open",
    });
    expect(first).toHaveLength(1);
    expect(first[0]?.id).toBeTruthy();
    const next = upsertForm(first, {
      id: first[0]!.id,
      name: "Intake 2",
      kind: "admission",
      status: "hidden",
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.name).toBe("Intake 2");
    expect(next[0]?.status).toBe("hidden");
  });
});

describe("promote procedure", () => {
  it("treats unknown values as invalid and alumni as no class target", () => {
    expect(parsePromoteProcedure(undefined)).toBe("promote");
    expect(parsePromoteProcedure("change")).toBe("change");
    expect(parsePromoteProcedure("alumni")).toBe("alumni");
    expect(promoteNeedsTarget("alumni")).toBe(false);
    expect(promoteNeedsTarget("change")).toBe(true);
    expect(() => parsePromoteProcedure("expel")).toThrow(HttpError);
  });
});

describe("houseIdOrNull", () => {
  it("clears empty and none without a hardcoded house list", () => {
    expect(houseIdOrNull("none")).toBeNull();
    expect(houseIdOrNull("")).toBeNull();
    expect(houseIdOrNull(null)).toBeNull();
    expect(houseIdOrNull("h1")).toBe("h1");
  });
});
