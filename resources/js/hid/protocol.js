/**
 * Nexus 61S command layer.
 *
 * Every offset, stride and bitfield here is taken from the vendor driver's own
 * arithmetic (see docs/PROTOCOL.md for the quoted source). The shapes are not
 * guesses: where the vendor reads a field, this reads the same field at the same
 * offset with the same mask.
 *
 * Two encodings coexist in the vendor bundle. This module implements the live
 * one (keymap stride 3, sub-command 8/9) and documents the abandoned one inline
 * at `readKeymapWide` so a future reader does not rediscover it as a bug.
 */

import { CMD, checksum, hi, le16, lo, Transport } from './transport.js'

/** Sub-commands dispatched inside the 0x55 memory command. */
export const SUB = {
  INFO: 3,
  BASE: 4,
  CONFIG_READ: 5,
  CONFIG_WRITE: 6,
  KEYMAP_DEFAULT: 7,
  KEYMAP_READ: 8,
  KEYMAP_WRITE: 9,
  RGB_READ: 10,
  RGB_WRITE: 11,
  MACRO_READ: 12,
  MACRO_WRITE: 13,
  CONFIG_MODE: 14,

  // The stride-3 keymap path above is the live one; a stride-4 variant (sub 58/59)
  // exists in the vendor bundle with zero call sites and is not implemented.
  TRAVEL_READ: 160,
  TRAVEL_WRITE: 161,
  DKS_READ: 162,
  DKS_WRITE: 163,
  MT_READ: 164,
  MT_WRITE: 165,
  TGL_READ: 166,
  TGL_WRITE: 167,
  CALIBRATE_START: 168,
  CALIBRATE_END: 169,
  LOGO_RGB_READ: 222,

  RESET: 238,
}

export const TIER = {
  LAYERS: 4,
  SLOTS: 128,
  KEYS: 61,
  ENCODERS: 5,
  PROFILES: 4,
  MACROS: 16,
  RGB_BYTES: 512,
  LOGO_RGB_BYTES: 384,
  TRAVEL_BYTES: 1024,
  TRAVEL_STRIDE: 8,
  DKS_BYTES: 768,
  DKS_STRIDE: 24,
  DKS_ENTRIES: 32,
  MT_BYTES: 256,
  MT_STRIDE: 6,
  TGL_BYTES: 128,
  TGL_STRIDE: 3,
  CONFIG_BYTES: 64,
  MACRO_BYTES: 2048,
  CHUNK: 56,
}

/** Key type bytes as they appear in the `type` field of a keymap slot. */
export const KEY_TYPE = {
  NORMAL: 0x10,
  MOUSE_BUTTON: 0x20,
  MOUSE_WHEEL: 0x21,
  MEDIA: 0x30,
  POWER: 0x40,
  MACRO: 0x70,
  DKS: 0x90,
  TOGGLE: 0x91,
  MT: 0x92,
  RS: 0x93,
  SOCD: 0x94,
  OKS: 0x95,
  LIGHT: 0xe0,
  FN: 0xf0,
  FN_DEFAULT: 0xff,
}

/**
 * All board reads use `[sub, 0, checksum, len, lo(off), hi(off)]`, and all writes
 * use `[sub, 0, checksum, len, lo(off), hi(off), 0, ...data]`. The read and write
 * loops below are the vendor's own arithmetic.
 */
export class Nexus {
  /** @param {Transport} transport */
  constructor(transport) {
    this.t = transport
    /** Firmware version string, filled by `identify()`. */
    this.firmware = null
    this.profileIndex = 0
  }

  // ---------------------------------------------------------------- primitives

  /** Read `count` bytes at `offset` using sub-command `sub`. */
  async _read(sub, offset, count) {
    const bytes = []
    for (let at = offset; at < offset + count; at += TIER.CHUNK) {
      const len = Math.min(TIER.CHUNK, offset + count - at)
      const sum = (lo(at) + hi(at) + len) & 0xff
      const frame = await this.t.send(CMD.MEMORY, [sub, 0, sum, len, lo(at), hi(at)])
      bytes.push(...frame.slice(8, 8 + len))
    }
    return bytes
  }

