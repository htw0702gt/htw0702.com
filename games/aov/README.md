# games/aov

Personal-site home for the Arena of Valor record that used to live on moohsia.com.

## Public

- Page: `/tw/games/aov/htw0702aov`
- JSON: `/api/aov`
- Alias: `/roster/htw0702aov`

moohsia.com `/roster/htw0702aov` now redirects here. The guild site no longer stores owner match history.

## Admin

- `/admin` and `/tw/admin` stay on this repository (`aov-admin.html`, `server/aov-admin.mjs`).
- Do not use admin.moohsia.com to edit this player anymore.

## Why this is not a raw unzip of moohsia.com

moohsia.com is a separate Cloudflare Worker (guild, apply, Notion roster, D1 `moohsia-cms`). Dropping that tree under `/games/aov` as-is would boot a second site with the wrong bindings.

What moved:

- Public player page renderer: `assets/aov-id.js`
- MOS colors: `assets/mos-tokens.css`
- Live-or-local record: `src/worker.js` (`/api/aov`)
- Stored snapshot: `data/aov-htw0702aov.json`

The guild marketing site stays at https://moohsia.com without the owner fight history.
