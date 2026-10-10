# ep1cLIVE

A one-page personal site for the streamer ep1cLIVE. Static files only — no build step,
no framework, no dependencies at runtime. Drop it on GitHub Pages and it works.

The design is **Y2K**: the era of fan portals and starfield backgrounds. A twinkling
starfield, a centered fixed-width column, beveled "window" panels with glossy title bars,
gel buttons, a scrolling marquee, LED digits, an odometer hit counter and 88×31-style web
badges. It is deliberately *not* pink and sparkly — the palette is deep-space navy, chrome
silver and neon cyan, with hot red for the on-air state.

Underneath the nostalgia it is still real: the schedule, the countdown, the studio clock,
the on-air state and the viewer count all come from live data, not decoration.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | All of the copy and the page structure. Also holds the `ep1c-data` JSON block (time zone, channel, weekly schedule). |
| `styles.css` | Every visual. Design tokens live at the top in `:root`. |
| `app.js` | Computes the next stream, the countdown, the studio clock, the on-air state and the hit counter. No libraries. |
| `status.json` | **The only file that says whether you are live.** |
| `favicon.svg` | The chrome star tab icon. |
| `tests/tz.test.cjs` | Checks the schedule maths, including daylight saving. |
| `.github/workflows/status.yml` | Optional: polls the Twitch API every 5 minutes and commits `status.json` for you. |

There are no web fonts and no images to load. The type is the period-correct set —
Verdana/Tahoma for body and UI copy, Impact for the logo and headings, Trebuchet MS for
the day names, Courier New for anything that looks like a machine readout. Every one of
them is a system font, so the first paint is instant.

## Put it on GitHub Pages

1. Create a repository (the name does not matter) and push these files to the default branch.
2. In the repo: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. Wait a minute. The site is at `https://<user>.github.io/<repo>/`.
4. Edit the two placeholder URLs in `index.html` (search for `TODO`) and set them to that address.
5. If the site lives at `https://<user>.github.io/<repo>/`, the Twitch embed needs that exact
   host in `twitchParent` — see below.

Everything is served as-is, so `git push` is the deploy. `.nojekyll` is already present so
GitHub does not run Jekyll over the files.

## Change these first

| What | Where |
| --- | --- |
| Bio line | `index.html` — the `.hero__line` paragraph |
| Schedule | `ep1c-data` at the bottom of `index.html`. `dow` is 0 = Sunday. `label` is what visitors read, `time` is 24h and must match `label`. |
| Time zone | `ep1c-data` → `tz`. Any IANA zone works (`America/Chicago`, `Europe/London`, …). DST is handled. |
| Social links | `#watch` section in `index.html` — currently set to the handles below. |
| Clips | `#clips` in `index.html`. Each tile is an `<a>`; to use a real thumbnail add `<img src="…" alt="…">` as the first child of `.clip__frame`. The gradient is the fallback art. |
| Setup specs | `#rig` in `index.html`. |
| Colours | `:root` at the top of `styles.css`. |
| Marquee copy | The `.marquee` strip right under `<body>`. Keep the content duplicated — the loop scrolls to exactly 50%. |

The links currently point at:

| Where | Handle |
| --- | --- |
| Twitch | [twitch.tv/ep1cLIVE](https://www.twitch.tv/ep1cLIVE) |
| YouTube | [youtube.com/@ep2cLIVE](https://www.youtube.com/@ep2cLIVE) |
| Twitter | [twitter.com/ep1cLIVE](https://twitter.com/ep1cLIVE) |
| Discord | [dsc.gg/ep1c](https://dsc.gg/ep1c) |
| TikTok | [tiktok.com/@ep1clivewitha1](https://www.tiktok.com/@ep1clivewitha1) |
| Business email | ep1cbizinquiries@gmail.com |

## Turning the site live

`status.json` decides everything. Default (off air):

```json
{ "live": false, "title": "", "game": "", "viewers": 0, "startedAt": "", "note": "" }
```

When you go live:

```json
{
  "live": true,
  "title": "Ranked until someone dodges",
  "game": "Valorant",
  "viewers": 1284,
  "startedAt": "2026-10-10T01:12:00Z",
  "note": ""
}
```

`live: true` fills the LIVE half of the logo red, lights the tally, flips the `live_player.exe`
badge to LIVE, switches the countdown from "time until" to "time on air", and shows the viewer
count. `startedAt` is an ISO timestamp (UTC) and drives the uptime. `note` is optional text
shown when you are offline — handy for "back Friday, I'm at a wedding".

Two ways to keep it accurate:

- **By hand.** Edit `status.json` on github.com and commit. Works from your phone.
- **Automatically.** Add `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` as repository secrets
  (Settings → Secrets and variables → Actions). Get both from
  [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps). The workflow refreshes
  every 5 minutes. Without the secrets it exits quietly and leaves your file alone.
  GitHub may delay scheduled runs at busy times, so treat it as "roughly current".

### The Twitch player

The player only appears when `status.json` says live **and** `twitchParent` in `ep1c-data` is
set to the exact host serving the page — Twitch requires the `parent` parameter to match.
For `https://yourname.github.io/streamer-site/` use `"twitchParent": "yourname.github.io"`.
Leave it empty and the section shows a plain message with your links instead of a broken
iframe, which is the right default while you are still testing.

### The hit counter

There is no server on GitHub Pages, so a global visitor number cannot be honest. The odometer
therefore counts **visits made from your own browser** (stored in `localStorage`) and says so
underneath. Want a real global counter? Drop in a third-party hit-counter script and swap the
`.counter` element — but it will set a tracking cookie, which is why the badge reads
"NO COOKIES ★ NO TRACKERS" out of the box.

## Editing with Claude Code

`.claude/skills/frontend-design/` contains Anthropic's official `frontend-design` skill
(from [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design),
Apache-2.0, see its `LICENSE.txt`). Open this folder in Claude Code and the skill is picked up
automatically, so a request like "make the clips section feel less like a card grid" comes back
with choices that match the existing art direction instead of generic defaults.

## Checking your work

```bash
node tests/tz.test.cjs     # schedule maths incl. DST edges
npx serve .                # or: python3 -m http.server 3000
```

Serve it over HTTP rather than opening the file directly — `status.json` is fetched, and
`file://` fetches are blocked by the browser, so the page will render as permanently off air.

## Verified

- 12 schedule/time-zone checks pass, including the US daylight-saving switch and a second zone.
- The page was loaded over HTTP in a DOM with `status.json` both off air and live: the week
  grid, next-stream label, countdown, clock, tally, viewer count, uptime, player badge and hit
  counter all populate correctly, and the Twitch iframe is only injected when the parent host
  is configured.
- Every referenced asset (CSS, JS, favicon, JSON) returns 200.

Not verified here: the actual pixel result in a real browser, and the Twitch embed rendering on
the live origin. Open the preview and check those.

## Accessibility and behaviour notes

- Keyboard focus is visible on every interactive element; there is a skip link.
- `prefers-reduced-motion` stops the starfield twinkle, both marquees, the blinking tagline and
  every entrance animation.
- Both scrolling strips pause on hover, so nothing moves forever without a way to stop it.
- The on-air state is announced to screen readers, and the rainbow divider and badges are
  decorative (`aria-hidden`).
- Colour is never the only signal: the tally always has a word next to the lamp.
