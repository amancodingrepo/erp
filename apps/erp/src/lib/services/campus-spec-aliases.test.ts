import { describe, expect, it } from "vitest";
import {
  attachFeeConcessions,
  attachGradeEligibility,
  attachLateFeeRules,
  parseChequeBounce,
  parseDiscountType,
  parseDiscountTypePatch,
  parseFeeRemind,
  parseFeeTemplate,
  parseFeeTemplateApply,
  parseFeeTemplateLine,
  parseFeeTemplatePatch,
  parseAdmissionTest,
  parseAdmissionTestPatch,
  parseAttendanceMode,
  parseAttendanceModePatch,
  parseGradeEligibility,
  parseGradeEligibilityPatch,
  parseHouseBulkAssign,
  parseLateFeeRule,
  parseLateFeeRulePatch,
  parseAttendanceDay,
  parseAttendanceQuery,
  parseBroadcastList,
  parseBroadcastMembers,
  parseConvertToStudent,
  parseDaycarePunch,
  parseFormTemplate,
  parseFormTemplatePatch,
  parseFuelLog,
  parseFuelLogPatch,
  parseLeaveMarkPercent,
  parseOpenForm,
  parseTransportSlab,
  parseTransportSlabPatch,
  parseVehicle,
  parseVehiclePatch,
  parseRoute,
  parseRoutePatch,
  parseReportTemplate,
  parseClassReportTemplate,
  parseDepositSlipPatch,
  parseEventQuery,
  parseEventPatch,
  parseFeeConcession,
  parseFeeConcessionPatch,
  parseLibraryCenterPatch,
  parseLeaveMarkPercentPatch,
  parseReportTemplatePatch,
  parseCorporatePatch,
  parseDriverPatch,
  parseStoreKit,
  parseStoreKitPatch,
  parseSubjectPatch,
  parseOrgMasterPatch,
  parseNamePatch,
  parseClassTeacherPatch,
  parseClassFlagsPatch,
  parseSessionPrefixPatch,
  parseExamGroupPatch,
  parseCctvPatch,
  parseGradePatch,
  parseLeaveTypePatch,
  parsePeriodPatch,
  parseHousePatch,
  parseHostelPatch,
  parseVisitorPatch,
  parseExternalLinkPatch,
  parseMessageTemplatePatch,
  parseLiveClassPatch,
  parseProgramPatch,
  parseExamFormWindowPatch,
  parseExamFormPatch,
  parseStoreDelivery,
  parseLibraryTitle,
  parseLibraryTitlePatch,
  parseLibraryAccession,
  parseLibraryAccessionPatch,
  parseLibraryCopyPatch,
  parseQuestionnairePatch,
  parseStoreProductPatch,
  parseLibraryLost,
  parseQuestionnaireAssign,
  parseQuestionnaireSubmission,
  flattenPayslips,
  parseMessageBox,
  parseMessageCompose,
  parseMessagePolicies,
  parseMessageReply,
  parsePaymentRefund,
  parsePaymentReverse,
  parseRollAssign,
  parseSearchPeople,
  parseStudentDeactivate,
} from "./campus-spec-aliases";

describe("house bulk-assign", () => {
  it("maps student_ids and house_id onto live change-house input", () => {
    expect(
      parseHouseBulkAssign({ student_ids: ["s1", "s2"], house_id: "h1" }),
    ).toEqual({ studentIds: ["s1", "s2"], houseId: "h1" });
    expect(
      parseHouseBulkAssign({ studentIds: ["s1"], houseId: "none" }).houseId,
    ).toBeNull();
    expect(() => parseHouseBulkAssign({ student_ids: [] })).toThrow();
  });
});

describe("grade eligibility", () => {
  it("maps class_id and dob min/max onto live eligibility", () => {
    expect(
      parseGradeEligibility({
        class_id: "c1",
        from_dob: "2018-04-01",
        to_dob: "2019-03-31",
      }),
    ).toMatchObject({
      classId: "c1",
      fromBirthDate: "2018-04-01",
      toBirthDate: "2019-03-31",
    });
    expect(
      attachGradeEligibility([
        {
          id: "r1",
          classId: "c1",
          fromBirthDate: "2018-04-01",
          toBirthDate: "2019-03-31",
        },
      ])[0],
    ).toMatchObject({
      class_id: "c1",
      from_dob: "2018-04-01",
      to_dob: "2019-03-31",
    });
    expect(() => parseGradeEligibility({ class_id: "c1" })).toThrow();
    expect(
      parseGradeEligibilityPatch({ from_dob: "2018-05-01", class_id: "c2" }),
    ).toEqual({
      classId: "c2",
      fromBirthDate: "2018-05-01",
      toBirthDate: undefined,
    });
    expect(() => parseGradeEligibilityPatch({})).toThrow();
  });
});

