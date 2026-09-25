<div align="center">

# Mewxus

**A browser-local configurator for the Yodall Nexus 61S keyboard.**

Cute pastel pixel art on the Catppuccin Latte palette. No install, no driver,
no native app — the browser talks to the keyboard over WebHID.

`Laravel` · `Blade` · `htmx` · `Alpine.js` · `UnoCSS` · `SQLite`

</div>

---

## What this is

The vendor's official driver (`yodall.keybord.net.cn`) is a slow, clunky Next.js
app. This replaces it.

Everything that matters happens **client-side**. WebHID is the transport, and the
Laravel server never sees a HID packet: it serves pages, stores presets, and
proxies the firmware image. That is the product, not an implementation detail —
plug the board into any Chromium browser, open the page, and it works.

| | |
|---|---|
| **Keymap** | 61 keys × 4 layers, visual editor, keycode picker with modifier composition |
| **Lighting** | 23 effects, per-key paint, separate logo light |
| **Rapid Trigger** | Per-key actuation and release points, live travel readout |
| **Macros** | 16 slots, record from the board, per-action delays |
| **Advanced** | DKS, mod-tap, toggle, SOCD/OKS |
| **Presets** | Save, share by link, export/import JSON |
| **Firmware** | Checksum-verified download behind a typed confirmation |
| **Demo mode** | The entire UI, every panel, no hardware required |

## Requirements

- **Chrome, Edge, or Opera.** WebHID is a Chromium feature. Firefox and Safari
  cannot reach the device at all, and the app says so instead of failing
  silently — they get demo mode.
- PHP 8.3+, Node 20+, Composer 2.

## Running it

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate

npm run build          # or: npm run dev
php artisan serve
```

Open the page, plug in the board, press **Connect**. Your browser will show a
device picker; the keyboard appears as `0xFEED:0x5EEA`.

No board to hand? Press **Try demo** — demo mode runs a full in-memory device
that implements the real memory layout, so every panel is exercisable.

## Deploying

The repo ships a `Dockerfile` and a `railway.json`. On Railway:

1. New project → deploy from this repo (the Dockerfile is used automatically).
2. Add a **volume mounted at `/data`** — the SQLite database and the generated
   `APP_KEY` live there, so both survive redeploys.
3. Set `APP_ENV=production`, `APP_DEBUG=false`. `APP_KEY` is generated into the
   volume on first boot if you do not supply one.

`docker/entrypoint.sh` creates the database, migrates, and rebuilds the caches
on every start.

## How it is put together

```
resources/js/hid/
  transport.js   WebHID framing, the serialized command queue, live event bus
  protocol.js    Every command, offset and bitfield the board speaks
  keys.js        Keycode naming, the picker catalogue, slot mapping
  mock.js        The demo device
resources/js/app.js        Alpine state, dial, everything the UI binds to
resources/views/           Blade: the dial view, the classic view, six panels
resources/data/            Layout and keycode tables extracted from the vendor
docs/PROTOCOL.md           The protocol, in full, with the source it came from
```

### The protocol was reverse-engineered, and it is documented

`docs/PROTOCOL.md` records every byte offset with the vendor code it was read
from, and flags the handful of values that are inference rather than fact. Two
findings are worth calling out because the obvious reading is wrong:

- **The keymap stride is 3 bytes**, not 4. A 4-byte variant exists in the
  vendor bundle with **zero call sites** and is documented as abandoned.
- **`layouts.keys` and `layouts.codes` are not index-aligned.** Pairing them by
  array position puts `1` on the F1 cap. They pair through the vendor's own
  transform, which converts a stored key triple into the pseudo-code the layout
  carries; `docs/PROTOCOL.md` has the function.

### The visual world

The board is the **hub**. Six concerns — keymap, light, rapid trigger, macros,
advanced modes, setup — ride a ring around it, and the open panel unfolds
beneath the board, so the thing you are configuring never leaves view.

Two rules come from "pixel art" and are enforced in CSS rather than left to
discipline: nothing is rounded, and depth is drawn as hard offset steps rather
than blurred shadows, because that is what a 1× sprite actually looks like. The
latte palette's softest tones are registered for chrome only — they fail contrast
as body text on a light ground.

A second, conventional arrangement ships at `/classic` for anyone who wants the
familiar split-desk layout.

## Firmware flashing

The updater downloads the manufacturer's image through a server-side proxy that
pins the host, refuses redirects, and returns a SHA-256 the client verifies
before anything is written.

**Writing is not implemented.** The flash sequence needs the physical board to
exercise, and an untested write path against a device that bricks if interrupted
is not something to ship on hope. The image is fetched and verified, and the flow
stops there with a clear message rather than pretending to have finished.

## Credits

Catppuccin Latte by the [Catppuccin](https://github.com/catppuccin/catppuccin)
project. Protocol details extracted from the vendor's own shipping bundle.

Unofficial. Not affiliated with Yodall.
