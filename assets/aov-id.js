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
  return /\/games\/aov(?:\/|$)/.test(location.pathname) || /htw0702aov/.test(location.pathname);
}

function isAdminView() {
  return location.hostname === "admin.htw0702.com" || /\/admin\/?$/.test(location.pathname);
}

async function loadRecord() {
  try {
    const r = await fetch("/api/aov", { headers: { Accept: "application/json" } });
    if (r.ok) return r.json();
  } catch {}
  try {
    const r = await fetch("/assets/aov-htw0702aov.json", { headers: { Accept: "application/json" } });
    if (r.ok) return r.json();
  } catch {}
  return null;
}

function ensureRoot() {
  const main = document.getElementById("main");
  if (!main) return null;
  let root = document.getElementById("aov-root");
  if (!root) {
    main.innerHTML = '<section class="section" id="aov-root"></section>';
    root = document.getElementById("aov-root");
  }
  return root;
}

function renderPublic(data) {
  const root = ensureRoot();
  if (!root || !data) return;
  const rank = pick(data.rank);
  root.innerHTML = `
    <article class="mos magnetic reveal in" data-aov-id="${ID}">
      <span class="num">AOV</span>
      <em>${esc(pick(data.role) || "隊長")}</em>
      <strong>${esc(data.handle || ID)}</strong>
      <p>UID ${esc(data.uid || "")} · ${esc(rank)} · ${esc(pick(data.server))}</p>
      <p>${esc(pick(data.note))}</p>
    </article>
    <section class="section">
      <h2>段位</h2>
      <p>${esc(data.rankCard?.season || pick(data.season) || "")} · 更新 ${esc(data.updated || data.rankCard?.updatedAt || "")}</p>
      <p>${esc(rank)} · 積分 ${esc(data.rankCard?.points || "")}/100</p>
    </section>
    <section class="section">
      <h2>常用英雄</h2>
      <div class="cards">${(data.heroPool || []).map((h) => `<article class="mos reveal in"><em>${esc(h.hero || "")}</em><strong>${esc(h.matches || "0")} 場</strong><p>${esc(pick(h.note) || `勝率 ${h.winRate || "—"}%`)}</p></article>`).join("")}</div>
    </section>
    <section class="section">
      <h2>戰績 ${esc(String((data.matches || []).length))}</h2>
      <p>場次 ${esc(data.stats?.played || "")} · 勝 ${esc(data.stats?.wins || "")} · 勝率 ${esc(data.stats?.winRate || "")}% · KDA ${esc(data.stats?.kda || "")} · MVP ${esc(data.stats?.mvp || "")}</p>
      <div class="table-wrap"><table class="aov-matches"><thead><tr><th>日期</th><th>模式</th><th>英雄</th><th>結果</th><th>KDA</th><th>積分</th></tr></thead><tbody>${(data.matches || []).map((m) => {
        const res = m.result || "";
        const cls = res.includes("勝") ? "win" : res.includes("敗") ? "loss" : "";
        return `<tr class="${cls}"><td>${esc(m.date || m.playedAt || "")}</td><td>${esc(m.mode || "")}</td><td>${esc(m.hero || "—")}</td><td>${esc(res)}</td><td>${esc(m.kda || "")}</td><td>${esc(m.rankDelta || "")}</td></tr>`;
      }).join("")}</tbody></table></div>
    </section>`;
}

function pretty(v) {
  return JSON.stringify(v ?? {}, null, 2);
}

async function paintAdmin() {
  if (!isAdminView()) return;
  const studio = document.getElementById("studio");
  if (!studio || document.getElementById("aov-editor")) return;
  const data = (await loadRecord()) || { handle: ID, matches: [] };
  studio.insertAdjacentHTML("beforeend", `<section class="section" id="aov-editor"><h2>傳說對決 · 手動更新</h2><p>不接任何外部戰績 API。公開頁讀這裡存的資料。</p><form id="aov-form"><label>ID <input name="handle" value="${esc(data.handle || ID)}" maxlength="40"></label><label>UID <input name="uid" value="${esc(data.uid || "")}" maxlength="32"></label><label>更新日期 <input name="updated" value="${esc(data.updated || "")}" maxlength="10"></label><label>段位（中） <input name="rank_zh" value="${esc(data.rank?.zh || "")}" maxlength="80"></label><label>段位（英） <input name="rank_en" value="${esc(data.rank?.en || "")}" maxlength="80"></label><label>備註（中） <textarea name="note_zh" rows="2">${esc(data.note?.zh || "")}</textarea></label><label>stats JSON <textarea name="stats" rows="6">${esc(pretty(data.stats))}</textarea></label><label>rankCard JSON <textarea name="rankCard" rows="6">${esc(pretty(data.rankCard))}</textarea></label><label>heroPool JSON <textarea name="heroPool" rows="8">${esc(pretty(data.heroPool || []))}</textarea></label><label>matches JSON <textarea name="matches" rows="16">${esc(pretty(data.matches || []))}</textarea></label><button class="button primary" type="submit">儲存</button><p id="aov-status" role="status"></p></form></section>`);
  document.getElementById("aov-form")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const status = document.getElementById("aov-status");
    const fd = new FormData(ev.target);
    const parse = (name, fallback) => {
      const raw = String(fd.get(name) || "").trim();
      if (!raw) return fallback;
      return JSON.parse(raw);
    };
    status.textContent = "儲存中…";
    try {
      const me = await fetch("/api/me").then((r) => {
        if (!r.ok) throw new Error("未登入");
        return r.json();
      });
      const body = {
        handle: fd.get("handle"),
        uid: fd.get("uid"),
        updated: fd.get("updated"),
        rank: { zh: fd.get("rank_zh"), en: fd.get("rank_en") },
        note: { zh: fd.get("note_zh"), en: data.note?.en || "", jp: data.note?.jp || "" },
        stats: parse("stats", data.stats || {}),
        rankCard: parse("rankCard", data.rankCard || {}),
        heroPool: parse("heroPool", data.heroPool || []),
        matches: parse("matches", data.matches || []),
        seasons: data.seasons || [],
        gameSnapshot: data.gameSnapshot || {},
        manual: true,
      };
      const r = await fetch("/api/aov", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": me.csrf },
        body: JSON.stringify(body),
      });
      const out = await r.json();
      status.textContent = r.ok ? `已儲存 ${out.matches?.length || 0} 場` : `失敗：${out.error || r.status}`;
    } catch (err) {
      status.textContent = `失敗：${err.message || err}`;
    }
  });
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
    if (isAdminView()) paintAdmin();
  }).observe(main, { childList: true, subtree: true });
}
paintPublic();
setTimeout(paintAdmin, 400);