describe("admission test and attendance mode patches", () => {
  it("maps snake_case create and patch bodies", () => {
    expect(
      parseAdmissionTest({
        name: "Entrance",
        date: "2026-04-15",
        class_id: "c1",
        venue: "Hall A",
      }),
    ).toEqual({
      id: undefined,
      name: "Entrance",
      date: "2026-04-15",
      classId: "c1",
      venue: "Hall A",
    });
    expect(
      parseAdmissionTestPatch({ venue: "", class_id: "" }),
    ).toEqual({
      name: undefined,
      date: undefined,
      classId: "",
      venue: "",
    });
    expect(parseAttendanceMode({ name: "RFID" })).toEqual({
      id: undefined,
      name: "RFID",
    });
    expect(parseAttendanceModePatch({ name: "Manual" })).toEqual({
      name: "Manual",
    });
    expect(() => parseAdmissionTest({ name: "Entrance" })).toThrow();
    expect(() => parseAdmissionTestPatch({})).toThrow();
    expect(() => parseAttendanceModePatch({})).toThrow();
  });
});

describe("roll-numbers assign", () => {
  it("maps class_id and strategy onto live roll input", () => {
    expect(
      parseRollAssign({ class_id: "sec-a", strategy: "boys_first" }),
    ).toMatchObject({
      classId: "sec-a",
      sectionId: "sec-a",
      arrangement: "boys_first",
      sort: "last",
      startFrom: 1,
    });
    expect(
      parseRollAssign({
        classId: "c1",
        sectionId: "s1",
        strategy: "first",
        start_from: 10,
      }),
    ).toMatchObject({
      classId: "c1",
      sectionId: "s1",
      arrangement: "mix",
      sort: "first",
      startFrom: 10,
    });
    expect(() => parseRollAssign({ strategy: "mix" })).toThrow();
  });
});

describe("fees remind", () => {
  it("maps optional class_id and channel onto live reminders", () => {
    expect(parseFeeRemind({ class_id: "c1", channel: "email" })).toEqual({
      classId: "c1",
      channel: "EMAIL",
    });
    expect(parseFeeRemind({})).toEqual({ classId: undefined, channel: "SMS" });
  });
});

describe("fee templates", () => {
  it("maps spec template and apply bodies onto live fee masters", () => {
    expect(
      parseFeeTemplate({
        academic_year_id: "y1",
        group_id: "g1",
        lines: [
          {
            fee_type_id: "t1",
            amount: 100,
            due_date: "2026-04-10",
            installment_id: "i1",
          },
        ],
      }),
    ).toMatchObject({
      sessionId: "y1",
      groupId: "g1",
      lines: [
        {
          feeTypeId: "t1",
          amount: 100,
          dueDate: "2026-04-10",
          installmentId: "i1",
        },
      ],
    });
    expect(parseFeeTemplateApply({ class_ids: ["c1", "c2"] }).classIds).toEqual([
      "c1",
      "c2",
    ]);
    expect(
      parseFeeTemplateLine({ fee_type_id: "t1", amount: "50" }),
    ).toMatchObject({ feeTypeId: "t1", amount: 50 });
    expect(() => parseFeeTemplateApply({})).toThrow();
    expect(() => parseFeeTemplate({ academic_year_id: "y1" })).toThrow();
    expect(parseFeeTemplatePatch({ due_date: "2026-05-01", is_active: false })).toEqual({
      sessionId: undefined,
      groupId: undefined,
      dueDate: "2026-05-01",
      isActive: false,
    });
    expect(() => parseFeeTemplatePatch({})).toThrow();
  });
});

describe("payment reverse", () => {
  it("defaults reason to reverse", () => {
    expect(parsePaymentReverse({ reason: "typo" })).toEqual({ reason: "typo" });
    expect(parsePaymentReverse({})).toEqual({ reason: "reverse" });
  });
});

describe("student deactivate", () => {
  it("maps reason_id onto live disable input", () => {
    expect(parseStudentDeactivate({ reason_id: "r1" })).toEqual({
      reasonId: "r1",
    });
    expect(parseStudentDeactivate({ reasonId: "r2" })).toEqual({
      reasonId: "r2",
    });
    expect(() => parseStudentDeactivate({})).toThrow();
  });
});