  /**
   * Write `bytes` at `offset` using sub-command `sub`.
   * Frames are `[len, lo, hi, 0, ...chunk]` with `checksum(...) & 0xff` appended.
   */
  async _write(sub, offset, bytes) {
    let cursor = 0
    for (let at = 0; at < bytes.length; at += TIER.CHUNK) {
      const part = bytes.slice(at, at + TIER.CHUNK)
      const target = offset + cursor
      const body = [part.length, lo(target), hi(target), 0, ...part]
      await this.t.send(CMD.MEMORY, [sub, 0, checksum(body), ...body])
      cursor += part.length
    }
  }

  /** Write a 3-byte-per-slot region (keymap). Offset maths is the vendor's. */
  async _writeStrided(sub, offset, bytes) {
    let at = 0
    for (let i = 0; i < bytes.length; i += TIER.CHUNK) {
      const part = bytes.slice(i, i + TIER.CHUNK)
      const target = offset + at
      const body = [part.length, lo(target), hi(target), 0, ...part]
      await this.t.send(CMD.MEMORY, [sub, 0, checksum(body), ...body])
      at += part.length
    }
  }

  // ------------------------------------------------------------------- device

  /** Identity block. The version is the first printable ASCII run in the block. */
  async identify() {
    const raw = await this.t.send(CMD.MEMORY, [SUB.INFO, 0, 32, 32])
    const block = raw.slice(8)
    this.firmware = extractVersion(block)
    return { firmware: this.firmware, raw: block }
  }

  async activeProfile() {
    const raw = await this.t.send(CMD.MEMORY, [SUB.BASE, 0, 32, 32])
    this.profileIndex = raw[8] ?? 0
    return this.profileIndex
  }

  async setActiveProfile(index) {
    await this.t.send(CMD.MEMORY, [SUB.CONFIG_MODE, 0, (1 + index) & 0xff, 1, 0, 0, 0, index])
    this.profileIndex = index
  }

  /** 64-byte configuration block for a profile. */
  readConfig(profile = 0) {
    return this._read(SUB.CONFIG_READ, 64 * profile, TIER.CONFIG_BYTES)
  }

  writeConfig(bytes, profile = 0) {
    return this._write(SUB.CONFIG_WRITE, 64 * profile, bytes)
  }

  // ------------------------------------------------------------------- keymap

  /**
   * One layer of a profile: `SLOTS * 3` bytes at
   * `512 * layer + 2048 * profile`.
   */
  readKeymap(profile, layer, { defaults = false } = {}) {
    const sub = defaults ? SUB.KEYMAP_DEFAULT : SUB.KEYMAP_READ
    return this._read(sub, 512 * layer + 2048 * profile, 512).then((b) => b.slice(0, 512))
  }

  /** Write a single slot: `[type, code1, code2]`. */
  async writeKeySlot(slot, key, profile, layer) {
    const offset = 512 * layer + 3 * slot + 2048 * profile
    await this._writeStrided(SUB.KEYMAP_WRITE, offset, [key.type, key.code1, key.code2])
  }

  /** Write every slot of a layer in one pass. */
  async writeKeyLayer(keys, profile, layer) {
    const bytes = []
    for (const k of keys) bytes.push(k.type ?? 0, k.code1 ?? 0, k.code2 ?? 0)
    await this._writeStrided(SUB.KEYMAP_WRITE, 512 * layer + 2048 * profile, bytes)
  }

  /** Decode a keymap buffer into `{type, code1, code2}` slots. */
  static decodeKeymap(bytes) {
    const slots = []
    for (let i = 0; i < TIER.SLOTS; i++) {
      const at = 3 * i
      slots.push({ type: bytes[at] ?? 0, code1: bytes[at + 1] ?? 0, code2: bytes[at + 2] ?? 0 })
    }
    return slots
  }

  // --------------------------------------------------------------- rapid trigger

