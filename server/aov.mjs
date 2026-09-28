const HANDLE = "htw0702aov";
const KEY = "aov-htw0702aov";
const MAX = 900000;

function clip(v, n) {
  return String(v ?? "").trim().slice(0, n);
}

function num(v) {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return clip(v, 16);
}

function pair(v) {
  const o = v && typeof v === "object" ? v : {};
  return { zh: clip(o.zh, 80), en: clip(o.en, 80) };
}

function cleanMatch(row) {
  const m = row && typeof row === "object" ? row : {};
  const board = [];
  for (const item of Array.isArray(m.board) ? m.board.slice(0, 10) : []) {
    if (!item || typeof item !== "object") continue;
    board.push({
      side: item.side === "red" ? "red" : "blue",
      hero: clip(item.hero, 40),
      ign: clip(item.ign, 40),
      kills: num(item.kills),
      deaths: num(item.deaths),
      assists: num(item.assists),
      gold: num(item.gold),
      mvp: item.mvp === true,
      owner: item.owner === true,
    });
  }
  return {
    id: clip(m.id, 48) || crypto.randomUUID().slice(0, 12),
    label: clip(m.label, 80),
    date: clip(m.date, 10),
    playedAt: clip(m.playedAt, 40),
    duration: clip(m.duration, 8),
    mode: clip(m.mode, 80),
    hero: clip(m.hero, 40),
    result: clip(m.result, 20),
    kda: clip(m.kda, 40),
    kills: num(m.kills),
    deaths: num(m.deaths),
    assists: num(m.assists),
    gold: num(m.gold),
    damage: num(m.damage),
    taken: num(m.taken),
    minions: num(m.minions),
    lastHits: num(m.lastHits),
    jungleGold: num(m.jungleGold),
    mvp: m.mvp === true,
    rankDelta: clip(m.rankDelta, 8),
    powerDelta: clip(m.powerDelta, 8),
    map: clip(m.map, 80),
    skin: clip(m.skin, 80),
    blueScore: num(m.blueScore),
    redScore: num(m.redScore),
    winner: m.winner === "red" ? "red" : m.winner === "blue" ? "blue" : "",
    ownerSide: m.ownerSide === "red" ? "red" : m.ownerSide === "blue" ? "blue" : "",
    board,
  };
}

export function cleanAov(input, fallback) {
  const src = input && typeof input === "object" ? input : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const matches = Array.isArray(src.matches) ? src.matches.slice(0, 200).map(cleanMatch) : Array.isArray(base.matches) ? base.matches : [];
  return {
    handle: clip(src.handle || base.handle || HANDLE, 40) || HANDLE,
    uid: clip(src.uid || base.uid, 32),
    role: pair(src.role || base.role),
    rank: pair(src.rank || base.rank),
    season: pair(src.season || base.season),
    server: pair(src.server || base.server),
    updated: clip(src.updated || new Date().toISOString().slice(0, 10), 10),
    manual: true,
    note: {
      zh: clip(src.note?.zh || base.note?.zh, 240),
      en: clip(src.note?.en || base.note?.en, 240),
      jp: clip(src.note?.jp || base.note?.jp, 240),
    },
    stats: src.stats && typeof src.stats === "object" ? src.stats : base.stats || {},
    rankCard: src.rankCard && typeof src.rankCard === "object" ? src.rankCard : base.rankCard || {},
    gameSnapshot: src.gameSnapshot && typeof src.gameSnapshot === "object" ? src.gameSnapshot : base.gameSnapshot || {},
    heroPool: Array.isArray(src.heroPool) ? src.heroPool.slice(0, 20) : base.heroPool || [],
    seasons: Array.isArray(src.seasons) ? src.seasons.slice(0, 12) : base.seasons || [],
    powerBoard: src.powerBoard && typeof src.powerBoard === "object" ? src.powerBoard : base.powerBoard || {},
    matches,
  };
}

export async function readAov(env, fallback) {
  if (env?.DB) {
    try {
      const row = await env.DB.prepare("SELECT value FROM sync_state WHERE name = ?").bind(KEY).first();
      if (row?.value) return cleanAov(JSON.parse(row.value), fallback);
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