describe("search people", () => {
  it("maps spec people search onto live directory input", () => {
    expect(
      parseSearchPeople({
        q: "an",
        phone: "9999999999",
        enrollment: "EN-1",
        exact: true,
        to: "fees",
      }),
    ).toMatchObject({
      q: "an",
      phone: "9999999999",
      id: "EN-1",
      exact: true,
      toFees: true,
    });
    expect(parseSearchPeople({ names: "Ada Lovelace" })).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
    });
    expect(() => parseSearchPeople({})).toThrow();
  });
});

describe("late fee rules", () => {
  it("maps after_days onto live FineRule", () => {
    expect(
      parseLateFeeRule({
        name: "Week late",
        after_days: 7,
        kind: "percent",
        value: 2,
      }),
    ).toEqual({
      name: "Week late",
      afterDays: 7,
      kind: "percent",
      value: 2,
    });
    expect(
      attachLateFeeRules([{ id: "f1", name: "Week late", afterDays: 7 }])[0],
    ).toMatchObject({ after_days: 7 });
    expect(() => parseLateFeeRule({ name: "x" })).toThrow();
    expect(parseLateFeeRulePatch({ after_days: 10, value: "5" })).toEqual({
      name: undefined,
      afterDays: 10,
      kind: undefined,
      value: 5,
    });
    expect(() => parseLateFeeRulePatch({})).toThrow();
  });
});

describe("discount types", () => {
  it("maps spec discount body onto live FeeDiscount", () => {
    expect(
      parseDiscountType({
        name: "Sibling",
        kind: "percent",
        percentage: "10",
      }),
    ).toMatchObject({
      name: "Sibling",
      kind: "percent",
      percentage: 10,
    });
    expect(() => parseDiscountType({ kind: "fixed" })).toThrow();
    expect(parseDiscountTypePatch({ percentage: "15" })).toMatchObject({
      percentage: 15,
    });
    expect(() => parseDiscountTypePatch({})).toThrow();
  });
});

describe("payment refund and cheque bounce", () => {
  it("requires a reason and optional amount on refund", () => {
    expect(parsePaymentRefund({ reason: "duplicate", amount: "50" })).toEqual({
      reason: "duplicate",
      amount: 50,
    });
    expect(() => parsePaymentRefund({})).toThrow();
    expect(parseChequeBounce({ reason: "nsf" })).toEqual({ reason: "nsf" });
    expect(() => parseChequeBounce({})).toThrow();
  });
});

describe("fee concessions", () => {
  it("attaches student_id and discount_id", () => {
    expect(
      attachFeeConcessions([
        { id: "c1", studentId: "s1", discountId: "d1", note: "sib" },
      ])[0],
    ).toMatchObject({
      student_id: "s1",
      discount_id: "d1",
    });
    expect(
      parseFeeConcession({
        student_id: "s1",
        discount_id: "d1",
        note: "sib",
      }),
    ).toEqual({ studentId: "s1", discountId: "d1", note: "sib" });
    expect(parseFeeConcessionPatch({ discount_id: "d2", note: "" })).toEqual({
      discountId: "d2",
      note: "",
    });
    expect(() => parseFeeConcession({})).toThrow();
    expect(() => parseFeeConcessionPatch({})).toThrow();
  });
});

describe("attendance book and day", () => {
  it("maps book, class_id, and spec statuses onto live mark input", () => {
    expect(
      parseAttendanceQuery({
        get: (key: string) =>
          ({ book: "class", class_id: "sec-a", date: "2026-04-10" }[key] ?? null),
      }),
    ).toMatchObject({
      book: "class",
      classId: "sec-a",
      date: "2026-04-10",
    });
    expect(parseAttendanceQuery({ get: () => null }).book).toBe("class");
    expect(
      parseAttendanceDay({
        book: "class",
        class_id: "sec-a",
        date: "2026-04-10",
        marks: [{ person_id: "s1", status: "half_day" }, { student_id: "s2", status: "not_taken" }],
      }),
    ).toMatchObject({
      book: "class",
      classId: "sec-a",
      date: "2026-04-10",
      entries: [
        { studentId: "s1", staffId: undefined, status: "HALFDAY", source: "manual" },
        { studentId: "s2", staffId: undefined, status: "", source: "manual" },
      ],
    });
    expect(
      parseAttendanceDay({
        book: "class",
        class_id: "sec-a",
        date: "2026-04-10",
        marks: [{ person_id: "s1", status: "present", source: "rfid" }],
      }).entries[0],
    ).toMatchObject({ studentId: "s1", source: "rfid" });
    expect(
      parseAttendanceDay({
        book: "teacher",
        date: "2026-04-10",
        entries: [{ staff_id: "t1", status: "present" }],
      }).book,
    ).toBe("staff");
    expect(() => parseAttendanceDay({ book: "class", date: "2026-04-10" })).toThrow();
  });
});

