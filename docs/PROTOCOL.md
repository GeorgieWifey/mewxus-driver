# Mewxus protocol reference

Extracted verbatim from the official Yodall driver's shipping JavaScript
(`yodall.keybord.net.cn`, `_next/static/chunks/app/page-*.js`) and its K60 layout
chunk (`_next/static/chunks/267.dc036318031ed9bc.js`). Every byte offset below is
read from working vendor code, not inferred. Where a value is an inference, it is
marked **[INFERRED]**.

The bundle contains **two** keymap formats, and only one of them is live:

- **stride 3** — read via sub-command `8` (`7` for factory defaults), write via
  cmd `9`. This is the path the shipping editor actually calls
  (`getKeyInfos` → `getKeyMatrix`). Use this one.
- **stride 4** — read via sub-command `58`, write via sub-command `59`. Present in
  the bundle but **never invoked**: `getCurKeyInfosData` and `setKeyInfos` have
  zero call sites in the page chunk. Treat as an abandoned newer format.

`plan.md`'s claim of 3 bytes per slot is correct for the live path; its claim that
this is the only encoding is not, which is why both are documented.

## Device filters

```js
navigator.hid.requestDevice({
  filters: [
    { vendorId: 65261, productId: 24298, usagePage: 0x0001, usage: 0x00 }, // 0xFEED:0x5EEA
    { vendorId: 65261, productId:  3818, usagePage: 0xFF00, usage: 0x01 }, // 0xFEED:0x0EEA
  ],
})
```

Bootloader device is `0x0C45:0x0500` (Sonix). Vendor id decimal 65261 = `0xFEED`.

A device is accepted when a collection matches `usage===0 && usagePage===1` or
`usage===1 && usagePage===0xFF00`.

## Transport

- Reports are 65 bytes on the wire: `[reportId, cmd, ...args]`, zero-padded.
  `sendReport(0, payload)` sends `payload` as data; the code builds
  `Array(65).fill(0)`, writes `[0, cmd, ...args]`, and calls `write()`.
- Responses arrive as `inputreport` events; the useful payload begins at
  **byte 8** (`response.slice(8)`).
- Every command is serialized through a single queue. The reader either resolves a
  pending waiter or buffers `{currTime, message}` for the next `read()`.
- Buffered responses older than 1 s are discarded before each write (`fastForwardGlobalBuffer`).
- **Byte order for 16-bit offsets is little-endian**: helpers are
  `k = ([lo, hi]) => (hi << 8) | lo` and `_ = (v) => [v & 255, v >> 8]`.
- **Checksum is the low byte of the arithmetic sum** of the checksummed slice
  (`u().sum(bytes) & 255`, `u` = lodash). It is *not* XOR.

## Live event frames (top byte of report payload)

| First byte | Meaning |
|---|---|
| `160` (`0xA0`) | calibration / live key-travel feed |
| `161` (`0xA1`) | profile change |
| `162` (`0xA2`) | reset |
| `170 250` (`0xAA 0xFA`) | light state change |

`0xA0` frames are consumed by the event bus and are **never** matched against
pending command waiters — the transport explicitly skips them.

## Command set

All memory access goes through cmd `85` (`0x55`) with a sub-command in the first
argument byte. `getDeviceData(cmd, args)` reads; `sendDeviceData(cmd, args)` writes.

### Identity

| Call | Args | Meaning |
|---|---|---|
| get info | `85, [3, 0, 32, 32]` | firmware / identity block, `.slice(8)` |
| get base | `85, [4, 0, 32, 32]` | `.slice(8)[0]` = active profile index |

### Keymap — two distinct strides

Factory default matrix (read-only), stride **3**:

```js
async getAllKeyMatrix(profile, layer, isDefault = false) {
  const sub = isDefault ? 7 : 8;
  const bytes = 512 * layer * profile;   // profile is 0 or 1 here (base/profile pair)
  for (let off = 0; off < bytes; off += 56) { ... getDeviceData(85, [sub, 0, sum, len, lo, hi]) }
  // -> 512 bytes, sliced
}
```

Per-profile user keymap, stride **4** (`type, code1, code2, code3`), 128 slots:

