import assert from "node:assert/strict";
import test from "node:test";
import { readWatchlist, trackProperty, untrackProperty } from "../src/permit-watchlist.mjs";

function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}
const a = { key: "parcel-a", address: "319 27TH ST", parcel: "parcel-a" };
const b = { key: "parcel-b", address: "3129 LIBERTY AVE", parcel: "parcel-b" };

test("tracking persists separate properties without duplicate entries", () => {
  const storage = memoryStorage();
  assert.deepEqual(readWatchlist(storage), []);
  trackProperty(storage, a, "2026-09-27T00:00:00Z");
  trackProperty(storage, b);
  trackProperty(storage, a);
  const items = readWatchlist(storage);
  assert.equal(items.length, 2);
  assert.equal(items[0].addedAt, "2026-09-27T00:00:00Z");
  assert.equal(items[1].address, b.address);
});

test("removing one property preserves the other property and independent notes", () => {
  const storage = memoryStorage();
  storage.setItem("heo-note:parcel-a", "Check occupancy");
  trackProperty(storage, a);
  trackProperty(storage, b);
  untrackProperty(storage, a.key);
  assert.deepEqual(readWatchlist(storage).map((r) => r.key), [b.key]);
  assert.equal(storage.getItem("heo-note:parcel-a"), "Check occupancy");
  untrackProperty(storage, b.key);
  assert.deepEqual(readWatchlist(storage), []);
});

test("corrupt or inaccessible storage does not crash rendering", () => {
  assert.deepEqual(readWatchlist({ getItem: () => "not JSON" }), []);
  assert.deepEqual(readWatchlist({ getItem: () => { throw new Error("Blocked"); } }), []);
});

test("failed persistence throws so the interface cannot claim a successful save", () => {
  assert.throws(() => trackProperty({ getItem: () => null, setItem: () => { throw new Error("Full"); } }, a), /Full/);
});