describe("daycare punch", () => {
  it("maps student_id", () => {
    expect(parseDaycarePunch({ student_id: "s1" })).toEqual({ studentId: "s1" });
    expect(() => parseDaycarePunch({})).toThrow();
  });
});

describe("messages aliases", () => {
  it("maps box, deliver_at, and policies onto live requests", () => {
    expect(parseMessageBox("unseen")).toBe("unseen");
    expect(parseMessageBox("inbox")).toBe("inbox");
    expect(parseMessageBox(null)).toBe("inbox");
    expect(
      parseMessageCompose({
        body: "hello",
        student_id: "s1",
        category: "fees",
        deliver_at: "2026-04-10T09:00",
        recipients: ["u1"],
      }),
    ).toMatchObject({
      body: "hello",
      studentId: "s1",
      category: "Fees",
      scheduledAt: "2026-04-10T09:00",
      recipientUserId: "u1",
    });
    expect(parseMessageReply({ body: "ok" })).toEqual({ body: "ok" });
    expect(parseMessagePolicies({ roles: ["Teacher"] }).roles).toEqual(["Teacher"]);
    expect(() => parseMessageCompose({})).toThrow();
  });
});

describe("broadcast lists", () => {
  it("maps student_ids and staff_ids", () => {
    expect(
      parseBroadcastList({ name: "Bus A", student_ids: ["s1"], staff_ids: ["t1"] }),
    ).toEqual({
      name: "Bus A",
      studentIds: ["s1"],
      staffIds: ["t1"],
    });
    expect(parseBroadcastMembers({ student_ids: ["s2"] }).studentIds).toEqual(["s2"]);
    expect(() => parseBroadcastList({ name: "x" })).toThrow();
  });
});

describe("form templates and convert-to-student", () => {
  it("maps spec form and enroll bodies onto live admission forms", () => {
    expect(
      parseFormTemplate({
        name: "Nursery 2026",
        kind: "enquiry",
        opens_at: "2026-04-01",
        closes_at: "2026-05-01",
      }),
    ).toMatchObject({
      name: "Nursery 2026",
      kind: "enquiry",
      opensAt: "2026-04-01",
      closesAt: "2026-05-01",
    });
    expect(parseOpenForm({ form_id: "f1", hidden: true })).toMatchObject({
      id: "f1",
      status: "hidden",
    });
    expect(
      parseConvertToStudent({
        class_id: "c1",
        section_id: "s1",
        admission_no: "A-1",
        academic_year_id: "y1",
      }),
    ).toEqual({
      classId: "c1",
      sectionId: "s1",
      admissionNo: "A-1",
      sessionId: "y1",
    });
    expect(() => parseFormTemplate({})).toThrow();
    expect(() => parseConvertToStudent({})).toThrow();
    expect(parseFormTemplatePatch({ status: "hidden" })).toEqual({
      name: undefined,
      kind: undefined,
      status: "hidden",
      belongTo: undefined,
      opensAt: undefined,
      closesAt: undefined,
    });
    expect(() => parseFormTemplatePatch({})).toThrow();
  });
});

describe("vehicles fuel slabs leave marks", () => {
  it("maps snake_case onto live transport and leave-mark inputs", () => {
    expect(
      parseVehicle({
        registration_no: "MP-09",
        route_id: "r1",
        insurance_due: "2026-12-01",
      }),
    ).toMatchObject({
      registrationNo: "MP-09",
      routeId: "r1",
      insuranceDue: "2026-12-01",
    });
    expect(
      parseFuelLog({ vehicle_id: "v1", litres: "20", amount: 500 }),
    ).toMatchObject({ vehicleId: "v1", litres: 20, amount: 500 });
    expect(
      parseTransportSlab({ name: "0-5", from_km: 0, to_km: 5, amount: "800" }),
    ).toMatchObject({ name: "0-5", fromKm: 0, toKm: 5, amount: 800 });
    expect(
      parseLeaveMarkPercent({ leave_type_id: "lt1", percent: "75" }),
    ).toEqual({ leaveTypeId: "lt1", percent: 75 });
    expect(parseLeaveMarkPercentPatch({ percent: "50" })).toEqual({
      leaveTypeId: undefined,
      percent: 50,
    });
    expect(() => parseLeaveMarkPercentPatch({})).toThrow();
    expect(() => parseVehicle({})).toThrow();
    expect(() => parseFuelLog({ litres: 1 })).toThrow();
  });
});