```js
// read: one full layer of the active profile
d[0]=8; d[1]=58; d[2]=56*chunk & 255; d[3]=56*chunk>>8 & 255; d[5]=profile;
// -> 512-byte buffer; slot i occupies bytes [4i .. 4i+3]
new_type = buf[4i+0]; new_code1 = buf[4i+1]; new_code2 = buf[4i+2]; new_code3 = buf[4i+3];

// write: cmd 9 = 0x09 via setUserKeyMatrix(payload, profile, layer, slot)
// offset = 512*layer + 3*slot + 2048*profile   <-- written as 3-byte stride
await sendData(9, 512 * layer + 3 * slot + 2048 * profile, [type, code1, code2]);
```

`sendData(cmd, offset, bytes)` frames each 56-byte chunk as
`[len, lo(off), hi(off), 0, ...chunk]` and appends `sum(...) & 255`.

### Config block (cmd `5` read / `6` write), 64 bytes per profile

```js
async getFunc(profile) { ... getDeviceData(85, [5, 0, sum, len, lo, hi]) ... } // 64 bytes
async setFunc(profile, bytes) { await sendData(6, 64 * profile, bytes); }
```

Field map from `getBaseInfo()` / the matching setters:

| Byte | Bits | Field |
|---|---|---|
| 1 | `& 15` | `macMode` (system mode; 0 win, 1 mac) |
| 4 | `& 15` | `reportRate` |
| 4 | `>>4 & 15` | `tick` |
| 6 | bit 0 | `lockWin` |
| 6 | bit 1 | `lockAltTab` |
| 6 | bit 2 | `lockAltF4` |
| 7 | bit 0 | `bottomRapidTriggerMode` ("tachyon") |
| 7 | `>>1 & 1` | `tachyonMode` alias used in code |
| 7 | `>>5 & 7` | `debounce` |
| 8 | — | `lightEffect` |
| 9 | — | `lightBrightness` |
| 10 | — | `lightSpeed` **(stored inverted: UI value = `4 - raw`)** |
| 11 | — | `lightDirection` |
| 12 | — | `color` flag (0 = single colour) |
| 14,15,16 | — | keyboard light R,G,B |
| 22 | — | `lightSleep` |
| 23 | — | `floorLampSync` |
| 24 | — | logo `effect` |
| 25 | — | logo `brightness` |
| 26 | — | logo `speed` (inverted) |
| 27 | — | logo single-colour flag |
| 29,30,31 | — | logo R,G,B |

### Per-key RGB (cmd `10` read / `11` write / `222` for the logo strip)

```js
// read one profile's 512 bytes of colour
getDeviceData(85, [10, 0, sum, len, lo, hi])   // 512 * profile .. 512*(profile+1), 56-byte chunks

// write one key's colour (3 bytes per key)
const [lo, hi] = _(512 * profile + 3 * slot);
const body = [3, lo, hi, 0, r, g, b];
sendDeviceData(85, [11, 0, sum(body) & 255, ...body]);

// bulk write: sendData(11, 512 * profile, colors)
// logo strip: getDeviceData(85, [222, 0, sum, len, lo, hi]) over 384 bytes
```

### Rapid Trigger / travel (sub `160` read, `161` write), 1024 bytes, **8 bytes per key**, 128 keys

```js
d[0] = 160 | switch_type;
d[1] = priority ? (priority << 4) | key_mode : key_mode;
const a = _(max(0, key_actuation - 1));  d[2] = a[0]; d[3] = (a[1] & 1) | 20;
const c = _(max(0, rt_press  - 1));      d[4] = c[0]; d[5] = c[1] | (max(0, press_deadzone - 1) << 1);
const n = _(max(0, rt_release - 1));     d[6] = n[0]; d[7] = n[1] | (max(0, release_deadzone - 1) << 1);
// write: setData(161, 1024 * profile + 8 * slot, d)   [setAllKeyTravel uses 1024 * profile]
```

Parse side mirrors this:

```js
switch_type      = d[0] & 15;
key_mode         = d[1];
priority         = d[1] >> 4;
key_actuation    = le16(d[2], d[3] & 1) + 1;
pressPrecision   = (d[3] >> 3) & 3;
releasePrecision = (d[3] >> 1) & 3;
press_deadzone   = (d[5] >> 1) & 127;
rt_press         = le16(d[4], d[5] & 1) + 1;
release_deadzone = (d[7] >> 1) & 127;
rt_release       = le16(d[6], d[7] & 1) + 1;
```

