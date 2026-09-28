const ID = "htw0702aov";

function lang() {
  const first = location.pathname.split("/").filter(Boolean)[0];
  return first === "en" || first === "jp" ? first : "tw";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function pick(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v[lang()] || v.zh || v.en || v.jp || "";
}

function isAovView() {
  return /\/games\/aov(?:\/|$)/.test(location.pathname) || /htw0702aov/.test(location.pathname);
}

function injectStyle() {
  if (document.getElementById("aov-skin")) return;
  const s = document.createElement("style");
  s.id = "aov-skin";
  s.textContent = `#aov-root{display:grid;gap:28px;padding:8px 0 48px}#aov-root .aov-hero{position:relative;overflow:hidden;padding:28px 24px 26px}#aov-root .aov-kicker{margin:0 0 10px;color:var(--accent);letter-spacing:.18em;font-size:12px;font-weight:800;text-transform:uppercase}#aov-root .aov-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}#aov-root .aov-stat{padding:18px 16px;min-height:120px}#aov-root .aov-stat b{display:block;font-family:var(--display);font-size:clamp(28px,6vw,44px);letter-spacing:-.05em;line-height:.95}#aov-root .aov-heroes{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}#aov-root .aov-hero-card{padding:18px 16px 16px;min-height:140px}#aov-root .aov-bar{height:6px;border-radius:99px;background:rgba(244,240,232,.08);overflow:hidden;margin-top:12px}#aov-root .aov-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--glow),var(--accent))}#aov-root .aov-table{width:100%;border-collapse:collapse;font-size:14px}#aov-root .aov-table th{text-align:left;color:var(--muted);font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:10px 8px;border-bottom:1px solid var(--line)}#aov-root .aov-table td{padding:12px 8px;border-bottom:1px solid rgba(244,240,232,.06);vertical-align:top}#aov-root .aov-table tr.win td:nth-child(4){color:#7ad7ea;font-weight:800}#aov-root .aov-table tr.loss td:nth-child(4){color:#ff8aa8;font-weight:800}#aov-root .table-wrap{overflow:auto;border-radius:22px;box-shadow:inset 0 0 0 1px var(--line);background:rgba(16,14,26,.62)}#aov-root h2{margin:0 0 14px;font-family:var(--display);font-size:clamp(28px,6vw,52px);letter-spacing:-.045em}`;
  s.textContent += `#aov-root details.aov-detail{padding:16px;margin:8px 0;border-radius:16px}#aov-root details.aov-detail summary{cursor:pointer}#aov-root details.aov-detail dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px}#aov-root details.aov-detail dt{font-size:12px;color:var(--muted)}#aov-root details.aov-detail dd{margin:0;overflow-wrap:anywhere}`;
  document.head.append(s);
}

async function loadRecord() {
  for (const url of ["/api/aov", "/assets/aov-htw0702aov.json"]) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) continue;
      const data = await r.json();
      if (data && (data.handle || data.matches || data.rankCard)) return data;
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
  const detail = m => Object.entries(m).filter(([key,value]) => !["id","date","playedAt","hero","result","mode","label"].includes(key) && value !== "" && value != null && ["string","number","boolean"].includes(typeof value)).map(([key,value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join("");
  root.innerHTML = `
    <article class="mos aov-hero" data-aov-id="${ID}">
      <p class="aov-kicker">Arena of Valor / 傳說對決</p>
      <em>${esc(pick(data.role) || "隊長")}</em>
      <strong>${esc(data.handle || ID)}</strong>
      <p>UID ${esc(data.uid || "")} · ${esc(pick(data.server))}</p>
      <p>${esc(rank)} · ${esc(data.rankCard?.season || pick(data.season))} · 更新 ${esc(data.updated || data.rankCard?.updatedAt || "")}</p>
    </article>
    <section>
      <h2>戰況</h2>
      <div class="aov-stats">
        <article class="mos aov-stat"><small>場次</small><b>${esc(played)}</b></article>
        <article class="mos aov-stat"><small>勝場</small><b>${esc(wins)}</b></article>
        <article class="mos aov-stat"><small>勝率</small><b>${esc(wr)}%</b></article>
        <article class="mos aov-stat"><small>KDA</small><b>${esc(data.stats?.kda || "—")}</b></article>
        <article class="mos aov-stat"><small>MVP</small><b>${esc(data.stats?.mvp || "—")}</b></article>
        <article class="mos aov-stat"><small>段位積分</small><b>${esc(data.rankCard?.points || "—")}</b><p>讀數 ${esc(data.rankCard?.queueReadout || "")}/${esc(data.rankCard?.queueReadoutMax || "100")}</p></article>
      </div>
    </section>
    <section>
      <h2>常用英雄</h2>
      <div class="aov-heroes">${heroes.map((h) => {
        const wrn = Number(h.winRate || 0);
        return `<article class="mos aov-hero-card"><em>${esc(h.hero || "")}</em><strong>${esc(h.matches || "0")} 場</strong><p>勝率 ${esc(h.winRate || "—")}% · 戰力 ${esc(h.power || "—")}</p><p>${esc(pick(h.note))}</p><div class="aov-bar"><i style="width:${Math.max(4, Math.min(100, wrn))}%"></i></div></article>`;
      }).join("") || "<p>尚無英雄資料</p>"}</div>
    </section>
    ${seasons.length ? `<section><h2>模式</h2><div class="aov-heroes">${seasons.map((s) => `<article class="mos aov-hero-card"><em>${esc(s.mode || "模式")}</em><strong>${esc(s.winRate || "—")}%</strong><p>${esc(s.played || "0")} 場 · ${esc(s.wins || "0")} 勝</p></article>`).join("")}</div></section>` : ""}
    <section>
      <h2>對局 ${matches.length}</h2>
      <div class="table-wrap"><table class="aov-table"><thead><tr><th>時間</th><th>模式</th><th>英雄</th><th>結果</th><th>KDA</th><th>分路</th><th>積分</th></tr></thead><tbody>${matches.map((m) => {
        const res = m.result || "";
        const cls = res.includes("勝") ? "win" : res.includes("敗") ? "loss" : "";
        return `<tr class="${cls}"><td>${esc(m.playedAt || m.date || "")}${m.duration ? `<br><small>${esc(m.duration)}</small>` : ""}</td><td>${esc(m.mode || "")}</td><td>${esc(m.hero || "—")}</td><td>${esc(res)}</td><td>${esc(m.kda || "")}</td><td>${esc(m.lane || "")}</td><td>${esc(m.rankDelta || "")}</td></tr>`;
      }).join("")}</tbody></table></div>
    </section>
    <section><h2>對局詳細資料</h2>${matches.map(m => `<details class="mos aov-detail"><summary>${esc(m.playedAt || m.date || "")} · ${esc(m.mode || m.label || "對戰")} · ${esc(m.hero || "—")} · ${esc(m.result || "—")}</summary><dl>${detail(m)}</dl></details>`).join("")}</section>
    <p><a href="https://moohsia.com/roster/htw0702aov">MOOHSIA 原始頁面</a> · <a href="https://htw0702.com">htw0702.com</a></p>`;
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