describe("report templates routes fees vehicle extras", () => {
  it("maps snake_case onto live report-template, route, and vehicle patch inputs", () => {
    expect(
      parseReportTemplate({
        name: "Term 1",
        body: "{{name}}",
        section_id: "sec-1",
      }),
    ).toEqual({ name: "Term 1", body: "{{name}}", sectionId: "sec-1" });
    expect(
      parseReportTemplate({ template_id: "t1", section_id: "sec-1" }),
    ).toEqual({ templateId: "t1", sectionId: "sec-1" });
    expect(parseClassReportTemplate({ template_id: "t1" })).toEqual({
      templateId: "t1",
    });
    expect(
      parseRoute({ name: "East", fee_amount: "50", pickups: ["Depot", "Gate"] }),
    ).toEqual({ name: "East", feeAmount: 50, pickups: ["Depot", "Gate"] });
    expect(
      parseVehicle({
        registration_no: "MP-09",
        tracker_id: "trk-1",
        cctv: true,
        capacity: "40",
        fuel_type: "diesel",
      }),
    ).toMatchObject({
      registrationNo: "MP-09",
      trackerId: "trk-1",
      cctv: true,
      capacity: 40,
      fuelType: "diesel",
    });
    expect(
      parseVehiclePatch({ route_id: "none", tracker_id: "trk-2" }),
    ).toMatchObject({ routeId: null, trackerId: "trk-2" });
    expect(() => parseReportTemplate({})).toThrow();
    expect(parseReportTemplatePatch({ body: "{{class}}" })).toEqual({
      name: undefined,
      body: "{{class}}",
    });
    expect(() => parseReportTemplatePatch({})).toThrow();
    expect(() => parseRoute({ name: "East" })).toThrow();
    expect(() => parseVehiclePatch({})).toThrow();
  });
});

describe("deposit slips and events patches", () => {
  it("maps snake_case onto live slip and event patches", () => {
    expect(
      parseDepositSlipPatch({ bank_name: "HDFC", account_ref: "99" }),
    ).toEqual({
      depositedAt: undefined,
      bankName: "HDFC",
      accountRef: "99",
      note: undefined,
    });
    expect(() => parseDepositSlipPatch({})).toThrow();
    expect(parseEventPatch({ title: "Sports day", class_id: "none" })).toEqual({
      title: "Sports day",
      body: undefined,
      classId: null,
      startsAt: undefined,
      endsAt: undefined,
    });
    expect(() => parseEventPatch({})).toThrow();
    expect(
      parseEventQuery({
        get: (key: string) =>
          ({ from: "2026-04-01", to: "2026-04-30", class_id: "none" }[key] ?? null),
      }),
    ).toEqual({ from: "2026-04-01", to: "2026-04-30", classId: null });
    expect(
      parseLibraryCenterPatch({ name: "Annex" }),
    ).toEqual({ name: "Annex" });
    expect(() => parseLibraryCenterPatch({})).toThrow();
  });
});

describe("fuel log slab and route patches", () => {
  it("maps snake_case patches and rejects empty bodies", () => {
    expect(parseFuelLogPatch({ litres: "45", note: "top up" })).toEqual({
      vehicleId: undefined,
      litres: 45,
      amount: undefined,
      odometer: undefined,
      at: undefined,
      note: "top up",
    });
    expect(
      parseTransportSlabPatch({ from_km: 0, to_km: "", amount: "900" }),
    ).toEqual({
      name: undefined,
      fromKm: 0,
      toKm: null,
      amount: 900,
    });
    expect(
      parseRoutePatch({ fee_amount: "75", pickups: ["Depot"] }),
    ).toEqual({ name: undefined, feeAmount: 75, pickups: ["Depot"] });
    expect(() => parseFuelLogPatch({})).toThrow();
    expect(() => parseTransportSlabPatch({})).toThrow();
    expect(() => parseRoutePatch({})).toThrow();
  });
});

