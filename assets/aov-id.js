import { renderCharts } from "./aov-charts.js";
const ID = "htw0702aov";

function lang() {
  const first = location.pathname.split("/").filter(Boolean)[0];
  return first === "en" || first === "jp" ? first : "tw";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c]));
}

function pick(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v[lang()] || v.zh || v.en || v.jp || "";
}

function isAovView() {
  return /\/games\/aov(?:\/|$)/.test(location.pathname) || /htw0702aov/.test(location.pathname) || /\/roster\//.test(location.pathname);
}

function injectStyle() {
  if (document.getElementById("aov-skin")) return;
  const s = document.createElement("style");
  s.id = "aov-skin";
  s.textContent = `#aov-root{display:grid;gap:28px;padding:8px 0 64px}#aov-root .aov-hero{padding:28px 24px;border-radius:24px;background:rgba(18,8,24,.72);box-shadow:inset 0 0 0 1px var(--line)}#aov-root .aov-kicker{margin:0 0 10px;color:var(--accent);letter-spacing:.2em;font-size:12px;font-weight:800;text-transform:uppercase}#aov-root .aov-hero strong{display:block;font-family:var(--display);font-size:clamp(36px,8vw,72px);letter-spacing:-.05em;line-height:.95}#aov-root .aov-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}#aov-root .aov-stat,#aov-root .aov-hero-card{padding:18px 16px;border-radius:18px;background:rgba(18,8,24,.72);box-shadow:inset 0 0 0 1px var(--line)}#aov-root .aov-stat b{display:block;font-family:var(--display);font-size:clamp(28px,6vw,44px);letter-spacing:-.05em}#aov-root .aov-heroes{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}#aov-root .aov-bar{height:6px;border-radius:99px;background:rgba(247,241,234,.08);overflow:hidden;margin-top:12px}#aov-root .aov-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--glow),var(--accent))}#aov-root .aov-table{width:100%;border-collapse:collapse;font-size:14px}#aov-root .aov-table th{text-align:left;color:var(--muted);font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:10px 8px;border-bottom:1px solid var(--line)}#aov-root .aov-table td{padding:12px 8px;border-bottom:1px solid rgba(247,241,234,.06);vertical-align:top}#aov-root .aov-table tr.win td:nth-child(4){color:#7ad7ea;font-weight:800}#aov-root .aov-table tr.loss td:nth-child(4){color:#ff8aa8;font-weight:800}#aov-root .table-wrap{overflow:auto;border-radius:22px;box-shadow:inset 0 0 0 1px var(--line);background:rgba(16,8,22,.62)}#aov-root h2{margin:0 0 14px;font-family:var(--display);font-size:clamp(28px,6vw,52px);letter-spacing:-.045em}#aov-root details.aov-detail{padding:16px;margin:8px 0;border-radius:16px;background:rgba(18,8,24,.55);box-shadow:inset 0 0 0 1px var(--line)}#aov-root details.aov-detail summary{cursor:pointer;font-weight:700}#aov-root .board-wrap{overflow:auto;margin-top:12px}#aov-root .board{width:100%;border-collapse:collapse;font-size:13px}#aov-root .board th,#aov-root .board td{padding:8px;border-bottom:1px solid rgba(247,241,234,.08);text-align:left}#aov-root .board tr.owner td{background:rgba(255,59,134,.12)}#aov-root .board caption{text-align:left;padding:8px 0;color:var(--muted);font-size:12px;letter-spacing:.12em;text-transform:uppercase}`;
  document.head.append(s);
}

async function loadRecord() {
  for (const url of ["/api/aov", "/assets/aov-htw0702aov.json", "/data/aov-htw0702aov.json"]) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) continue;
      const data = await r.json();
      const row = data.player && (data.player.handle || data.player.matches) ? data.player : data;
      if (row && (row.handle || row.matches || row.rankCard)) return row;
    } catch {}
  }
  return null;
}

function ensureRoot() {
  const main = document.getElementById("main");
  if (!main) return null;
  let root = document.getElementById("aov-root");
  if (!root) {
    main.innerHTML = '<div id="aov-root"></div>';
    root = document.getElementById("aov-root");
  }
  return root;
}

function boardTable(rows, side) {
  const list = (rows || []).filter((r) => r.side === side);
  if (!list.length) return "";
  const label = side === "red" ? "紅方" : "藍方";
  return `<div class="board-wrap"><table class="board"><caption>${label}</caption><thead><tr><th>玩家</th><th>英雄</th><th>路</th><th>K/D/A</th><th>評分</th><th>輸出</th><th>承傷</th><th>補兵</th><th>積分</th></tr></thead><tbody>${list
    .map(
      (r) =>
        `<tr class="${r.owner ? "owner" : ""}"><td>${esc(r.ign || "")}</td><td>${esc(r.hero || "")}</td><td>${esc(r.lane || "")}</td><td>${esc([r.kills, r.deaths, r.assists].filter((x) => x !== "" && x != null).join(" / "))}</td><td>${esc(r.score || "")}</td><td>${esc(r.heroDamage || "")}</td><td>${esc(r.taken || "")}</td><td>${esc(r.minions || r.lastHits || "")}</td><td>${esc(r.rankDelta || "")}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}

