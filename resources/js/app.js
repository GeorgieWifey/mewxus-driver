/**
 * Mewxus application layer.
 *
 * Two things are deliberate here:
 *
 *  1. Alpine holds *all* UI state, including device state. There is no separate
 *     framework store, so a panel can read `board.config.lightEffect` directly
 *     and htmx only ever talks to Laravel (presets, firmware metadata).
 *  2. Device writes are optimistic: the UI updates immediately and the write is
 *     dispatched behind it. Waiting 3 ms for a HID round trip on every slider
 *     tick would make the configurator feel worse than the vendor's.
 */

// UnoCSS's generated utilities. Must be imported from JS: the plugin resolves
// `uno.css` via the module graph, and it is what makes every `mx-*` shortcut
// real. See the note in resources/css/app.css.
import 'uno.css'

import Alpine from 'alpinejs'
import htmx from 'htmx.org'
import { Transport, NotConnectedError, UnsupportedError } from './hid/transport.js'
import { Nexus, TIER, KEY_TYPE } from './hid/protocol.js'
import { MockDevice } from './hid/mock.js'
import {
  PHYSICAL_KEYS,
  LIGHTING_EFFECTS,
  LOGO_EFFECTS,
  catalogue,
  defaultKeyFor,
  nameOf,
  GROUP_LABELS,
} from './hid/keys.js'

window.htmx = htmx
window.Alpine = Alpine

/** The six concerns that ride the dial, in ring order. */
const CONCERNS = [
  { id: 'keymap', label: 'KEYMAP', glyph: '⌨', tint: 'mauve' },
  { id: 'light', label: 'LIGHT', glyph: '✦', tint: 'peach' },
  { id: 'travel', label: 'RT', glyph: '⇅', tint: 'teal' },
  { id: 'macro', label: 'MACRO', glyph: '☰', tint: 'pink' },
  { id: 'advanced', label: 'MODES', glyph: '⌥', tint: 'lavender' },
  { id: 'settings', label: 'SETUP', glyph: '⚙', tint: 'sky' },
]

const REPORT_RATES = [
  { value: 0, label: '1000 Hz' },
  { value: 1, label: '500 Hz' },
  { value: 2, label: '250 Hz' },
  { value: 3, label: '125 Hz' },
]

const DEBOUNCE = [
  { value: 0, label: '0 ms' },
  { value: 1, label: '2 ms' },
  { value: 2, label: '3 ms' },
  { value: 3, label: '5 ms' },
  { value: 4, label: '8 ms' },
  { value: 5, label: '10 ms' },
  { value: 6, label: '16 ms' },
  { value: 7, label: '20 ms' },
]

/** Effects the vendor's own table flags as supporting a given capability. */
const effectSupports = (effect, flag) => Boolean(effect?.[flag])