describe("store kits library titles questionnaires payslips", () => {
  it("maps snake_case onto live kit delivery title accession and assign inputs", () => {
    expect(
      parseStoreKit({ name: "Sports kit", sku: "KIT-1", price: "450", stock: 2 }),
    ).toEqual({
      name: "Sports kit",
      sku: "KIT-1",
      price: 450,
      vendor: undefined,
      stock: 2,
      unit: undefined,
      type: "kit",
    });
    expect(parseStoreDelivery({ order_id: "o1" })).toEqual({ orderId: "o1" });
    expect(
      parseLibraryTitle({
        name: "Physics",
        isbn: "123",
        copies: "3",
        rack: "A1",
        price: "120",
      }),
    ).toMatchObject({
      title: "Physics",
      isbn: "123",
      qty: 3,
      rack: "A1",
      price: 120,
    });
    expect(parseLibraryAccession({ book_id: "b1" })).toEqual({ bookId: "b1" });
    expect(
      parseQuestionnaireAssign({
        class_id: "c1",
        valid_from: "2026-04-01",
        valid_till: "2026-04-30",
      }),
    ).toEqual({
      classId: "c1",
      opensAt: "2026-04-01",
      closesAt: "2026-04-30",
    });
    expect(
      flattenPayslips([
        {
          year: 2026,
          month: 4,
          slips: [
            {
              id: "p1",
              gross: 50000,
              pf: 1800,
              esi: 375,
              pt: 208,
              tds: 0,
              net: 47617,
              staff: { employeeId: "EMP-1", firstName: "Asha" },
            },
          ],
        },
      ]),
    ).toEqual([
      {
        id: "p1",
        employeeId: "EMP-1",
        staffName: "Asha",
        year: 2026,
        month: 4,
        gross: "50000",
        pf: "1800",
        esi: "375",
        pt: "208",
        tds: "0",
        net: "47617",
      },
    ]);
    expect(() => parseStoreKit({})).toThrow();
    expect(() => parseStoreDelivery({})).toThrow();
    expect(() => parseLibraryTitle({ title: "Physics" })).toThrow();
    expect(() => parseLibraryAccession({})).toThrow();
    expect(() => parseQuestionnaireAssign({})).toThrow();
  });

  it("maps snake_case questionnaire store-product and title patches", () => {
    expect(
      parseQuestionnairePatch({
        name: "Term 2",
        valid_from: "2026-05-01",
        questions: [{ label: "Capital", marks: "2" }],
      }),
    ).toEqual({
      title: "Term 2",
      type: undefined,
      validFrom: "2026-05-01",
      validTill: undefined,
      questions: [{ label: "Capital", marks: 2 }],
    });
    expect(
      parseStoreProductPatch({
        sku: "KIT-2",
        price: "99",
        type: "kit",
        vendor: "Local",
      }),
    ).toEqual({
      name: undefined,
      sku: "KIT-2",
      price: 99,
      type: "kit",
      vendor: "Local",
      unit: undefined,
    });
    expect(
      parseLibraryTitlePatch({
        name: "Chemistry",
        copies: "4",
        rack: "B2",
        price: "80",
      }),
    ).toEqual({
      title: "Chemistry",
      isbn: undefined,
      author: undefined,
      publisher: undefined,
      qty: 4,
      rack: "B2",
      price: 80,
    });
    expect(() => parseQuestionnairePatch({})).toThrow();
    expect(() => parseStoreProductPatch({})).toThrow();
    expect(() => parseLibraryTitlePatch({})).toThrow();
    expect(() => parseStoreProductPatch({ type: "unknown" })).toThrow();
    expect(() => parseLibraryTitlePatch({ qty: 0 })).toThrow();
  });
});

describe("library lost and questionnaire submissions", () => {
  it("maps snake_case onto live lost copies and quiz submission inputs", () => {
    expect(
      parseLibraryLost({ book_id: "b1", copies: "2", note: "missing" }),
    ).toEqual({ bookId: "b1", qty: 2, reason: "missing" });
    expect(
      parseQuestionnaireSubmission({
        student_id: "s1",
        assignment_id: "a1",
        answers: { q1: "Delhi" },
      }),
    ).toEqual({
      respondentId: "s1",
      assignmentId: "a1",
      answers: { q1: "Delhi" },
    });
    expect(() => parseLibraryLost({ book_id: "b1" })).toThrow();
    expect(() => parseQuestionnaireSubmission({ student_id: "s1" })).toThrow();
    expect(parseLibraryAccessionPatch({ accession_no: "ACC-0009" })).toEqual({
      accessionNo: "ACC-0009",
    });
    expect(parseLibraryCopyPatch({ copies: "3", note: "worn" })).toEqual({
      qty: 3,
      reason: "worn",
    });
    expect(() => parseLibraryAccessionPatch({})).toThrow();
    expect(() => parseLibraryCopyPatch({})).toThrow();
  });
});

