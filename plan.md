# Mewxus — a cute pastel pixel-art web driver for the Yodall Nexus 61S

A full replacement for the official (clunky) Next.js WebHID driver, built with **Laravel + Blade + htmx + Alpine.js + UnoCSS**, themed **cutesy pastel pixel-art on the Catppuccin Latte palette**, deployed on **Railway** from a new GitHub repo.

The protocol is already fully reverse-engineered from the official driver's JS bundle (research complete — nothing blocked on this):

- **Device**: `navigator.hid.requestDevice` filters `{vendorId:0xFEED, productId:0x5EEA, usagePage:1, usage:0}` + `{vendorId:0xFEED, productId:0x0EEA, usagePage:0xFF00, usage:1}`; bootloader `0x0C45:0x0500`
- **Transport**: 64-byte packets, `sendReport(0, [cmd, ...args])`, zero-padded; responses via `inputreport` events, payload at bytes `[8..63]`; first-byte `0xA0` packets are async live key-travel events (great for a live "key pressed" animation); serialized command queue
- **Commands**: memory read/write via cmd `0x55` with sub-commands — keymap (`7`/`8` read, `9` write, 3 bytes/key `[type,code1,code2]`, 128 slots × 4 layers, addr `2048*layer+512*profile+3*key`), config block (`5` read / `6` write), per-key color (`10`/`11`/`222`), macros (`12`, 2048 B/profile), RT/travel (`160`/`161`), DKS (`162`/`163`), MT (`164`/`165`), TGL (`166`/`167`), calibration (`168`/`169`), reset (`238`), factory reset (`6,[15,255]`), boot mode (`0x5F`)
- **Data structures**: keymap types (`0x10` normal = modifier-mask+HID-usage, `0x70` macro, `0x90` DKS, `0x91` toggle, `0xE0`/`0xF0` layer/Fn…), config block layout (report rate, debounce, win-lock, brightness, effect, mac/win…), RT 8-byte/key format, macro action format — all extracted with byte offsets
- **Layout**: K60.json (matrix 5×15, 61 keys + 5 encoders, per-key row/col/x/y/w/h/code/name, 23 lighting effects) at `https://yodall.keybord.net.cn/_next/static/chunks/267.dc036318031ed9bc.js` — will be downloaded and bundled as our static layout data
- **Firmware**: official image `https://yodall.keybord.net.cn/YODALL61_118.bin` (229,696 B), Sonix bootloader flash protocol (`0x80`–`0x84`) fully documented

## Scope (user-confirmed)

Everything: connect/live status, 4-layer visual keymap editor, RGB (23 effects, brightness/speed/direction, per-key paint, logo light), core settings, preset library, **Rapid Trigger + per-key actuation**, **macro editor (16 slots)**, **advanced key modes (DKS/MT/TGL/SOCD/OKS)**, and the **firmware updater** (with strong warnings + confirm flow). Plus a **demo/mock device mode** (no WebHID needed) so the UI is fully testable in any browser.

## Architecture

**WebHID never touches Laravel** — keyboard I/O is client-side JS (browsers require it). Laravel serves pages + handles preset CRUD (htmx) + firmware proxy.

- **Client** (Vite-bundled vanilla JS + Alpine): `resources/js/hid/` — `transport.js` (connect, queue, framing), `protocol.js` (commands, checksums), `layout.js` (bundled K60), `keymap.js`, `config.js`, `lighting.js`, `rapid-trigger.js`, `macros.js`, `dks.js`, `bootloader.js`, `mock-device.js` (demo mode). Alpine stores bridge device state to UI; htmx only talks to Laravel (presets, toasts).
- **Server** (Laravel 12+, Blade, SQLite): routes `/` (configurator), presets CRUD (`GET/POST/DELETE /presets`, htmx partial swaps + export/import JSON), firmware endpoint `GET /firmware/latest` that proxies **only** `https://yodall.keybord.net.cn/YODALL61_118.bin` (strict host allowlist; scheme restricted to https, no redirects to other hosts, localhost/loopback/private/reserved IPs rejected — SSRF-safe) with caching; manual `.bin` upload path also supported. Presets table migration; volume-backed SQLite at `/data/database.sqlite`.
- **Visual world (impeccable, brief-pinned)**: Operate-mode tool in a pinned pastel pixel-art world — Catppuccin Latte tokens (`rosewater #dc8a78` … `crust #dce0e8`) as UnoCSS theme; pixel borders via hard `box-shadow` steps (no border-radius), chunky pixel buttons/toggles/sliders with pressed states, pixel font (Press Start 2P or Silkscreen) for headings + mascot speech only, rounded readable sans (Nunito) for labels/data, `image-rendering: pixelated`, dithered/checker accents, an inline-SVG pixel cat mascot reacting to connection state, signature interaction: physical keypresses light up on-screen keys live via the `0xA0` event feed. State-rich controls (hover/focus/active/disabled/loading) per Operate discipline.

## Steps

1. **Impeccable setup** — run `context.mjs`, `init` → PRODUCT.md, write surface brief with direction contract (pinned world, code-led path — no image generation available), load `craft-floor.md` before UI edits.
2. **Scaffold** — Laravel project directly in `C:\Users\LunaCats\Documents\stuff\Keybd` (create in temp subdir, move to root), Vite + UnoCSS (`preset-wind` + custom theme/shortcuts/rules), npm `htmx.org` + `alpinejs`, local `composer.phar` if composer missing.
3. **Protocol layer** — download K60 layout chunk + extract JSON; implement all `hid/` modules per the spec above; embed HID keycode table (usage → friendly name) for the picker.
4. **Backend** — migrations, Preset model/controller (htmx partials), firmware proxy w/ SSRF guard, Blade layout + composables.
5. **UI build** — connection gate (WebHID support check, connect, fw version, mascot states), visual keyboard renderer from layout (per-layer tabs, click-to-assign, paint mode), keycode picker (search + modifier toggles + macro/layer/DKS assigners), lighting panel, RT panel (per-key actuation sliders), macro editor, settings, firmware panel (confirm → flash → progress), preset library via htmx. Full demo mode toggle.
6. **Verify locally** — `npm run build`, `php artisan serve`; browser-based UI verification (demo mode); impeccable `detect.mjs`, batched screenshot round, finish reviewer agent, documenter → DESIGN.md. Fix pass, max two rounds.
7. **Ship** — git init + `gh repo create GeorgieWifey/mewxus --public --source . --push`; Railway via MCP (create project, connect repo, env: `APP_KEY`, `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_DRIVER=cookie`, `DB_DATABASE=/data/database.sqlite`, `PHP_CLI_SERVER_WORKERS=4`, start cmd runs `migrate --force`), `/data` volume, generate domain, verify live. MCP was unreachable earlier — retry; fallback to Dockerfile/Nixpacks tuning or Railway CLI guidance if still down.
8. **Memory** — save durable user prefs (cutesy pastel pixel + Catppuccin, Laravel/htmx/Alpine/UnoCSS stack, Railway hosting).

**Risks/caveats**: WebHID works in Chrome/Edge/Opera only (Firefox/Safari get a friendly notice + demo mode); firmware flashing can brick if interrupted — double-confirm dialog + explicit warning; I can't test against the physical keyboard from here, so device I/O correctness rests on the extracted protocol + demo-mode testing (byte-level formats are verbatim from the official driver's code).