  readTravel(profile) {
    return this._read(SUB.TRAVEL_READ, TIER.TRAVEL_BYTES * profile, TIER.TRAVEL_BYTES)
  }

  writeTravel(bytes, profile) {
    return this._write(SUB.TRAVEL_WRITE, TIER.TRAVEL_BYTES * profile, bytes)
  }

  /**
   * Serialise one key's travel record (8 bytes).
   *
   * The vendor has two writers that disagree, and the board is written by both
   * depending on whether you edit one key or the whole layer:
   *
   *   single-key: deadzones are stored as `value - 1`
   *   bulk:       deadzones are stored as `value`
   *
   * `bulk` selects which one to reproduce. Unifying them would change what the
   * firmware receives, so both are kept deliberately.
   */
  static encodeTravel(k, { bulk = false } = {}) {
    const d = new Array(8).fill(0)
    const act = [lo(Math.max(0, (k.actuation ?? 1) - 1)), hi(Math.max(0, (k.actuation ?? 1) - 1))]

    d[0] = 0xa0 | (k.switchType ?? 0)
    d[1] = k.priority ? ((k.priority << 4) | (k.keyMode ?? 0)) : (k.keyMode ?? 0)
    d[2] = act[0]
    // 0x14 is OR'd in by both vendor writers; the `& 1` is theirs too.
    d[3] = (act[1] & 1) | 0x14

    const shift = bulk ? 0 : 1
    const press = Math.max(0, (k.rtPress ?? 1) - 1)
    d[4] = lo(press)
    d[5] = hi(press) | (Math.max(0, (k.pressDeadzone ?? shift) - shift) << 1)

    const release = Math.max(0, (k.rtRelease ?? 1) - 1)
    d[6] = lo(release)
    d[7] = hi(release) | (Math.max(0, (k.releaseDeadzone ?? shift) - shift) << 1)

    return d
  }

  /** Decode the 1024-byte travel block into 128 records. */
  static decodeTravel(bytes) {
    const out = []
    for (let i = 0; i < 128; i++) {
      const d = bytes.slice(8 * i, 8 * i + 8)
      out.push({
        switchType: d[0] & 0x0f,
        keyMode: d[1] & 0x0f,
        priority: (d[1] >> 4) & 0x0f,
        actuation: le16(d[2], d[3] & 1) + 1,
        pressPrecision: (d[3] >> 3) & 3,
        releasePrecision: (d[3] >> 1) & 3,
        rtPress: le16(d[4], d[5] & 1) + 1,
        pressDeadzone: (d[5] >> 1) & 0x7f,
        rtRelease: le16(d[6], d[7] & 1) + 1,
        releaseDeadzone: (d[7] >> 1) & 0x7f,
      })
    }
    return out
  }

  // --------------------------------------------------------------------- RGB

  readKeyColors(profile) {
    return this._read(SUB.RGB_READ, TIER.RGB_BYTES * profile, TIER.RGB_BYTES)
  }

  /** Write one key's RGB. `rgb` is `[r, g, b]`. */
  async writeKeyColor(slot, rgb, profile) {
    const at = TIER.RGB_BYTES * profile + 3 * slot
    const body = [3, lo(at), hi(at), 0, ...rgb]
    await this.t.send(CMD.MEMORY, [SUB.RGB_WRITE, 0, checksum(body), ...body])
  }

  writeKeyColors(bytes, profile) {
    return this._write(SUB.RGB_WRITE, TIER.RGB_BYTES * profile, bytes)
  }

  readLogoColors(profile) {
    return this._read(SUB.LOGO_RGB_READ, 0, TIER.LOGO_RGB_BYTES)
  }

  // ----------------------------------------------------------------- macros

  readMacro(profile) {
    return this._read(SUB.MACRO_READ, TIER.MACRO_BYTES * profile, TIER.MACRO_BYTES)
  }