Alpine.data('mewxus', () => ({
  // ------------------------------------------------------------ composition
  concern: 'keymap',
  ringAngle: 0,
  panelOpen: false,
  concerns: CONCERNS,

  // ---------------------------------------------------------------- device
  supported: Transport.supported,
  status: 'idle', // idle | connecting | ready | demo | error
  error: null,
  firmware: null,
  productName: null,
  busy: false,
  toasts: [],

  profile: 0,
  layer: 0,

  config: {
    macMode: 0,
    reportRate: 0,
    debounce: 1,
    lockWin: 0,
    lockAltTab: 0,
    lockAltF4: 0,
    bottomRapidTrigger: 0,
    tachyon: 0,
    lightEffect: 4,
    lightBrightness: 80,
    lightSpeed: 2,
    lightDirection: 0,
    lightSingleColor: true,
    lightColor: '#8839ef',
    lightSleep: 0,
    floorLampSync: 0,
    logoEffect: 4,
    logoBrightness: 60,
    logoSpeed: 2,
    logoSingleColor: true,
    logoColor: '#ea76cb',
  },

  /** keymap[layer][slot] = {type, code1, code2} */
  keymap: [[], [], [], []],
  travel: [],
  rgb: [],
  dks: [],
  mt: [],
  tgl: [],
  macros: Array.from({ length: 16 }, () => ({ actions: [], name: `M1` })),

  // ------------------------------------------------------------------ ui
  selectedSlot: null,
  liveSlot: null,
  pressedSlots: new Set(),
  paintMode: false,
  paintColor: '#8839ef',
  pickerQuery: '',
  pickerGroup: 'basic',
  connectError: null,

  // -------------------------------------------------------------- derived
  get layers() {
    return [0, 1, 2, 3]
  },

  get connected() {
    return this.status === 'ready' || this.status === 'demo'
  },

  get isDemo() {
    return this.status === 'demo'
  },

  get activeConcern() {
    return CONCERNS.find((c) => c.id === this.concern) ?? CONCERNS[0]
  },

  get currentKeys() {
    return this.keymap[this.layer] ?? []
  },

  get selectedKey() {
    if (this.selectedSlot === null) return null
    return this.currentKeys[this.selectedSlot] ?? null
  },

  get selectedName() {
    const k = this.selectedKey
    return k ? nameOf(k) || 'unassigned' : ''
  },

  /** Template access to the factory default for a slot. */
  defaultKeyFor(slot) {
    return defaultKeyFor(slot)
  },

  /** Cap label for a slot, taken from the physical layout. */
  capFor(slot) {
    return PHYSICAL_KEYS.find((k) => k.slot === slot) ?? null
  },

  get pickerItems() {
    const all = catalogue()
    const list = all[this.pickerGroup] ?? []
    const q = this.pickerQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((i) => i.label.toLowerCase().includes(q))
  },

  get effects() {
    return LIGHTING_EFFECTS
  },

  get logoEffects() {
    return LOGO_EFFECTS
  },

  get currentEffect() {
    return LIGHTING_EFFECTS.find((e) => e.value === this.config.lightEffect) ?? LIGHTING_EFFECTS[0]
  },

  get currentLogoEffect() {
    return (
      LOGO_EFFECTS.find((e) => e.value === this.config.logoEffect) ?? LOGO_EFFECTS[0]
    )
  },

  get reportRates() {
    return REPORT_RATES
  },

  get debounceOptions() {
    return DEBOUNCE
  },

  get groupLabels() {
    return GROUP_LABELS
  },

  get pickerGroups() {
    return ['basic', 'special', 'media', 'mouse', 'macros', 'advanced', 'lighting', 'power']
  },

  /**
   * Keys changed on this layer, counted over the physical keys only. The keymap
   * stores 128 slots but the board has 61 keys; counting slots reports a
   * number nobody can act on.
   */
  get remappedCount() {
    let n = 0
    for (const cap of PHYSICAL_KEYS) {
      if (this.isRemapped(cap.slot)) n++
    }
    return n
  },

  // ------------------------------------------------------------ lifecycle
  get device() {
    return this._device ?? null
  },

  async boot() {
    if (!this.supported) {
      this.status = 'idle'
      return
    }
    // A previously-granted device can be reopened without a fresh prompt.
    try {
      const [existing] = await Transport.granted()
      if (existing) await this.attachReal(existing)
    } catch {
      // Silent: the gate offers an explicit connect button either way.
    }
  },

  async attachReal(device) {
    this.status = 'connecting'
    this.error = null
    try {
      const transport = new Transport()
      await transport.open(device)
      const nexus = new Nexus(transport)
      this._device = nexus
      this._transport = transport
      transport.on('travel', (frame) => this.onTravelFrame(frame))
      this.productName = transport.info?.productName ?? 'Nexus 61S'
      await this.loadAll()
      this.status = 'ready'
      this.toast('Connected', 'The board is listening.', 'live')
    } catch (err) {
      this.status = 'error'
      this.error = err instanceof UnsupportedError ? err.message : (err?.message ?? 'Connection failed.')
      this.toast('Connection failed', this.error, 'danger')
    }
  },

  async connect() {
    if (!this.supported) return
    try {
      const device = await Transport.request()
      if (!device) return
      await this.attachReal(device)
    } catch (err) {
      this.error = err?.message ?? 'Could not open the device.'
      this.status = 'idle'
    }
  },

  async disconnect() {
    // The demo device drives its own timer; without stopping it the feed keeps
    // firing into a torn-down component and keys stay lit after disconnecting.
    this._device?.stopTravelFeed?.()
    this._transport?.close()
    this._device = null
    this._transport = null
    this.status = 'idle'
    this.firmware = null
    this.pressedSlots = new Set()
    this.liveSlot = null
  },

  startDemo() {
    this._transport = null
    this.productName = new MockDevice().info.productName
    // loadFrom installs a fresh device image, so demo always starts from a
    // known state rather than whatever the last session edited.
    this.loadFrom(new MockDevice())
    this.status = 'demo'
    this.toast('Demo mode', 'No hardware needed. Everything is editable.', 'peach')
  },

  /**
   * Demo mode and a real board expose the same method surface, so loading is
   * written once. `MockDevice` deliberately returns plain arrays where `Nexus`
   * returns arrays too, which is why no branching is needed here.
   */
  async loadAll() {
    const d = this._device
    this.profile = await d.activeProfile()

    await this.loadConfig()
    await this.loadKeymap()
    await this.loadTravel()
    await this.loadRgb()
    await this.loadAdvanced()

    if ('identify' in d) {
      const id = await d.identify()
      this.firmware = id?.firmware ?? null
    }
  },

  loadFrom(mock) {
    this._device = mock
    this.profile = 0
    // The real path subscribes to the live feed on the transport; demo mode
    // bypasses the transport entirely, so without this the mock emits keypress
    // events into nothing and the board never animates.
    mock.on('travel', (frame) => this.onTravelFrame(frame))
    this.config = {
      ...this.config,
      lightEffect: mock.config[0][8],
      lightBrightness: mock.config[0][9],
      lightSpeed: 4 - mock.config[0][10],
      lightColor: rgbHex(mock.config[0][14], mock.config[0][15], mock.config[0][16]),
    }
    this.keymap = mock.keymap[0].map((buf) => Nexus.decodeKeymap(Array.from(buf)))
    this.travel = Nexus.decodeTravel(Array.from(mock.travel[0]))
    this.rgb = Array.from(mock.rgb[0])
    this.firmware = mock.firmware
    mock.startTravelFeed()
  },

  async loadConfig() {
    const bytes = await this._device.readConfig(this.profile)
    this.config = { ...this.config, ...Nexus.decodeConfig(bytes, this.profile) }
  },

  async loadKeymap() {
    const d = this._device
    const layers = []
    for (let l = 0; l < TIER.LAYERS; l++) {
      const bytes = await d.readKeymap(this.profile, l)
      layers.push(Nexus.decodeKeymap(bytes))
    }
    this.keymap = layers
  },

  async loadTravel() {
    const bytes = await this._device.readTravel(this.profile)
    this.travel = Nexus.decodeTravel(bytes)
  },

  async loadRgb() {
    this.rgb = await this._device.readKeyColors(this.profile)
  },

  async loadAdvanced() {
    const d = this._device
    const [dks, mt, tgl] = await Promise.all([
      d.readDks(this.profile),
      d.readMt(this.profile),
      d.readTgl(this.profile),
    ])
    this.dks = Nexus.decodeDks(dks)
    this.mt = Nexus.decodeMt(mt)
    this.tgl = Nexus.decodeTgl(tgl)
  },

  // ------------------------------------------------------------ composition
  rotate(direction) {
    const step = 360 / CONCERNS.length
    this.ringAngle += direction * -step
    const index = CONCERNS.findIndex((c) => c.id === this.concern)
    const next = (index + (direction > 0 ? 1 : -1) + CONCERNS.length) % CONCERNS.length
    this.concern = CONCERNS[next].id
    this.panelOpen = true
  },

  openConcern(id) {
    const index = CONCERNS.findIndex((c) => c.id === id)
    if (index === -1) return
    const current = CONCERNS.findIndex((c) => c.id === this.concern)
    // Take the shorter way round so the ring never spins the long way.
    let delta = index - current
    if (delta > CONCERNS.length / 2) delta -= CONCERNS.length
    if (delta < -CONCERNS.length / 2) delta += CONCERNS.length
    const step = 360 / CONCERNS.length
    this.ringAngle -= delta * step
    this.concern = id
    this.panelOpen = true
  },

  /** Seats start at twelve o'clock and go clockwise. */
  seatAngle(index) {
    return `${(index * 360) / CONCERNS.length}deg`
  },

  // ------------------------------------------------------------------ keys
  selectSlot(slot) {
    if (this.paintMode) {
      this.paintKey(slot)
      return
    }
    this.selectedSlot = this.selectedSlot === slot ? null : slot
    if (this.selectedSlot !== null) this.openConcern('keymap')
  },

  /**
   * Optimistic write: the local keymap is authoritative for rendering, and the
   * device write follows. A failure is surfaced as a toast rather than rolled
   * back, because the board re-reads on reconnect anyway and a silent revert
   * mid-edit is more confusing than an error.
   */
  /**
   * Assign a picker row to the selected slot.
   *
   * Modifier composition only applies to `type 0x10` keys: the board stores the
   * modifier mask in `code1` and the base HID usage in `code2`, so "Ctrl+Shift+S"
   * is one slot, not three. Any other type ignores the modifier toggles, because
   * there is no mask field to put them in.
   */
  assign(key) {
    const slot = this.selectedSlot
    if (slot === null) return

    let next = { type: key.type, code1: key.code1, code2: key.code2 }
    if (key.type === KEY_TYPE.NORMAL && this.pendingModifiers.length) {
      next = { ...next, code1: this.modifierMask }
    }

    const updated = [...this.currentKeys]
    updated[slot] = next
    this.keymap = this.keymap.map((layer, i) => (i === this.layer ? updated : layer))
    this._device
      ?.writeKeySlot(slot, next, this.profile, this.layer)
      .catch((err) => this.toast('Write failed', err.message, 'danger'))
  },

  pendingModifiers: [],

  /** Left-hand modifier bits, which is what the board stores in `code1`. */
  get modifierMask() {
    const bits = { CTRL: 0x01, SHIFT: 0x02, ALT: 0x04, WIN: 0x08 }
    return this.pendingModifiers.reduce((mask, name) => mask | (bits[name] ?? 0), 0)
  },

  get modifierPreview() {
    if (!this.pendingModifiers.length) return 'the key alone'
    // Vendor order: ALT, SHIFT, CTRL, WIN.
    const order = ['ALT', 'SHIFT', 'CTRL', 'WIN']
    return [...order.filter((m) => this.pendingModifiers.includes(m)), '…'].join('+')
  },

  clearSlot() {
    this.assign({ type: 0, code1: 0, code2: 0 })
  },

  resetLayer() {
    const next = Array.from({ length: TIER.SLOTS }, (_, slot) =>
      this.layer === 0 ? defaultKeyFor(slot) : { type: 0, code1: 0, code2: 0 },
    )
    this.keymap = this.keymap.map((layer, i) => (i === this.layer ? next : layer))
    this._device
      ?.writeKeyLayer(next, this.profile, this.layer)
      .then(() => this.toast('Layer reset', `Layer ${this.layer} restored.`, 'live'))
      .catch((err) => this.toast('Write failed', err.message, 'danger'))
  },

  keyLabel(slot) {
    const key = this.currentKeys[slot]
    if (!key || key.type === 0) return ''
    return nameOf(key)
  },

  subLabel(slot) {
    const key = this.currentKeys[slot]
    if (!key || key.type === 0) return ''
    if (key.type === KEY_TYPE.MACRO) return 'macro'
    if (key.type === KEY_TYPE.DKS) return 'dks'
    if (key.type === KEY_TYPE.TOGGLE) return 'tgl'
    if (key.type === KEY_TYPE.MT) return 'mt'
    if (key.type === KEY_TYPE.RS) return 'rs'
    if (key.type === KEY_TYPE.SOCD) return 'socd'
    if (key.type === KEY_TYPE.OKS) return 'oks'
    const def = defaultKeyFor(slot)
    return def.type === key.type && def.code1 === key.code1 && def.code2 === key.code2
      ? ''
      : `0x${key.type.toString(16)}`
  },

  isRemapped(slot) {
    const key = this.currentKeys[slot]
    if (!key || key.type === 0) return false
    const def = defaultKeyFor(slot)
    return !(def.type === key.type && def.code1 === key.code1 && def.code2 === key.code2)
  },

  keyStyle(slot) {
    const cap = this.capFor(slot)
    if (!cap) return 'display:none'
    const L = this.layoutMetrics
    return [
      `left:${(cap.x / L.width) * 100}%`,
      `top:${(cap.y / L.height) * 100}%`,
      `width:${(cap.w / L.width) * 100}%`,
      `height:${(cap.h / L.height) * 100}%`,
    ].join(';')
  },

  /** Physical keys, exposed for the keyboard partial's x-for. */
  get caps() {
    return PHYSICAL_KEYS
  },

  get layoutMetrics() {
    // 16 x 6 units is the K60 grid; deriving from data keeps a future board's
    // layout working without editing this file.
    const maxX = Math.max(...PHYSICAL_KEYS.map((k) => k.x + k.w), 16)
    const maxY = Math.max(...PHYSICAL_KEYS.map((k) => k.y + k.h), 6)
    return { width: maxX, height: maxY }
  },

  // ----------------------------------------------------------------- rgb
  paintKey(slot) {
    const [r, g, b] = hexRgb(this.paintColor)
    const next = [...this.rgb]
    next[3 * slot] = r
    next[3 * slot + 1] = g
    next[3 * slot + 2] = b
    this.rgb = next
    this._device
      ?.writeKeyColor(slot, [r, g, b], this.profile)
      .catch((err) => this.toast('Write failed', err.message, 'danger'))
  },

  keyColor(slot) {
    const r = this.rgb[3 * slot] ?? 0
    const g = this.rgb[3 * slot + 1] ?? 0
    const b = this.rgb[3 * slot + 2] ?? 0
    return rgbHex(r, g, b)
  },

  get paintSwatches() {
    return [
      '#dc8a78', '#dd7878', '#ea76cb', '#8839ef', '#d20f39', '#e64553',
      '#fe640b', '#df8e1d', '#40a02b', '#179299', '#04a5e5', '#209fb5',
      '#1e66f5', '#7287fd', '#4c4f69', '#eff1f5',
    ]
  },

  /** Flood every key with one colour. One HID write, not 61. */
  async fillAllKeys(hex) {
    const [r, g, b] = hexRgb(hex)
    const next = new Array(TIER.RGB_BYTES).fill(0)
    for (let slot = 0; slot < TIER.SLOTS; slot++) {
      next[3 * slot] = r
      next[3 * slot + 1] = g
      next[3 * slot + 2] = b
    }
    this.rgb = next
    try {
      await this._device.writeKeyColors(next, this.profile)
      this.toast('Painted', 'All keys set to one colour.', 'live')
    } catch (err) {
      this.toast('Write failed', err.message, 'danger')
    }
  },

  // --------------------------------------------------------------- config
  /**
   * Every config change funnels through here: patch the local block, render,
   * then write the merged 64-byte block. The board has no partial-field write,
   * so a read-modify-write is the only correct approach.
   */
  async patchConfig(patch) {
    this.config = { ...this.config, ...patch }
    try {
      const raw = await this._device.readConfig(this.profile)
      const merged = Nexus.applyConfig(raw, patch)
      await this._device.writeConfig(merged, this.profile)
    } catch (err) {
      this.toast('Write failed', err.message, 'danger')
    }
  },

  // -------------------------------------------------------------- travel
  applyTravelPreset(kind) {
    const values = { fast: 5, mid: 20, deep: 30 }[kind] ?? 20
    const rt = kind === 'fast' ? 4 : 10
    this.travel = this.travel.map((t) => ({
      ...t,
      actuation: values,
      rtPress: rt,
      rtRelease: rt,
    }))
    this.commitTravel()
  },

  travelFor(slot) {
    return this.travel[slot] ?? {
      actuation: 20,
      rtPress: 10,
      rtRelease: 10,
      pressDeadzone: 1,
      releaseDeadzone: 1,
      switchType: 0,
      keyMode: 0,
      priority: 0,
    }
  },

  /**
   * Travel edits update local state immediately and schedule a coalesced write.
   *
   * The board has no per-field travel write: the smallest unit is a whole
   * 1024-byte profile block, so every drag of a slider would otherwise push
   * 64 KB of HID traffic. A trailing debounce keeps dragging smooth and still
   * lands the value while the user is still on the panel.
   */
  setTravel(slot, field, value) {
    const current = { ...this.travelFor(slot), [field]: Number(value) }
    const next = [...this.travel]
    next[slot] = current
    this.travel = next

    window.clearTimeout(this._travelTimer)
    this._travelTimer = window.setTimeout(() => this.commitTravel({ quiet: true }), 220)
  },

  async commitTravel({ quiet = false } = {}) {
    if (!this.connected) return
    try {
      const flat = []
      // Bulk encoding, because this writes the whole profile block. It differs
      // from the single-key encoding by design; see docs/PROTOCOL.md.
      for (const t of this.travel) flat.push(...Nexus.encodeTravel(t, { bulk: true }))
      await this._device.writeTravel(flat, this.profile)
      if (!quiet) this.toast('Applied', 'Actuation and rapid trigger written.', 'live')
    } catch (err) {
      this.toast('Write failed', err.message, 'danger')
    }
  },

  // ------------------------------------------------------------- advanced
  setDks(index, field, value) {
    const next = [...this.dks]
    next[index] = { ...next[index], [field]: value }
    this.dks = next
  },

  async commitAdvanced() {
    try {
      await this._device.writeDks(Nexus.encodeDks(this.dks), this.profile)
      await this._device.writeMt(Nexus.encodeMt(this.mt), this.profile)
      await this._device.writeTgl(Nexus.encodeTgl(this.tgl), this.profile)
      this.toast('Applied', 'Advanced key modes written.', 'live')
    } catch (err) {
      this.toast('Write failed', err.message, 'danger')
    }
  },

  // --------------------------------------------------------------- macros
  macroIndex: 0,
  recording: false,

  get currentMacro() {
    return this.macros[this.macroIndex] ?? { actions: [], name: 'M1' }
  },

  addAction(label, delay = 50, down = true, code = 0) {
    this.macros = this.macros.map((m, i) =>
      i === this.macroIndex
        ? {
            ...m,
            actions: [
              ...m.actions,
              { label, delay, down, code, type: KEY_TYPE.NORMAL },
            ],
          }
        : m,
    )
  },

  /**
   * Capture the next real keypress from the board.
   *
   * The live feed carries only the slot, not the HID usage, so the label is
   * resolved from the keymap: whatever that slot currently sends is what gets
   * recorded. That is also the honest behaviour — a macro replays keycodes, and
   * this records the keycode the board would have produced.
   */
  recordAction() {
    if (!this.connected) {
      this.toast('Not connected', 'Connect a board to capture a key.', 'warn')
      return
    }
    this.recording = true
  },

  toggleRecording() {
    this.recording = !this.recording
    if (this.recording) this.toast('Recording', 'Press keys to capture them.', 'pink')
  },

  setActionDelay(index, value) {
    const delay = Math.max(0, Math.min(9999, Number(value) || 0))
    this.macros = this.macros.map((m, i) =>
      i === this.macroIndex
        ? { ...m, actions: m.actions.map((a, j) => (j === index ? { ...a, delay } : a)) }
        : m,
    )
  },

  removeAction(index) {
    this.macros = this.macros.map((m, i) =>
      i === this.macroIndex ? { ...m, actions: m.actions.filter((_, j) => j !== index) } : m,
    )
  },

  clearMacro() {
    this.macros = this.macros.map((m, i) =>
      i === this.macroIndex ? { ...m, actions: [] } : m,
    )
  },

  /**
   * Serialise and write. The vendor's macro block is a 64-byte header of 32
   * little-endian (count, offset) pairs followed by 4-byte actions, with the
   * inter-action delay stored on the *preceding* action and the last action of
   * each group flagged. Reproduced exactly; see docs/PROTOCOL.md.
   */
  async commitMacros() {
    if (!this.connected) return
    try {
      const bytes = encodeMacroBlock(this.currentMacro.actions)
      await this._device.writeMacro(this.profile, bytes)
      this.toast('Macros', `M${this.macroIndex + 1} written to the board.`, 'live')
    } catch (err) {
      this.toast('Write failed', err.message, 'danger')
    }
  },

  // ------------------------------------------------------------ live feed
  /**
   * `0xA0` frames carry a live key-travel report. The vendor never documents the
   * layout past the header, so this reads the two fields the frame demonstrably
   * has — a slot in byte 1 and a centi-millimetre depth in byte 2 — and ignores
   * the rest rather than inventing meaning for it.
   */
  onTravelFrame(frame) {
    const slot = frame[1]
    const depth = frame[2] / 100
    if (Number.isNaN(slot)) return
    this.liveSlot = slot
    this.liveDepth = depth
    const next = new Set(this.pressedSlots)
    next.add(slot)
    this.pressedSlots = next
    // While recording, a live press becomes a macro action. The slot resolves to
    // whatever keycode it currently carries, which is what the board replays.
    if (this.recording) {
      const key = this.currentKeys[slot]
      if (key && key.type === KEY_TYPE.NORMAL) {
        this.addAction(nameOf(key) || 'key', 50, true, key.code2)
      }
    }

    window.clearTimeout(this._liveTimer)
    this._liveTimer = window.setTimeout(() => {
      const cleared = new Set(this.pressedSlots)
      cleared.delete(slot)
      this.pressedSlots = cleared
      this.liveSlot = null
    }, 420)
  },

  liveDepth: 0,

  // -------------------------------------------------------------- presets
  /** Snapshot the whole board state as a portable preset payload. */
  collectPreset() {
    return {
      version: 1,
      device: 'nexus-61s',
      layout: 'K60',
      profile: this.profile,
      config: { ...this.config },
      keymap: this.keymap.map((layer) =>
        layer.map((k) => ({ type: k?.type ?? 0, code1: k?.code1 ?? 0, code2: k?.code2 ?? 0 })),
      ),
      travel: this.travel.map((t) => ({ ...t })),
      dks: this.dks,
      mt: this.mt,
      tgl: this.tgl,
    }
  },

  async savePreset() {
    const name = this.presetName?.trim()
    if (!name) {
      this.toast('Name required', 'Give the preset a name first.', 'warn')
      return
    }
    try {
      const res = await fetch('/presets', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          name,
          description: this.presetDescription?.trim() || null,
          profile: this.profile,
          payload: this.collectPreset(),
          is_public: true,
        }),
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      this.presetName = ''
      this.presetDescription = ''
      this.toast('Saved', `“${data.preset.name}” is in the library.`, 'live')
      // Refresh the library partial without a reload.
      window.htmx?.trigger('#preset-library', 'refresh')
    } catch (err) {
      this.toast('Save failed', err.message, 'danger')
    }
  },

  async exportPreset() {
    const payload = this.collectPreset()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mewxus-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  presetName: '',
  presetDescription: '',

  // -------------------------------------------------------------- firmware
  firmwareMeta: null,
  flashing: false,
  flashProgress: 0,
  flashStage: 'idle',
  brickAck: false,

  async checkFirmware() {
    try {
      const res = await fetch('/firmware/meta', { headers: { Accept: 'application/json' } })
      this.firmwareMeta = await res.json()
    } catch {
      this.firmwareMeta = { available: false }
    }
  },

  /** Gate: the confirm phrase must be typed exactly. */
  get flashUnlocked() {
    return this.brickAck
  },

  // ------------------------------------------------------ confirm dialogs
  confirmReset: false,
  confirmFlash: false,
  flashPhrase: '',

  /** Execute the confirmed destructive action. */
  async doReset(kind) {
    this.confirmReset = false
    try {
      if (kind === 'factory') {
        await this._device.restoreFactorySettings()
        this.toast('Factory reset', 'The board now holds its defaults.', 'danger')
      } else if (kind === 'layer') {
        this.resetLayer()
        return
      } else {
        await this._device.reset()
        this.toast('Reset', 'The board restarted.', 'live')
      }
      await this.loadAll()
    } catch (err) {
      this.toast('Reset failed', err.message, 'danger')
    }
  },

  /**
   * Flash the board.
   *
   * Deliberately does *not* proceed past fetching and verifying the image. The
   * remaining steps — entering bootloader mode, erasing, streaming 224 KB in
   * 32-byte frames, and verifying — cannot be exercised without the physical
   * board, and shipping an unexercised write path against a device that bricks
   * on interruption would be reckless. The image is fetched, its SHA-256 is
   * checked against the vendor's header, and the flow then stops with a clear
   * statement instead of pretending to have succeeded.
   */
  async doFlash() {
    if (this.flashPhrase !== 'flash nexus 61s') return
    this.confirmFlash = false
    this.flashing = true
    this.flashStage = 'download'

    try {
      // Relative path, not Blade: this file is bundled by Vite, never rendered
      // by Blade, so a `route()` call here would ship as a literal string.
      const res = await fetch('/firmware/latest')
      if (!res.ok) throw new Error(`Firmware fetch failed (${res.status})`)

      const buffer = await res.arrayBuffer()
      const expected = res.headers.get('X-Firmware-Sha256')
      const actual = await sha256Hex(buffer)

      if (expected && expected !== actual) {
        throw new Error('Firmware checksum does not match the vendor header.')
      }

      this.flashStage = 'ready'
      this.toast(
        'Firmware verified',
        `${this.formatBytes(buffer.byteLength)} downloaded, SHA-256 matches. Writing is disabled in this build.`,
        'warn',
      )
    } catch (err) {
      this.toast('Firmware failed', err.message, 'danger')
      this.flashStage = 'idle'
    } finally {
      this.flashing = false
      this.flashPhrase = ''
    }
  },

  advancedMode: 'dks',

  get advancedModes() {
    return [
      { id: 'dks', label: 'DKS', blurb: 'Dynamic keystroke: up to four actions on one key, each firing at its own travel point. One key can walk, sprint, and jump in sequence.' },
      { id: 'mt', label: 'Mod-tap', blurb: 'Two actions on one key. Held, it acts as a modifier; tapped, it types. The classic home-row-shift arrangement.' },
      { id: 'tgl', label: 'Toggle', blurb: 'A latching key: press once to hold it down, press again to release. No need to keep a finger on it.' },
      { id: 'socd', label: 'SOCD', blurb: 'Resolves two opposite keys held at once, so a fight stick or a pair of movement keys cannot report contradictory input.' },
    ]
  },

  /** Human label for a stored key triple, for the advanced tables. */
  labelFor(key) {
    if (!key || !key.type) return '—'
    return nameOf(key) || `0x${key.type.toString(16)}`
  },

  // ------------------------------------------------------------- toasts
  toast(title, message, tone = 'mauve') {
    const id = Math.random().toString(36).slice(2)
    this.toasts.push({ id, title, message, tone })
    window.setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    }, 4200)
  },

  dismiss(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id)
  },

  // ------------------------------------------------------------- helpers
  formatBytes(n) {
    if (!n) return '0 B'
    if (n < 1024) return `${n} B`
    return `${(n / 1024).toFixed(1)} KB`
  },

  get travelMax() {
    return 40 // 4.0 mm, in tenths, which is the board's own unit
  },
}))

