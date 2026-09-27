const STORAGE_KEY = "heo-permit-watchlist-v1";

export function readWatchlist(storage) {
  try {
    const items = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(items)) return [];
    return [...new Map(items.filter((item) => item && typeof item.key === "string" && typeof item.address === "string")
      .map((item) => [item.key, item])).values()];
  } catch { return []; }
}

export function trackProperty(storage, group, addedAt = new Date().toISOString()) {
  const items = readWatchlist(storage);
  if (items.some((item) => item.key === group.key)) return items;
  const updated = [...items, { key: group.key, address: group.address, parcel: group.parcel || null, neighborhood: group.neighborhood || null, addedAt }];
  storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function untrackProperty(storage, key) {
  const updated = readWatchlist(storage).filter((item) => item.key !== key);
  storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
