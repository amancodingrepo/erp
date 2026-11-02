import { describe, expect, it } from "vitest";
import {
  assignBookCenter,
  attachBookCenters,
  dropBookCenterAssignsByBook,
  parseBookCenterAssigns,
  parseLibraryCenters,
  setLibraryCenterDeleted,
  upsertLibraryCenter,
} from "./campus-library-centers";

describe("library book centers", () => {
  it("keeps unique active names, soft-deletes, and assigns live books", () => {
    const first = upsertLibraryCenter(parseLibraryCenters([]), { name: "Main stack" });
    expect(first[0]?.status).toBe("active");
    expect(() => upsertLibraryCenter(first, { name: "Main stack" })).toThrow();
    const closed = setLibraryCenterDeleted(first, first[0]!.id, true);
    expect(closed[0]?.status).toBe("deleted");
    expect(closed[0]?.deletedAt).toBeTruthy();
    const reopened = upsertLibraryCenter(closed, { name: "Main stack" });
    expect(reopened.filter((row) => row.status === "active")).toHaveLength(1);
    expect(() => setLibraryCenterDeleted(first, "missing", true)).toThrow();

    const assigns = assignBookCenter(
      parseBookCenterAssigns([]),
      { bookId: "b1", centerId: first[0]!.id },
      first,
    );
    expect(attachBookCenters([{ id: "b1", title: "Physics" }], assigns, first)[0]).toMatchObject({
      center: "Main stack",
    });
    expect(() =>
      assignBookCenter([], { bookId: "b1", centerId: first[0]!.id }, closed),
    ).toThrow();
    expect(() =>
      assignBookCenter([], { bookId: "b1", centerId: "missing" }, first),
    ).toThrow();
    expect(dropBookCenterAssignsByBook(assigns, "b1")).toEqual([]);
    expect(dropBookCenterAssignsByBook(assigns, "other")).toEqual(assigns);
    expect(upsertLibraryCenter(first, { id: first[0]!.id, name: "Annex" })[0]?.name).toBe(
      "Annex",
    );
  });
});