describe("driver corporate and kit patches", () => {
  it("maps snake_case patches and rejects empty bodies", () => {
    expect(
      parseDriverPatch({ first_name: "Ravi", license_no: "DL-2" }),
    ).toEqual({
      employeeId: undefined,
      firstName: "Ravi",
      lastName: undefined,
      phone: undefined,
      email: undefined,
      licenseNo: "DL-2",
      licenseExpiry: undefined,
    });
    expect(parseCorporatePatch({ name: "Acme Ltd" })).toEqual({
      name: "Acme Ltd",
    });
    expect(parseStoreKitPatch({ price: "50", sku: "KIT-2" })).toMatchObject({
      sku: "KIT-2",
      price: 50,
      type: "kit",
    });
    expect(() => parseDriverPatch({})).toThrow();
    expect(() => parseCorporatePatch({})).toThrow();
  });
});

describe("subject patches", () => {
  it("maps snake_case subject patches and rejects empty bodies", () => {
    expect(
      parseSubjectPatch({
        name: " Accountancy ",
        is_optional: true,
        category_id: "c1",
        parent_subject_id: "eng",
      }),
    ).toEqual({
      name: "Accountancy",
      code: undefined,
      kind: undefined,
      isOptional: true,
      categoryId: "c1",
      typeId: undefined,
      parentSubjectId: "eng",
    });
    expect(parseSubjectPatch({ category_id: "", code: "" })).toEqual({
      name: undefined,
      code: "",
      kind: undefined,
      isOptional: undefined,
      categoryId: "",
      typeId: undefined,
      parentSubjectId: undefined,
    });
    expect(() => parseSubjectPatch({})).toThrow();
    expect(() => parseSubjectPatch({ name: " " })).toThrow();
  });
});

describe("org master patches", () => {
  it("maps name/code patches and rejects empty bodies", () => {
    expect(parseOrgMasterPatch({ name: " Science ", code: "" })).toEqual({
      name: "Science",
      code: "",
    });
    expect(parseOrgMasterPatch({ code: "SCI" })).toEqual({
      name: undefined,
      code: "SCI",
    });
    expect(parseNamePatch({ name: " PGT " })).toEqual({ name: "PGT" });
    expect(() => parseOrgMasterPatch({})).toThrow();
    expect(() => parseOrgMasterPatch({ name: " " })).toThrow();
    expect(() => parseNamePatch({})).toThrow();
  });
});

describe("class teacher flag and prefix patches", () => {
  it("maps snake_case patches and rejects empty bodies", () => {
    expect(parseClassTeacherPatch({ staff_id: "t1" })).toEqual({ staffId: "t1" });
    expect(parseClassTeacherPatch({ staffId: null })).toEqual({ staffId: null });
    expect(
      parseClassFlagsPatch({ send_absent_sms: true, virtual_classroom: false }),
    ).toEqual({ sendAbsentSms: true, virtualClassroom: false });
    expect(
      parseSessionPrefixPatch({ receipt_prefix: "rcp", first_admission_no: "9" }),
    ).toEqual({
      receiptPrefix: "rcp",
      invoicePrefix: undefined,
      admissionPrefix: undefined,
      firstAdmissionNo: 9,
    });
    expect(() => parseClassTeacherPatch({})).toThrow();
    expect(() => parseClassFlagsPatch({})).toThrow();
    expect(() => parseSessionPrefixPatch({})).toThrow();
  });
});

describe("exam group and cctv patches", () => {
  it("maps snake_case patches and rejects empty or invalid bodies", () => {
    expect(
      parseExamGroupPatch({
        name: " Term 2 ",
        exam_type: "GPA",
        session_id: "y1",
        start_date: "2026-06-01",
        is_additional: true,
      }),
    ).toEqual({
      name: "Term 2",
      examType: "GPA",
      groupKind: undefined,
      sessionId: "y1",
      startDate: "2026-06-01",
      endDate: undefined,
      examMonthYear: undefined,
      isAdditional: true,
      revaluationOn: undefined,
      isActive: undefined,
      description: undefined,
    });
    expect(parseCctvPatch({ room: "Hall", url: "https://cams.example/x" })).toEqual({
      name: undefined,
      room: "Hall",
      url: "https://cams.example/x",
    });
    expect(() => parseExamGroupPatch({})).toThrow();
    expect(() => parseExamGroupPatch({ exam_type: "unknown" })).toThrow();
    expect(() => parseCctvPatch({})).toThrow();
    expect(() => parseCctvPatch({ url: "http://cams.example/x" })).toThrow();
  });
});