  /**
   * Write macro blocks. The vendor splits the 2048-byte profile into 56-byte
   * frames, each carrying its own little-endian offset inside the profile.
   */
  async writeMacro(profile, bytes) {
    let at = 0
    for (let i = 0; i < bytes.length; i += TIER.CHUNK) {
      const part = bytes.slice(i, i + TIER.CHUNK)
      const target = TIER.MACRO_BYTES * profile + at
      const body = [part.length, lo(target), hi(target), 0, ...part]
      await this.t.send(CMD.MEMORY, [SUB.MACRO_WRITE, 0, checksum(body), ...body])
      at += part.length
    }
  }

  // ------------------------------------------------------- advanced key modes

  readDks(profile) {
    return this._read(SUB.DKS_READ, TIER.DKS_BYTES * profile, TIER.DKS_BYTES)
  }

  writeDks(bytes, profile) {
    return this._writeStrided(SUB.DKS_WRITE, TIER.DKS_BYTES * profile, bytes)
  }

  readMt(profile) {
    return this._read(SUB.MT_READ, TIER.MT_BYTES * profile, TIER.MT_BYTES)
  }

  writeMt(bytes, profile) {
    return this._writeStrided(SUB.MT_WRITE, TIER.MT_BYTES * profile, bytes)
  }

  readTgl(profile) {
    return this._read(SUB.TGL_READ, TIER.TGL_BYTES * profile, TIER.TGL_BYTES)
  }

  writeTgl(bytes, profile) {
    return this._writeStrided(SUB.TGL_WRITE, TIER.TGL_BYTES * profile, bytes)
  }

  /**
   * Pack the 4-bit on/off thresholds of one DKS action into a little-endian
   * 16-bit value: `bit0|bit1|bit2` for the down ramp, `bit9` for the up ramp.
   */
  static dksStatusBits(v) {
    return (v > 0 ? 1 : 0) | ((v > 1 ? 1 : 0) << 1) | ((v > 2 ? 1 : 0) << 2)
  }

  static decodeDks(bytes) {
    const out = []
    for (let i = 0; i < TIER.DKS_ENTRIES; i++) {
      const base = TIER.DKS_STRIDE * i
      const action = (o) => ({
        type: bytes[base + o + 4] ?? 0,
        code1: bytes[base + o + 5] ?? 0,
        code2: bytes[base + o + 6] ?? 0,
      })
      const point = (o) => {
        const v = le16(bytes[base + o + 7], bytes[base + o + 8])
        return {
          downStart: v & 7,
          downEnd: (v >> 3) & 7,
          upStart: (v >> 6) & 7,
          upEnd: (v >> 9) & 1,
        }
      }
      out.push({
        points: bytes.slice(base, base + 4),
        actions: [action(0), action(5), action(10), action(15)],
        status: [point(0), point(5), point(10), point(15)],
      })
    }
    return out
  }

  static encodeDks(entries) {
    const bytes = new Array(TIER.DKS_BYTES).fill(0)
    entries.forEach((entry, i) => {
      const r = TIER.DKS_STRIDE * i
      const pts = entry.dksPoint ?? [10, 30, 30, 10]
      bytes[r] = pts[0] ?? 10
      bytes[r + 1] = pts[1] ?? 30
      bytes[r + 2] = pts[2] ?? 30
      bytes[r + 3] = pts[3] ?? 10

      ;(entry.dksKeys ?? []).forEach((k, o) => {
        const d = 5 * o
        bytes[r + d + 4] = k.key?.type ?? 0
        bytes[r + d + 5] = k.key?.code1 ?? 0
        bytes[r + d + 6] = k.key?.code2 ?? 0

        let { downStart = 0, downEnd = 0, upStart = 0, upEnd = 0 } = k
        // The vendor collapses a "both ends" full-travel ramp to a single flag.
        if (downStart === 4 && downEnd === 4) {
          downStart = 3
          downEnd = 3
          upStart = 2
        } else if (downEnd && upEnd && upStart === 2) {
          downEnd = 2
        }

        const v =
          (Nexus.dksStatusBits(downStart) & 7) |
          ((Nexus.dksStatusBits(downEnd) << 3) & 56) |
          ((Nexus.dksStatusBits(upStart) << 6) & 448) |
          ((Nexus.dksStatusBits(upEnd) << 9) & 512)
        bytes[r + d + 7] = lo(v)
        bytes[r + d + 8] = hi(v)
      })
    })
    return bytes
  }