Note `0x14` (20) is OR'd into `d[3]` on the write path only.

### DKS (sub `162` read, `163` write), 768 bytes, **24 bytes per key**, 32 entries

```js
// per entry, base = 24 * i:
point  = bytes.slice(base, base + 4)              // 4-byte point mask
action0 = {type: b[base+4],  code1: b[base+5],  code2: b[base+6]}
action1 = {type: b[base+9],  code1: b[base+10], code2: b[base+11]}
action2 = {type: b[base+14], code1: b[base+15], code2: b[base+16]}
action3 = {type: b[base+19], code1: b[base+20], code2: b[base+21]}
// point masks, little-endian 16-bit:
p0 = le16(b[base+7],  b[base+8])
p1 = le16(b[base+12], b[base+13]); p2 = le16(b[base+17], b[base+18]); p3 = le16(b[base+22], b[base+23])
// each mask unpacks as: a0 = v & 7, a1 = v>>3 & 7, a2 = v>>6 & 7, a3 = v>>9 & 1
// write: sendData(163, 768 * profile, bytes)  |  single: 768 * profile + 24 * slot
```

### MT (sub `164` read, `165` write), 256 bytes, **6 bytes per key**

```js
// normal MT: [click.type, click.code1, click.code2, down.type, down.code1, down.code2]
// OKS variant: [click.type, click.code1, click.code2, 0, 0, down.code2]
// write: sendData(165, 256 * profile, bytes)  |  single: (256 * profile + slot) * 6
```

### Toggle (sub `166` read, `167` write), 128 bytes, **3 bytes per key**

```js
// [type, code1, code2]
// write: sendData(167, 128 * profile, bytes)  |  single: 128 * profile + 3 * slot
```

### Macros (sub `12` read, `13` write), 2048 bytes per profile

```js
// read: 2048*profile .. 2048*(profile+1), 56-byte chunks
// write one 56-byte macro block:
const [lo, hi] = _(2048 * profile + 56 * blockIndex);
const body = [block.length, lo, hi, 0, ...block];
sendDeviceData(85, [13, 0, sum(body) & 255, ...body]);
```

Macro header is 64 bytes: 32 little-endian 16-bit `[actionCount, byteOffset]`
pairs. A zero/64 pair means the slot is empty. Action bodies are 4 bytes each:

```js
// per action, in a group of up to 4 actions sharing an inter-group delay:
action[0..1] = le16(delayOfNextAction)   // 0 for the last action in the group
action[2]    = (isModifierKey ? 1 : 2) | (isDown << 6) | (isLast << 7)
action[3]    = code >= 224 ? (1 << (code & 15)) : code
```

### Calibration / misc

| Call | Frame |
|---|---|
| start calibration | `85, [168, 0, 0]` |
| end calibration | `85, [169, 0, 0]` |
| enter boot mode | `95, [6, 0, 82, 1, 0, 0, 0, 81]` |
| set config mode | `85, [14, 0, (1+profile) & 255, 1, 0, 0, 0, profile]` |
| soft reset | `85, [238, 0, 0]` |
| start fast mode | `85, [1, 0, 0]` |
| end fast mode | `85, [2, 0, 0]` |
| factory reset | `6, [15, 255]` |

### Bootloader (Sonix, `0x0C45:0x0500`)

| Call | Frame |
|---|---|
| erase ROM | `129, [7, lo(addr), hi(addr), lo(len), hi(len), flag]` |
| send data | `128, [len, off&255, off>>8, off>>16, off>>24, ...chunk]` — 32-byte chunks |
| verify data | `130, [len, off&255, off>>8, off>>16, off>>24, ...chunk]` — same 32-byte chunks |
| end transfer | `131, [1, 0, 0, 0]` |
| success ack | `132, [1, 0, 0, 0]` |

Progress is reported as `1 + round(40 * i / n)` during send and `41 + round(40 * i / n)`
during verify.

## Key types (`layouts.codes[].type` and the keymap `type` byte)

