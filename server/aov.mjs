const HANDLE = "htw0702aov";
const KEY = "aov-htw0702aov";
const MAX = 900000;
function clip(v, n) { return String(v ?? "").trim().slice(0, n); }
function pair(v) { const o = v && typeof v === "object" ? v : {}; return { zh: clip(o.zh, 80), en: clip(o.en, 80) }; }
function safeValue(value, depth = 0) {
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return clip(value, 500);
  if (depth >= 8) return null;
  if (Array.isArray(value)) return value.slice(0, 100).map(item => safeValue(item, depth + 1));
  if (typeof value !== "object") return null;
  return Object.fromEntries(Object.entries(value).filter(([key]) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(key) && key.length <= 40).slice(0, 100).map(([key, item]) => [key, safeValue(item, depth + 1)]));
}
function cleanMatch(row) {
  const m = row && typeof row === "object" ? row : {};
  return safeValue(m);
}
export function cleanAov(input, fallback) {
  const src = input && typeof input === "object" ? input : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const matches = Array.isArray(src.matches) ? src.matches.slice(0, 500).map(cleanMatch) : Array.isArray(base.matches) ? base.matches : [];
  return {
    handle: clip(src.handle || base.handle || HANDLE, 40) || HANDLE,
    uid: clip(src.uid || base.uid, 32),
    role: pair(src.role || base.role),
    rank: pair(src.rank || base.rank),
    season: pair(src.season || base.season),
    server: pair(src.server || base.server),
    peakRank: pair(src.peakRank || base.peakRank),
    signatureHeroes: pair(src.signatureHeroes || base.signatureHeroes),
    updated: clip(src.updated || base.updated, 10),
    manual: true,
    note: { zh: clip(src.note?.zh || base.note?.zh, 240), en: clip(src.note?.en || base.note?.en, 240), jp: clip(src.note?.jp || base.note?.jp, 240) },
    stats: src.stats && typeof src.stats === "object" ? src.stats : base.stats || {},
    rankCard: src.rankCard && typeof src.rankCard === "object" ? src.rankCard : base.rankCard || {},
    name: pair(src.name || base.name), lane: pair(src.lane || base.lane), title: pair(src.title || base.title), bio: pair(src.bio || base.bio),
    avatar: src.avatar ?? base.avatar ?? null, joinDate: clip(src.joinDate || base.joinDate, 40),
    heroPool: Array.isArray(src.heroPool) ? src.heroPool.slice(0, 20) : base.heroPool || [],
    seasons: Array.isArray(src.seasons) ? src.seasons.slice(0, 12) : base.seasons || [],
    reputation: src.reputation && typeof src.reputation === "object" ? src.reputation : base.reputation || {},
    championships: Array.isArray(src.championships) ? src.championships : base.championships || [],
    honorTitles: Array.isArray(src.honorTitles) ? src.honorTitles : base.honorTitles || [],
    gameSnapshot: src.gameSnapshot && typeof src.gameSnapshot === "object" ? src.gameSnapshot : base.gameSnapshot || {},
    powerBoard: src.powerBoard && typeof src.powerBoard === "object" ? src.powerBoard : base.powerBoard || {},
    yearTreasure: src.yearTreasure && typeof src.yearTreasure === "object" ? src.yearTreasure : base.yearTreasure || {},
    weeklyReports: Array.isArray(src.weeklyReports) ? src.weeklyReports : base.weeklyReports || [],
    skins: Array.isArray(src.skins) ? src.skins : base.skins || [],
    builds: Array.isArray(src.builds) ? src.builds : base.builds || [],
    matches,
  };
}
export async function readAov(env, fallback) {
  if (env?.DB) {
    try {
      const row = await env.DB.prepare("SELECT value FROM sync_state WHERE name = ?").bind(KEY).first();
      if (row?.value) {
        const current = cleanAov(JSON.parse(row.value), fallback);
        const existing = new Set(current.matches.map(m => m.id || `${m.playedAt}|${m.hero}|${m.result}`));
        current.matches.push(...(fallback.matches || []).filter(m => !existing.has(m.id || `${m.playedAt}|${m.hero}|${m.result}`)));
        return current;
      }
    } catch {}
  }
  return cleanAov(fallback, fallback);
}
export async function writeAov(env, raw, fallback) {
  const next = cleanAov(raw, fallback);
  const text = JSON.stringify(next);
  if (text.length > MAX) throw new Error("too large");
  await env.DB.prepare("INSERT INTO sync_state(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(KEY, text).run();
  return next;
}
export { HANDLE, KEY, MAX };