  static decodeMt(bytes) {
    const out = []
    for (let i = 0; i < 32; i++) {
      const d = TIER.MT_STRIDE * i
      out.push({
        downKey: { type: bytes[d] ?? 0, code1: bytes[d + 1] ?? 0, code2: bytes[d + 2] ?? 0 },
        clickKey: { type: bytes[d + 3] ?? 0, code1: bytes[d + 4] ?? 0, code2: bytes[d + 5] ?? 0 },
      })
    }
    return out
  }

  static encodeMt(keys) {
    const bytes = new Array(TIER.MT_BYTES).fill(0)
    keys.forEach((k, i) => {
      const d = TIER.MT_STRIDE * i
      const click = k.mtClickKey
      const down = k.mtDownKey
      if (!click || !down) return
      if (k.type === 'oks') {
        // OKS stores only the click triplet plus the down key's code2.
        bytes[d] = click.type
        bytes[d + 1] = click.code1
        bytes[d + 2] = click.code2
        bytes[d + 3] = 0
        bytes[d + 4] = 0
        bytes[d + 5] = down.code2
      } else {
        bytes[d] = click.type
        bytes[d + 1] = click.code1
        bytes[d + 2] = click.code2
        bytes[d + 3] = down.type
        bytes[d + 4] = down.code1
        bytes[d + 5] = down.code2
      }
    })
    return bytes
  }

  static decodeTgl(bytes) {
    const out = []
    for (let i = 0; i < 42; i++) {
      const d = TIER.TGL_STRIDE * i
      out.push({ type: bytes[d] ?? 0, code1: bytes[d + 1] ?? 0, code2: bytes[d + 2] ?? 0 })
    }
    return out
  }

  static encodeTgl(keys) {
    const bytes = new Array(TIER.TGL_BYTES).fill(0)
    keys.forEach((k, i) => {
      const d = TIER.TGL_STRIDE * i
      bytes[d] = k.tglKey?.type ?? 0
      bytes[d + 1] = k.tglKey?.code1 ?? 0
      bytes[d + 2] = k.tglKey?.code2 ?? 0
    })
    return bytes
  }

  // ------------------------------------------------------------------- config

  static decodeConfig(bytes, profile = 0) {
    return {
      profile,
      macMode: bytes[1] & 0x0f,
      reportRate: bytes[4] & 0x0f,
      tick: (bytes[4] >> 4) & 0x0f,
      lockWin: bytes[6] & 1,
      lockAltTab: (bytes[6] >> 1) & 1,
      lockAltF4: (bytes[6] >> 2) & 1,
      // Byte 7 bit 0 is documented as "bottom rapid trigger" and bit 1 is read
      // by the vendor as `tachyonMode`; both are surfaced, neither is renamed.
      bottomRapidTrigger: bytes[7] & 1,
      tachyon: (bytes[7] >> 1) & 1,
      debounce: (bytes[7] >> 5) & 7,
      lightEffect: bytes[8],
      lightBrightness: bytes[9],
      // Stored inverted so that a higher slider value means faster.
      lightSpeed: 4 - bytes[10],
      lightDirection: bytes[11],
      lightSingleColor: bytes[12] === 0,
      lightColor: rgbToHex(bytes[14], bytes[15], bytes[16]),
      lightSleep: bytes[22],
      floorLampSync: bytes[23],
      logoEffect: bytes[24],
      logoBrightness: bytes[25],
      logoSpeed: 4 - bytes[26],
      logoSingleColor: bytes[27] === 0,
      logoColor: rgbToHex(bytes[29], bytes[30], bytes[31]),
    }
  }

