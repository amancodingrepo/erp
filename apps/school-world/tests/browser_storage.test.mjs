import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  LEGACY_STORAGE_KEYS,
  clearLegacyStorage,
  navigationStorageKey,
  readStoredNavigation,
  saveStoredNavigation,
} from "../src/browser-storage.js";

// School records must come from the school's database, never from browser storage that every
// person on a computer shares. See docs/school-world-hardcoded-values.md (section 2).

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const alice = { id: "u-alice", school: { id: "campus-a" } };
const bob = { id: "u-bob", school: { id: "campus-a" } };
const aliceOtherCampus = { id: "u-alice", school: { id: "campus-b" } };

test("old copies of students, details and school names are removed", () => {
  const storage = fakeStorage(Object.fromEntries(LEGACY_STORAGE_KEYS.map((key) => [key, '{"stale":true}'])));
  storage.setItem("schoolWorld.theme", "dark");
  clearLegacyStorage(storage);
  assert.deepEqual([...storage.data.keys()], ["schoolWorld.theme"]);
});

test("the last page is kept separately for each person and school", () => {
  const storage = fakeStorage();
  saveStoredNavigation(alice, { query: "Aarav", editingStudentId: "STU1" }, storage);
  assert.deepEqual(readStoredNavigation(alice, storage), { query: "Aarav", editingStudentId: "STU1" });
  assert.equal(readStoredNavigation(bob, storage), null, "another person on the same computer");
  assert.equal(readStoredNavigation(aliceOtherCampus, storage), null, "the same person in another campus");
});

test("nothing is stored or read without a signed-in person and school", () => {
  const storage = fakeStorage();
  assert.equal(navigationStorageKey(null), "");
  assert.equal(navigationStorageKey({ id: "u1" }), "");
  saveStoredNavigation({ id: "u1" }, { query: "x" }, storage);
  assert.equal(storage.data.size, 0);
  assert.equal(readStoredNavigation(null, storage), null);
});

test("broken stored values are ignored", () => {
  const storage = fakeStorage({ [navigationStorageKey(alice)]: "not json" });
  assert.equal(readStoredNavigation(alice, storage), null);
  storage.setItem(navigationStorageKey(alice), "[1,2]");
  assert.equal(readStoredNavigation(alice, storage), null);
});

test("main.jsx starts student records empty and reads nothing else from storage", () => {
  const main = readFileSync(fileURLToPath(new URL("../src/main.jsx", import.meta.url)), "utf8");
  assert.doesNotMatch(main, /localStorage|sessionStorage/, "use browser-storage.js");
  assert.match(main, /useState\(\{\}\)/, "student details start empty until the database answers");
  assert.match(main, /clearLegacyStorage\(\)/);
});

test("the school name has no browser-storage or build-time fallback", () => {
  const config = readFileSync(fileURLToPath(new URL("../src/school-config.js", import.meta.url)), "utf8");
  assert.doesNotMatch(config, /localStorage|VITE_SCHOOL_NAME/);
});