function renderPublic(data) {
  injectStyle();
  const root = ensureRoot();
  if (!root || !data) return;
  const matches = Array.isArray(data.matches) ? data.matches : [];
  const heroes = Array.isArray(data.heroPool) ? data.heroPool : [];
  const seasons = Array.isArray(data.seasons) ? data.seasons : [];
  const rank = pick(data.rank);
  const played = data.stats?.played || matches.length;
  const wins = data.stats?.wins || matches.filter((m) => String(m.result).includes("勝")).length;
  const wr = data.stats?.winRate || "";
  root.innerHTML = `
    <article class="mos aov-hero" data-aov-id="${ID}">
      <p class="aov-kicker">暮霞｜MOS · Arena of Valor</p>
      <em>${esc(pick(data.role) || "隊長")}</em>
      <strong>${esc(data.handle || ID)}</strong>
      <p>UID ${esc(data.uid || "")} · ${esc(pick(data.server))}</p>
      <p>${esc(rank)} · 更新自 <a href="https://moohsia.com/roster/htw0702aov">moohsia.com/roster/htw0702aov</a></p>
    </article>
    <section>
      <h2>戰況</h2>
      <div class="aov-stats">
        <article class="mos aov-stat"><small>場次</small><b>${esc(played)}</b></article>
        <article class="mos aov-stat"><small>勝場</small><b>${esc(wins)}</b></article>
        <article class="mos aov-stat"><small>勝率</small><b>${esc(wr)}%</b></article>
        <article class="mos aov-stat"><small>KDA</small><b>${esc(data.stats?.kda || "—")}</b></article>
        <article class="mos aov-stat"><small>MVP</small><b>${esc(data.stats?.mvp || "—")}</b></article>
      </div>
    </section>
    <section>
      <h2>常用英雄</h2>
      <div class="aov-heroes">${heroes
        .map((h) => {
          const wrn = Number(h.winRate || 0);
          return `<article class="mos aov-hero-card"><em>${esc(h.hero || "")}</em><strong>${esc(h.matches || "0")} 場</strong><p>勝率 ${esc(h.winRate || "—")}% · 戰力 ${esc(h.power || "—")}</p><p>${esc(pick(h.note))}</p><div class="aov-bar"><i style="width:${Math.max(4, Math.min(100, wrn))}%"></i></div></article>`;
        })
        .join("")}</div>
    </section>
    ${seasons.length ? `<section><h2>模式</h2><div class="aov-heroes">${seasons.map((s) => `<article class="mos aov-hero-card"><em>${esc(s.mode || "模式")}</em><strong>${esc(s.winRate || "—")}%</strong><p>${esc(s.played || "0")} 場 · ${esc(s.wins || "0")} 勝</p></article>`).join("")}</div></section>` : ""}
    ${renderCharts(data, esc)}
    <section>
      <h2>對局 ${matches.length}</h2>
      <div class="table-wrap"><table class="aov-table"><thead><tr><th>時間</th><th>模式</th><th>英雄</th><th>結果</th><th>KDA</th><th>分路</th><th>積分</th></tr></thead><tbody>${matches
        .map((m) => {
          const res = m.result || "";
          const cls = res.includes("勝") ? "win" : res.includes("敗") ? "loss" : "";
          return `<tr class="${cls}"><td>${esc(m.playedAt || m.date || "")}${m.duration ? `<br><small>${esc(m.duration)}</small>` : ""}</td><td>${esc(m.mode || "")}</td><td>${esc(m.hero || "—")}</td><td>${esc(res)}</td><td>${esc(m.kda || "")}</td><td>${esc(m.lane || "")}</td><td>${esc(m.rankDelta || "")}</td></tr>`;
        })
        .join("")}</tbody></table></div>
    </section>
    <section><h2>記分板</h2>${matches
      .map(
        (m) =>
          `<details class="mos aov-detail"><summary>${esc(m.playedAt || m.date || "")} · ${esc(m.mode || m.label || "對戰")} · ${esc(m.hero || "—")} · ${esc(m.result || "—")}</summary>${boardTable(m.board, "blue")}${boardTable(m.board, "red")}</details>`,
      )
      .join("")}</section>
    <p><a href="https://moohsia.com/roster/htw0702aov">暮霞原頁</a></p>`;
}

async function paintPublic() {
  if (!isAovView()) return;
  const data = await loadRecord();
  if (data) renderPublic(data);
}

const main = document.getElementById("main");
if (main) {
  new MutationObserver(() => {
    if (isAovView() && !document.querySelector("[data-aov-id]")) paintPublic();
  }).observe(main, { childList: true, subtree: true });
}
paintPublic();