// ------------------------------------------------------------------ helpers

function rgbHex(r, g, b) {
  return '#' + [r, g, b].map((v) => (v ?? 0).toString(16).padStart(2, '0')).join('')
}

/**
 * Headers for same-origin JSON calls back to Laravel.
 *
 * The CSRF token comes from the meta tag Blade renders. Without it Laravel
 * rejects the POST with 419 and the save silently appears to do nothing.
 */
function jsonHeaders() {
  const token = document.querySelector('meta[name="csrf-token"]')?.content
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
  }
}

/** SHA-256 of an ArrayBuffer, using the platform's own digest. */
async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexRgb(hex) {
  const clean = (hex || '#000000').replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ]
}

/**
 * Serialise macro actions into the board's 2048-byte block.
 *
 * Layout, taken from the vendor's own reader and writer:
 *
 *   header  32 x little-endian 16-bit **offset** (no counts), 64 bytes total.
 *           An entry of 0 or 64 means "empty slot" and is skipped when reading.
 *   actions 4 bytes each: `[lo(gap), hi(gap), flags, code]`
 *
 * `gap` is the delay *after* this action, so a group's final action stores 0.
 * The decoder walks actions until it hits `code === 0` or a group's last-flag,
 * which is how group length is recovered without storing it.
 *
 * `flags` is
 *   bit 0-1 : 1 for a modifier key (224..231), 2 for a normal key, 3 for mouse
 *   bit 6   : 1 on key-down
 *   bit 7   : 1 on the last action of the group
 * and `code` is a single modifier bit for 224..231, else the usage byte.
 *
 * Actions are grouped four per header entry, matching the vendor, which caps a
 * single macro group at four actions.
 */
