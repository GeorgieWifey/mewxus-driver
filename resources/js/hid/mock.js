/**
 * Demo device.
 *
 * Implements the same surface as the real `Device` facade, backed by an
 * in-memory image of a configured board. Its purpose is that the whole UI —
 * every panel, every layer, every slider — is fully exercisable with no
 * hardware, which matters because the physical board is not available to the
 * build and Chromium is not the only browser people will open this in.
 *
 * The memory layout deliberately mirrors the real device's addressing (3-byte
 * keymap stride, 8-byte travel records, 24-byte DKS entries) rather than being
 * a simplified stand-in. A mock that stores a convenient object graph would
 * hide exactly the offset bugs it exists to catch.
 */

import { TIER } from './protocol.js'
import { defaultKeyFor } from './keys.js'

export class MockDevice {
  constructor() {
    this.kind = 'mock'
    this.firmware = '1.18'
    this.profileIndex = 0
    this.profile = 0

    // keymap[profile][layer] = Uint8Array(512)
    this.keymap = Array.from({ length: TIER.PROFILES }, () =>
      Array.from({ length: TIER.LAYERS }, () => new Uint8Array(512)),
    )
    this.travel = Array.from({ length: TIER.PROFILES }, () => new Uint8Array(TIER.TRAVEL_BYTES))
    this.config = Array.from({ length: TIER.PROFILES }, () => new Uint8Array(64))
    this.rgb = Array.from({ length: TIER.PROFILES }, () => new Uint8Array(TIER.RGB_BYTES))
    this.logoRgb = new Uint8Array(TIER.LOGO_RGB_BYTES)
    this.dks = Array.from({ length: TIER.PROFILES }, () => new Uint8Array(TIER.DKS_BYTES))
    this.mt = Array.from({ length: TIER.PROFILES }, () => new Uint8Array(TIER.MT_BYTES))
    this.tgl = Array.from({ length: TIER.PROFILES }, () => new Uint8Array(TIER.TGL_BYTES))

    this._seedConfig()
    this._seedKeymaps()
    this._seedTravel()
    this._seedRgb()

    this._listeners = new Map()
    this._travelTimer = null
  }

  // ------------------------------------------------------------------ seeding

  _seedConfig() {
    for (let p = 0; p < TIER.PROFILES; p++) {
      const c = this.config[p]
      // reportRate 0 (1000 Hz), debounce 1 (2 ms), light effect 4 (breathing),
      // brightness 80, speed raw 2 (UI 2), single colour with a pastel mauve.
      c[4] = 0x00
      c[7] = (1 << 5) | 0
      c[8] = 4
      c[9] = 80
      c[10] = 2
      c[11] = 0
      c[12] = 0
      c[14] = 0x88
      c[15] = 0x39
      c[16] = 0xef
      c[22] = 0
      c[23] = 0
      c[24] = 4
      c[25] = 60
      c[26] = 2
      c[27] = 0
      c[29] = 0xea
      c[30] = 0x76
      c[31] = 0xcb
    }
  }

  _seedKeymaps() {
    for (let p = 0; p < TIER.PROFILES; p++) {
      for (let l = 0; l < TIER.LAYERS; l++) {
        const buf = this.keymap[p][l]
        for (let slot = 0; slot < TIER.SLOTS; slot++) {
          // Layer 0 mirrors the factory default. Higher layers start blank so
          // the layer tabs visibly do something.
          const key = l === 0 ? defaultKeyFor(slot) : { type: 0, code1: 0, code2: 0 }
          buf[3 * slot] = key.type
          buf[3 * slot + 1] = key.code1
          buf[3 * slot + 2] = key.code2
        }
      }
    }
  }

  _seedTravel() {
    for (let p = 0; p < TIER.PROFILES; p++) {
      const buf = this.travel[p]
      for (let slot = 0; slot < 128; slot++) {
        const at = 8 * slot
        // 2.0 mm actuation on a 4 mm switch, RT on both edges at 0.1 mm.
        const actuation = 19 // stores value - 1
        const rt = 9
        buf[at + 0] = 0xa0
        buf[at + 1] = 0
        buf[at + 2] = actuation & 0xff
        buf[at + 3] = ((actuation >> 8) & 1) | 0x14
        buf[at + 4] = rt & 0xff
        buf[at + 5] = ((rt >> 8) & 1) | 0
        buf[at + 6] = rt & 0xff
        buf[at + 7] = ((rt >> 8) & 1) | 0
      }
    }
  }

  _seedRgb() {
    const palette = [
      [0x88, 0x39, 0xef],
      [0xea, 0x76, 0xcb],
      [0x17, 0x92, 0x99],
      [0xfe, 0x64, 0x0b],
      [0x72, 0x87, 0xfd],
      [0xdc, 0x8a, 0x78],
    ]
    for (let p = 0; p < TIER.PROFILES; p++) {
      for (let slot = 0; slot < 128; slot++) {
        const [r, g, b] = palette[slot % palette.length]
        const at = 3 * slot
        this.rgb[p][at] = r
        this.rgb[p][at + 1] = g
        this.rgb[p][at + 2] = b
      }
    }
  }