| Type | Meaning |
|---|---|
| `16` (`0x10`) | normal key; `code1` = modifier mask, `code2` = HID usage |
| `32`/`33` | mouse button / mouse wheel (`code1` = button mask, `code2` = delta) |
| `48` | media / consumer control |
| `64` | power, sleep, wake |
| `112` (`0x70`) | macro — `code1` = macro slot (0–15), `code2` = macro type |
| `144` (`0x90`) | DKS |
| `145` (`0x91`) | Toggle |
| `146` (`0x92`) | MT (mod-tap) |
| `147` (`0x93`) | RS (rapid switch / SOCD pair) |
| `148` (`0x94`) | SOCD |
| `149` (`0x95`) | OKS |
| `224` (`0xE0`) | lighting function (`code1` 1–4, `code2` 0) |
| `240` (`0xF0`) | Fn / layer function |
| `255` (`0xFF`) | Fn key in the default matrix |

Name resolution (`K`) for `type 16` composes modifiers in this order:
`ALT`, `SHIFT`, `CTRL`, `WIN`, then the base key — filtered and joined with `+`.

Modifier bit meanings within `code1`: bits 0/4 = Ctrl, 1/5 = Shift, 2/6 = Alt, 3/7 = Win.

## Layout data (bundled `K60.json`)

- `matrix: {rows: 5, cols: 15}`
- `layouts.width/height` 16×6 units, `kbWidth/kbHeight` 800×280 px, `keyScale` 52
- `layouts.keys[66]` — **visual geometry only.** `{row, col, x, y, w, h, code, name, index?, mode?}`
  - `mode: 1` entries are the alternate bottom-row cluster (Light1–Light4 + a duplicate SPACE)
  - `mode: 2` marks the wide spacebar
  - `index: 1` on the four rightmost bottom keys
  - Filtering out `mode: 1` leaves exactly the 61 physical keys.
- `layouts.codes[82]` — **the slot-ordered factory keymap.** `codes[i]` is the
  default for keymap slot `i`, not for `keys[i]`.
- `layouts.encoders[5]` — knob positions, `{x, y, w, h, l?}`
- `lighting.effect[23]` — per-effect capability flags (`brightness`, `speed`, `direction`, `color`, `palette`)
- `lighting.logoEffect` — the logo light supports a subset (spectrum, static, breathing, wave)

### How a visible key finds its slot

`keys` and `codes` are **not index-aligned**. The board's keymap order is the
`codes` order (ESC, F1…F12, Del, Home, ~, 1…0, -, =, Back, PgUp, Tab, Q…), which
is a firmware scan order, while `keys` is the physical layout. Pairing them by
array index puts `1` on the F1 cap.

The vendor bridges them with its `I()` transform, which converts a stored
`(type, code1, code2)` triple into the pseudo-code carried by `keys[].code`:

```js
I = (type, code1, code2) => {
  let d = code2
  if (type === 16) {
    if (code1 !== 0) d = { 1:224, 2:225, 4:226, 8:227, 16:228, 32:229, 64:230, 128:231 }[code1]
  } else if (type === 240 && code1 === 255) d = 255
  else if (type === 224) {
    if (code1 === 1 && code2 === 0) d = 200
    else if (code1 === 2 && code2 === 0) d = 201
    else if (code1 === 3 && code2 === 0) d = 202
    else if (code1 === 4 && code2 === 0) d = 203
  }
  return d
}
```

So: build `pseudo → slot` from `codes`, then look each physical key's `code` up in
it. That yields a clean bijection for 60 of the 61 physical keys.

The one gap is the `Menu` cap (`code: 101`), which has no matching entry in
`codes`; it is resolved positionally as the remaining unused slot **[INFERRED]**.
`Fn` is a special case: `keys` carries `code: 255` and `codes[77]` is
`{type: 240, code1: 255, code2: 255}`, so the pseudo-code is `255` either way.

`layouts.codes` has 82 entries but only 61 are reachable from this board's
physical keys; the surplus belongs to the larger boards that share `K60.json`'s
code table. Do not assume 82 slots are addressable.

## Known gaps

- Firmware version strings live in a separate vendor table keyed by
  `"0xVID_0xPID"`; the board's own version is read from the info block
  (`85, [3, 0, 32, 32]`) but its exact offset inside that block is **[INFERRED]**
  as a printable ASCII scan.
- The knob/encoder slots (5 of them) are rendered from `layouts.encoders` but their
  keymap slot indices are **[INFERRED]** to be the final entries after the 61 keys.
- `switchMaxTravel` / `minTravel` are read from the device at runtime; the constants
  the UI uses for slider bounds are **[INFERRED]** from the 0.1 mm step the official
  code divides by.
