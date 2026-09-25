# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Laravel 12 + Blade + htmx + Alpine.js + UnoCSS, bundled with Vite. SQLite on a Railway volume. User-specified, not delegated. WebHID is the transport and runs entirely client-side; Laravel never sees a HID packet.

## Users

Mechanical-keyboard owners running a Yodall Nexus 61S (61 keys, 5×15 matrix, 5 encoders, 4 layers, per-key RGB) who want to reconfigure the board without installing the vendor's Next.js desktop app. They already know what layers, keycodes, and rapid trigger are; they are not intimidated by a configurator. They arrive at a desk with the board plugged in, usually in a dim room lit partly by the board's own lighting, and they want to change one thing — a keycode, a colour, an actuation point — and see it land immediately.

Secondary audience: people evaluating the board before buying, using demo mode with no hardware attached.

## Product Purpose

A browser-local configurator that speaks WebHID directly to the keyboard, replacing the official driver. It exists because the official tool is slow, ugly, and clunky. Success means a user connects, finds what they want to change, changes it, and sees it applied faster than they could in the official app — and enjoys doing it.

## Positioning

The device protocol is entirely client-side JavaScript talking to the hardware. That is not a technicality, it is the product: no install, no driver, no native app, and the configurator opens in a browser tab. The server exists only for presets, sharing, and the firmware proxy.

## Operating Context

- Chromium desktop (Chrome, Edge, Opera). WebHID is unavailable in Firefox and Safari; those users get a clear explanation and demo mode, never a broken page.
- The board appears as `0xFEED:0x5EEA` / `0xFEED:0x0EEA` in normal mode, `0x0C45:0x0500` in bootloader mode.
- Sessions are short and task-shaped: connect, change, verify by pressing the key.
- Firmware flashing happens in this same surface and can brick the board if interrupted.
- Presets are portable: users expect to export, share, and re-import them as files.

## Capabilities and Constraints

Confirmed: connect and live status with firmware version; 4-layer visual keymap editor; RGB with 23 effects, per-key paint, and logo light; core settings; preset library; Rapid Trigger with per-key actuation; macro editor (16 slots); advanced key modes (DKS/MT/TGL/SOCD/OKS); firmware updater behind strong warnings; demo mode with no hardware.

Constraints: WebHID is the only transport and is Chromium-only. All device I/O is client-side; the server cannot read or write the keyboard. Firmware flashing is destructive and the UI must treat it as such. The physical board is not available to the build, so device I/O correctness rests on the extracted protocol plus demo mode.

## Brand Commitments

Name: **Mewxus** (mew + nexus). Tone: cutesy, warm, encouraging, never precious at the cost of clarity. Visual world is pinned by the user and binding: pastel pixel art, Catppuccin Latte palette (`rosewater #dc8a78` … `crust #dce0e8`), a pixel cat mascot.

## Evidence on Hand

- Extracted layout data (matrix 5×15, 61 keys + 5 encoders, 23 lighting effects, full keycode table) recovered from the official driver's bundle.
- Device filters, packet framing (64-byte reports, response payload at bytes 8–63, `0xA0` prefix marks live key-travel events), and the command set, extracted verbatim from the official driver's shipping JavaScript.
- Official firmware image `YODALL61_118.bin` (229,696 bytes) and the Sonix bootloader flash protocol.
- No testimonials, customer counts, or performance benchmarks exist. Do not fabricate any.

## Product Principles

1. **The board is the interface.** Every state change is verifiable by pressing a key and watching the screen. Nothing hides behind a save button.
2. **Latency is the feature.** Reading device state must feel instant; any perceptible wait is a defect.
3. **Cute never costs clarity.** Pixel art and a mascot make the tool pleasant; the keycode, the layer, and the actuation value stay unambiguous.
4. **Irreversible actions look irreversible.** Firmware flashing and factory reset are never one click from a normal flow.
5. **No hardware, no dead end.** Demo mode is a first-class path, not a fallback apology.

## Accessibility & Inclusion

Standard web expectations: keyboard-navigable controls, visible focus, sufficient contrast for data text (Catppuccin Latte's softest tokens — `overlay0`, `overlay1`, `surface2` — fail as text on light grounds and must not carry body copy), and motion that respects `prefers-reduced-motion`.