  // ---------------------------------------------------------------- lifecycle

  async open() {
    return this
  }

  close() {
    this.stopTravelFeed()
  }

  get connected() {
    return true
  }

  get info() {
    return { vendorId: 0xfeed, productId: 0x5eea, productName: 'Nexus 61S (demo)' }
  }

  on(name, fn) {
    if (!this._listeners.has(name)) this._listeners.set(name, new Set())
    this._listeners.get(name).add(fn)
    return () => this._listeners.get(name).delete(fn)
  }

  _emit(name, payload) {
    for (const fn of this._listeners.get(name) ?? []) {
      try {
        fn(payload)
      } catch (err) {
        console.error('[mewxus] mock listener failed', err)
      }
    }
  }

  /**
   * Drive the faux key-travel feed. Real boards emit `0xA0` frames when a key
   * moves; this simulates a keystroke so the live keycap animation, the
   * actuation readout, and the depth meter all have something to render.
   */
  startTravelFeed(intervalMs = 900) {
    this.stopTravelFeed()
    this._travelTimer = setInterval(() => {
      const slot = Math.floor(Math.random() * 61)
      const depth = Math.round(Math.random() * 400) / 100
      const frame = new Uint8Array(64)
      frame[0] = 0xa0
      frame[1] = slot & 0xff
      frame[2] = Math.round(depth * 100) & 0xff
      this._emit('travel', frame)
    }, intervalMs)
    return this
  }

  stopTravelFeed() {
    if (this._travelTimer) clearInterval(this._travelTimer)
    this._travelTimer = null
  }

  // ------------------------------------------------------------------- reads

  async identify() {
    return { firmware: this.firmware, raw: new Uint8Array(64) }
  }

  async activeProfile() {
    return this.profileIndex
  }

  async setActiveProfile(index) {
    this.profileIndex = index
    this._emit('profile', index)
  }

  async readConfig(profile = 0) {
    return Array.from(this.config[profile])
  }

  async writeConfig(bytes, profile = 0) {
    this.config[profile] = Uint8Array.from(bytes)
  }

  async readKeymap(profile, layer) {
    return Array.from(this.keymap[profile][layer])
  }

  async writeKeySlot(slot, key, profile, layer) {
    const buf = this.keymap[profile][layer]
    buf[3 * slot] = key.type
    buf[3 * slot + 1] = key.code1
    buf[3 * slot + 2] = key.code2
  }

  async writeKeyLayer(keys, profile, layer) {
    const buf = this.keymap[profile][layer]
    keys.forEach((k, i) => {
      buf[3 * i] = k.type ?? 0
      buf[3 * i + 1] = k.code1 ?? 0
      buf[3 * i + 2] = k.code2 ?? 0
    })
  }

  async readTravel(profile) {
    return Array.from(this.travel[profile])
  }

  async writeTravel(bytes, profile) {
    this.travel[profile] = Uint8Array.from(bytes)
  }

  async readKeyColors(profile) {
    return Array.from(this.rgb[profile])
  }

  async writeKeyColor(slot, rgb, profile) {
    const buf = this.rgb[profile]
    buf[3 * slot] = rgb[0]
    buf[3 * slot + 1] = rgb[1]
    buf[3 * slot + 2] = rgb[2]
  }

  async writeKeyColors(bytes, profile) {
    this.rgb[profile] = Uint8Array.from(bytes)
  }

  async readLogoColors() {
    return Array.from(this.logoRgb)
  }

  async readDks(profile) {
    return Array.from(this.dks[profile])
  }

  async writeDks(bytes, profile) {
    this.dks[profile] = Uint8Array.from(bytes)
  }

  async readMt(profile) {
    return Array.from(this.mt[profile])
  }

  async writeMt(bytes, profile) {
    this.mt[profile] = Uint8Array.from(bytes)
  }

  async readTgl(profile) {
    return Array.from(this.tgl[profile])
  }

  async writeTgl(bytes, profile) {
    this.tgl[profile] = Uint8Array.from(bytes)
  }

  async readMacro() {
    return new Array(TIER.MACRO_BYTES).fill(0)
  }

  async writeMacro() {
    /* macros are not simulated; the editor exercises its own state */
  }

  async reset() {
    this._seedConfig()
    this._seedKeymaps()
    this._seedTravel()
    this._seedRgb()
    this._emit('reset', true)
  }

  async restoreFactorySettings() {
    await this.reset()
  }

  async startCalibration() {}
  async endCalibration() {}

  async enterBootMode() {
    throw new Error('Firmware flashing is disabled in demo mode.')
  }
}