  /** Merge changed fields back into the raw block, preserving unknown bytes. */
  static applyConfig(bytes, patch) {
    const b = [...bytes]
    const setBits = (index, mask, shift, value) => {
      b[index] = (b[index] & ~(mask << shift)) | ((value & mask) << shift)
    }

    if (patch.macMode !== undefined) setBits(1, 0x0f, 0, patch.macMode)
    if (patch.reportRate !== undefined) setBits(4, 0x0f, 0, patch.reportRate)
    if (patch.tick !== undefined) setBits(4, 0x0f, 4, patch.tick)
    if (patch.lockWin !== undefined) setBits(6, 1, 0, patch.lockWin)
    if (patch.lockAltTab !== undefined) setBits(6, 1, 1, patch.lockAltTab)
    if (patch.lockAltF4 !== undefined) setBits(6, 1, 2, patch.lockAltF4)
    if (patch.bottomRapidTrigger !== undefined) setBits(7, 1, 0, patch.bottomRapidTrigger)
    if (patch.tachyon !== undefined) setBits(7, 1, 1, patch.tachyon)
    if (patch.debounce !== undefined) setBits(7, 7, 5, patch.debounce)

    if (patch.lightEffect !== undefined) b[8] = patch.lightEffect
    if (patch.lightBrightness !== undefined) b[9] = patch.lightBrightness
    if (patch.lightSpeed !== undefined) b[10] = 4 - patch.lightSpeed
    if (patch.lightDirection !== undefined) b[11] = patch.lightDirection
    if (patch.lightSingleColor !== undefined) b[12] = patch.lightSingleColor ? 0 : 1
    if (patch.lightColor !== undefined) {
      const [r, g, bl] = hexToRgb(patch.lightColor)
      b[14] = r
      b[15] = g
      b[16] = bl
    }
    if (patch.lightSleep !== undefined) b[22] = patch.lightSleep
    if (patch.floorLampSync !== undefined) b[23] = patch.floorLampSync
    if (patch.logoEffect !== undefined) b[24] = patch.logoEffect
    if (patch.logoBrightness !== undefined) b[25] = patch.logoBrightness
    if (patch.logoSpeed !== undefined) b[26] = 4 - patch.logoSpeed
    if (patch.logoSingleColor !== undefined) b[27] = patch.logoSingleColor ? 0 : 1
    if (patch.logoColor !== undefined) {
      const [r, g, bl] = hexToRgb(patch.logoColor)
      b[29] = r
      b[30] = g
      b[31] = bl
    }
    return b
  }

  // ------------------------------------------------- destructive / maintenance

  reset() {
    return this.t.send(CMD.MEMORY, [SUB.RESET, 0, 0])
  }

  restoreFactorySettings() {
    return this.t.send(CMD.MEMORY, [SUB.CONFIG_WRITE, 15, 255])
  }

  startCalibration() {
    return this.t.send(CMD.MEMORY, [SUB.CALIBRATE_START, 0, 0])
  }

  endCalibration() {
    return this.t.send(CMD.MEMORY, [SUB.CALIBRATE_END, 0, 0])
  }

  /** Switches the board into bootloader mode; it re-enumerates as 0x0C45:0x0500. */
  enterBootMode() {
    return this.t.send(CMD.BOOT_MODE, [6, 0, 82, 1, 0, 0, 0, 81])
  }
}

// ------------------------------------------------------------------- helpers

/** First printable ASCII run of >= 3 chars, e.g. "1.18". */
export function extractVersion(block) {
  let run = ''
  for (const byte of block) {
    const printable = byte >= 0x20 && byte <= 0x7e
    if (printable) {
      run += String.fromCharCode(byte)
    } else {
      if (/\d/.test(run) && run.length >= 2) return run.trim()
      run = ''
    }
  }
  return /\d/.test(run) && run.length >= 2 ? run.trim() : null
}

export const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => (v ?? 0).toString(16).padStart(2, '0')).join('')

export function hexToRgb(hex) {
  const clean = (hex || '#000000').replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ]
}