describe("grade leave-type and period patches", () => {
  it("maps snake_case patches and rejects empty bodies", () => {
    expect(
      parseGradePatch({ letter: " A ", min_pct: 80, max_pct: 100, points: "" }),
    ).toEqual({
      name: undefined,
      letter: "A",
      minPct: 80,
      maxPct: 100,
      points: null,
    });
    expect(parseLeaveTypePatch({ name: " Sick ", days_year: 12 })).toEqual({
      name: "Sick",
      daysYear: 12,
    });
    expect(
      parsePeriodPatch({ start_time: "09:00", end_time: "09:50", sort_order: 1 }),
    ).toEqual({
      name: undefined,
      startTime: "09:00",
      endTime: "09:50",
      sortOrder: 1,
    });
    expect(() => parseGradePatch({})).toThrow();
    expect(() => parseGradePatch({ name: " " })).toThrow();
    expect(() => parseLeaveTypePatch({})).toThrow();
    expect(() => parseLeaveTypePatch({ days_year: 1.5 })).toThrow();
    expect(() => parsePeriodPatch({})).toThrow();
    expect(() => parsePeriodPatch({ start_time: " " })).toThrow();
  });
});

describe("house hostel and visitor patches", () => {
  it("maps snake_case patches and rejects empty bodies", () => {
    expect(parseHousePatch({ name: " Red ", color: "#ab4" })).toEqual({
      name: "Red",
      color: "#ab4",
      description: undefined,
    });
    expect(parseHostelPatch({ name: " Block A ", fee_amount: 1500 })).toEqual({
      name: "Block A",
      feeAmount: 1500,
    });
    expect(parseVisitorPatch({ to_meet: " office ", phone: "" })).toEqual({
      name: undefined,
      phone: null,
      purpose: undefined,
      toMeet: "office",
      note: undefined,
    });
    expect(() => parseHousePatch({})).toThrow();
    expect(() => parseHousePatch({ name: " " })).toThrow();
    expect(() => parseHostelPatch({})).toThrow();
    expect(() => parseHostelPatch({ fee_amount: -1 })).toThrow();
    expect(() => parseVisitorPatch({})).toThrow();
    expect(() => parseVisitorPatch({ name: " " })).toThrow();
  });
});

describe("link and message template patches", () => {
  it("maps snake_case patches and rejects empty bodies", () => {
    expect(parseExternalLinkPatch({ name: " Portal ", url: "https://school.example" })).toEqual({
      title: "Portal",
      url: "https://school.example",
    });
    expect(parseMessageTemplatePatch({ channel: "sms", subject: "", body: " Hello " })).toEqual({
      name: undefined,
      channel: "SMS",
      subject: null,
      body: "Hello",
    });
    expect(() => parseExternalLinkPatch({})).toThrow();
    expect(() => parseExternalLinkPatch({ url: "http://school.example" })).toThrow();
    expect(() => parseMessageTemplatePatch({})).toThrow();
    expect(() => parseMessageTemplatePatch({ channel: "push" })).toThrow();
    expect(() => parseMessageTemplatePatch({ body: " " })).toThrow();
  });
});

describe("live class program and exam form patches", () => {
  it("maps snake_case patches and rejects empty bodies", () => {
    expect(
      parseLiveClassPatch({
        title: " Algebra ",
        meeting_url: "https://meet.google.com/abc",
        class_id: "",
        recording_url: "",
      }),
    ).toEqual({
      title: "Algebra",
      meetingUrl: "https://meet.google.com/abc",
      recordingUrl: null,
      startsAt: undefined,
      provider: undefined,
      classId: null,
      subjectId: undefined,
      staffId: undefined,
    });
    expect(parseProgramPatch({ name: " BBA ", duration_years: 4, code: "" })).toEqual({
      name: "BBA",
      code: null,
      level: undefined,
      durationYears: 4,
      departmentId: undefined,
    });
    expect(
      parseExamFormWindowPatch({ fee_amount: 150, is_active: false, kind: "reval" }),
    ).toEqual({
      kind: "REVAL",
      examGroupId: undefined,
      opensAt: undefined,
      closesAt: undefined,
      feeAmount: 150,
      isActive: false,
    });
    expect(parseExamFormPatch({ subject_ids: ["s1", "s2"] })).toEqual({
      subjectIds: ["s1", "s2"],
    });
    expect(() => parseLiveClassPatch({})).toThrow();
    expect(() => parseLiveClassPatch({ provider: "teams" })).toThrow();
    expect(() => parseProgramPatch({})).toThrow();
    expect(() => parseProgramPatch({ duration_years: 0 })).toThrow();
    expect(() => parseExamFormWindowPatch({})).toThrow();
    expect(() => parseExamFormWindowPatch({ kind: "SUPPLY" })).toThrow();
    expect(() => parseExamFormPatch({})).toThrow();
    expect(() => parseExamFormPatch({ subject_ids: [] })).toThrow();
  });
});
