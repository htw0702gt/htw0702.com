const ID = "htw0702aov";

function lang() {
  const first = location.pathname.split("/").filter(Boolean)[0];
  return first === "en" || first === "jp" ? first : "tw";
}

function copy() {
  return {
    tw: {
      game: "傳說對決",
      note: "這是我的傳說對決遊戲 ID。個人站只公開 ID，不放戰績與對局。",
    },
    en: {
      game: "Arena of Valor",
      note: "This is my Arena of Valor ID. The personal site publishes the ID only — not match records.",
    },
    jp: {
      game: "伝説対決",
      note: "伝説対決のゲーム ID です。個人サイトでは ID だけ公開し、戦績は出しません。",
    },
  }[lang()];
}

function card() {
  const t = copy();
  const el = document.createElement("article");
  el.className = "mos magnetic reveal in";
  el.dataset.aovId = ID;
  el.innerHTML = `<span class="num">AOV</span><em>${t.game}</em><strong>${ID}</strong><p>${t.note}</p><span class="mos-go">${ID}</span>`;
  return el;
}

function isGamesView() {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.includes("games");
}

function paint() {
  const main = document.getElementById("main");
  if (!main || !isGamesView()) return;
  if (main.querySelector("[data-aov-id]")) return;
  const section = main.querySelector("section.section") || main;
  section.prepend(card());
}

const main = document.getElementById("main");
if (main) {
  const observer = new MutationObserver(() => paint());
  observer.observe(main, { childList: true, subtree: true });
}
paint();
addEventListener("popstate", () => setTimeout(paint, 0));