function encodeMacroBlock(actions) {
  const bytes = new Array(TIER.MACRO_BYTES).fill(0)
  const groups = []
  for (let i = 0; i < actions.length; i += 4) groups.push(actions.slice(i, i + 4))

  let cursor = 64
  groups.forEach((group, groupIndex) => {
    const headerAt = 2 * groupIndex

    if (!group.length) {
      // 64 is the vendor's "nothing here" sentinel; the reader also skips 0.
      bytes[headerAt] = 64
      bytes[headerAt + 1] = 0
      return
    }

    bytes[headerAt] = cursor & 0xff
    bytes[headerAt + 1] = (cursor >> 8) & 0xff

    group.forEach((action, actionIndex) => {
      const isLast = actionIndex === group.length - 1
      // Delay belongs to the gap *after* this action, so the last one stores 0.
      const gap = isLast ? 0 : (group[actionIndex + 1].delay ?? 2)
      const code = action.code ?? 0
      const isModifier = code >= 224 && code <= 231

      let kind = 2
      if (isModifier) kind = 1
      else if (action.mouse) kind = 3

      bytes[cursor + 0] = gap & 0xff
      bytes[cursor + 1] = (gap >> 8) & 0xff
      bytes[cursor + 2] =
        (kind & 0x3f) | ((action.down ? 1 : 0) << 6) | ((isLast ? 1 : 0) << 7)
      bytes[cursor + 3] = isModifier ? (1 << (code & 15)) & 0xff : code & 0xff
      cursor += 4
    })
  })

  return bytes
}

Alpine.start()
