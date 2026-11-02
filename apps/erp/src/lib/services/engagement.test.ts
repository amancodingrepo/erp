import { PaymentMethod } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  assignTemplateToSections,
  attachStoreCatalog,
  attachStoreGateway,
  checkoutAmount,
  deliveredStoreOrders,
  assertKitProduct,
  kitsFromProducts,
  markStorePaidByGateway,
  mergeSiblingGroup,
  parseFeeUploadRows,
  parsePhotoUploadRows,
  parseQuestionnaires,
  parseSiblingGroups,
  parseStoreCatalog,
  parseStoreOrders,
  parseStoreVendors,
  scoreQuiz,
  dropQuestionnaireExtra,
  dropReportTemplateAssignsByTemplate,
  dropStoreCatalogItem,
  dropStoreVendor,
  dropVendorFromCatalog,
  upsertStoreVendor,
  siblingsOf,
  performanceAssigned,
  templateForClass,
  upsertReportTemplateAssign,
  upsertStoreCatalog,
} from "./engagement";

describe("siblings", () => {
  it("merges overlapping live student ids into one group", () => {
    const first = mergeSiblingGroup([], ["a", "b"]);
    expect(first).toEqual([{ groupId: "sib-a", studentIds: ["a", "b"] }]);
    const next = mergeSiblingGroup(first, ["b", "c"]);
    expect(next).toHaveLength(1);
    expect(next[0].studentIds.sort()).toEqual(["a", "b", "c"]);
    expect(siblingsOf(next, "b").studentIds.sort()).toEqual(["a", "c"]);
    expect(parseSiblingGroups([{ groupId: "g", studentIds: ["x"] }])).toEqual([]);
  });
});

describe("store vendors", () => {
  it("keeps unique named suppliers for catalog rows", () => {
    const rows = upsertStoreVendor(parseStoreVendors([]), { name: "Local Press" });
    expect(upsertStoreVendor(rows, { name: "local press" })).toHaveLength(1);
    expect(dropStoreVendor(rows, rows[0]!.id)).toEqual([]);
    expect(
      dropVendorFromCatalog(
        [{ itemId: "i1", sku: "A", price: 1, type: "kit", vendor: "Local Press" }],
        "local press",
      )[0]?.vendor,
    ).toBe("");
  });
});

describe("store catalog", () => {
  it("attaches sku price type onto live inventory items", () => {
    const rows = parseStoreCatalog([
      { itemId: "i1", sku: "KIT-1", price: 450, type: "kit", vendor: "Local" },
      { itemId: " ", sku: "skip" },
    ]);
    const next = upsertStoreCatalog(rows, "i2", { type: "uniform", price: 200 });
    const attached = attachStoreCatalog([{ id: "i1", name: "Sports kit" }], next);
    expect(attached[0].catalog?.sku).toBe("KIT-1");
    expect(attached[0].catalog?.type).toBe("kit");
    expect(attached[0].catalog?.price).toBe(450);
    const order = parseStoreOrders([
      { id: "o1", studentId: "s1", itemId: "i1", qty: 2, amount: 900, source: "parent" },
    ])[0];
    expect(order.status).toBe("open");
    expect(order.amount).toBe(900);
    expect(order.source).toBe("parent");
    expect(checkoutAmount(450, 2)).toBe(900);
    const linked = attachStoreGateway([order], "o1", "order_abc");
    expect(markStorePaidByGateway(linked, "order_abc")[0].status).toBe("paid");
    expect(dropStoreCatalogItem(next, "i1").map((row) => row.itemId)).toEqual([
      "i2",
    ]);
    expect(kitsFromProducts(attached)).toHaveLength(1);
    expect(assertKitProduct(attached[0]!)).toBe(attached[0]);
    expect(() =>
      assertKitProduct({ id: "i2", catalog: { type: "item" } }),
    ).toThrow();
    expect(
      deliveredStoreOrders([
        order,
        { ...order, id: "o2", status: "delivered" },
      ]),
    ).toHaveLength(1);
  });
});

describe("questionnaires", () => {
  it("scores live question marks from answers", () => {
    const extras = parseQuestionnaires([
      {
        formId: "f1",
        type: "Quiz",
        questions: [
          { label: "Capital", marks: 2 },
          { label: "River", marks: 3 },
        ],
      },
    ]);
    expect(extras[0].totalMarks).toBe(5);
    expect(
      scoreQuiz(extras[0].questions, { Capital: "correct", River: 1 }),
    ).toEqual({ score: 3, total: 5 });
    expect(dropQuestionnaireExtra(extras, "f1")).toEqual([]);
    expect(dropQuestionnaireExtra(extras, "other")).toEqual(extras);
  });
});

describe("report templates", () => {
  it("keeps one marksheet template per live section", () => {
    const next = upsertReportTemplateAssign(
      [{ sectionId: "sec-a", templateId: "old" }],
      "sec-a",
      "tmpl-1",
    );
    expect(next).toEqual([{ sectionId: "sec-a", templateId: "tmpl-1" }]);
  });

  it("requires a template on at least one class section before the desk opens", () => {
    expect(
      performanceAssigned([{ sectionId: "sec-a", templateId: "t1" }], ["sec-b"]),
    ).toBe(false);
    expect(
      performanceAssigned([{ sectionId: "sec-a", templateId: "t1" }], [
        "sec-a",
        "sec-b",
      ]),
    ).toBe(true);
  });

  it("drops section assigns when a template is removed", () => {
    const rows = upsertReportTemplateAssign([], "sec-a", "tmpl-1");
    expect(dropReportTemplateAssignsByTemplate(rows, "tmpl-1")).toEqual([]);
    expect(dropReportTemplateAssignsByTemplate(rows, "other")).toEqual(rows);
  });

  it("assigns one marksheet to every class section", () => {
    const next = assignTemplateToSections(
      [{ sectionId: "sec-a", templateId: "old" }],
      ["sec-a", "sec-b"],
      "tmpl-1",
    );
    expect(next).toEqual([
      { sectionId: "sec-a", templateId: "tmpl-1" },
      { sectionId: "sec-b", templateId: "tmpl-1" },
    ]);
    expect(templateForClass(next, ["sec-a", "sec-b"]).templateId).toBe("tmpl-1");
    expect(templateForClass(next, ["sec-a", "sec-c"]).templateId).toBe("");
    expect(() => assignTemplateToSections([], [], "tmpl-1")).toThrow();
    expect(() => assignTemplateToSections([], ["sec-a"], " ")).toThrow();
  });
});

describe("bulk csv", () => {
  it("reads fee and photo rows from live header names", () => {
    const fees = parseFeeUploadRows(
      "admissionNo,invoiceId,amount,method\nA1,inv-1,500,UPI\nA2,inv-2,0,CASH\n",
    );
    expect(fees[0]).toMatchObject({
      admissionNo: "A1",
      invoiceId: "inv-1",
      amount: 500,
      method: PaymentMethod.UPI,
    });
    const photos = parsePhotoUploadRows(
      "scholarNo,photoUrl\nSC-9,https://files.example/a.jpg\n",
    );
    expect(photos[0]).toMatchObject({
      scholarNo: "SC-9",
      photoUrl: "https://files.example/a.jpg",
    });
  });
});
