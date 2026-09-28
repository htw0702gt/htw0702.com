import seo from "../data/seo.json" with { type: "json" };

const htmlLang = { tw: "zh-Hant-TW", en: "en-US", jp: "ja-JP" };
const ogLocale = { tw: "zh_TW", en: "en_US", jp: "ja_JP" };
const hreflang = { tw: "zh-Hant", en: "en", jp: "ja" };

export const KNOWN = new Set([
  "",
  "wiki",
  "blog",
  "works",
  "store",
  "social",
  "me",
  "contact",
  "search",
  "admin",
  "now",
  "games",
  "games/aov",
  "games/aov/htw0702aov",
]);

export function isKnownRoute(route) {
  if (KNOWN.has(route)) return true;
  return String(route || "").startsWith("games/aov");
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

export function pageKey(route) {
  if (route === "me" || route === "contact") return "social";
  if (String(route || "").startsWith("games")) return "games";
  return route || "home";
}

export function publicPath(locale, route) {
  if (route === "me" || route === "contact") return `/${locale}/social`;
  return route ? `/${locale}/${route}` : `/${locale}`;
}

export function renderDocument(html, { locale, route, status, query }) {
  const pack = seo.locales[locale] || seo.locales.tw;
  const missing = status === 404;
  const canonicalRoute = route === "me" || route === "contact" ? "social" : route || "";
  const key = missing ? "404" : pageKey(canonicalRoute);
  const page = pack[key] || pack["404"];
  const origin = "https://htw0702.com";
  const path = missing
    ? `/${locale}${route ? "/" + route : ""}`
    : publicPath(locale, canonicalRoute);
  const canonical = origin + path;
  const altRoute = missing ? "" : canonicalRoute;
  const alternates = ["tw", "en", "jp"]
    .map((l) => {
      const p = altRoute ? `/${l}/${altRoute}` : `/${l}`;
      return `<link rel="alternate" hreflang="${hreflang[l]}" href="${origin}${p}" />`;
    })
    .join("\n    ");
  const xdefault = origin + (altRoute ? `/tw/${altRoute}` : "/tw");
  const noindex = missing || route === "admin" || (route === "search" && query);
  const robots = noindex ? "noindex, follow" : "index, follow";
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "王顚筳",
    alternateName: ["筳筳", "Wang Hao Ting", "htw0702"],
    url: "https://htw0702.com/tw",
    email: "taiwan@htw0702.com",
    image: origin + "/assets/og.png",
    sameAs: [
      "https://instagram.com/htw0702ig",
      "https://www.threads.net/@htw0702threads",
      "https://x.com/htw0702x",
    ],
  };
  const ld =
    missing || route === "admin"
      ? ""
      : `<script type="application/ld+json">${JSON.stringify(person).replace(/</g, "\\u003c")}</script>`;
  const block = `<!--seo-->
    <title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${canonical}" />
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${xdefault}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="htw0702" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${seo.image}" />
    <meta property="og:locale" content="${ogLocale[locale] || "zh_TW"}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(page.title)}" />
    <meta name="twitter:description" content="${esc(page.description)}" />
    <meta name="twitter:image" content="${seo.image}" />
    ${ld}
    <script type="application/json" id="seo">${JSON.stringify(seo).replace(/</g, "\\u003c")}</script>
  <!--/seo-->`;
  return html
    .replace(/<html lang="[^"]*">/, `<html lang="${htmlLang[locale] || "zh-Hant-TW"}">`)
    .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, block);
}
