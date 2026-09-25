/**
 * Keycode naming and lookup.
 *
 * Two naming paths exist and they are not interchangeable:
 *
 *   - `nameOf({type, code1, code2})` decodes a *stored* slot, reproducing the
 *     vendor's `K()` exactly, including modifier composition for type 0x10.
 *   - `catalogue()` returns the pickable list, which is the vendor's four
 *     separate tables (basic, special, media, mouse) flattened with the type
 *     byte each table implies.
 *
 * Keeping them separate matters: a slot's `type` is authoritative, while the
 * picker's rows carry no `type` at all and have to be given one.
 */

import layoutData from '../../data/layout.js'
import keycodeData from '../../data/keycodes.js'
import { KEY_TYPE } from './protocol.js'

export const LAYOUT = layoutData

/** Modifier bit pairs in a type-0x10 `code1`. Bits 0-3 are left, 4-7 right. */
const MODIFIERS = [
  { bit: 0x01, bitRight: 0x10, label: 'CTRL' },
  { bit: 0x02, bitRight: 0x20, label: 'SHIFT' },
  { bit: 0x04, bitRight: 0x40, label: 'ALT' },
  { bit: 0x08, bitRight: 0x80, label: 'WIN' },
]

/** Vendor order: ALT, SHIFT, CTRL, WIN. Reproduced deliberately. */
const MODIFIER_ORDER = ['ALT', 'SHIFT', 'CTRL', 'WIN']

const BASIC_BY_CODE = new Map(keycodeData.basic.map((k) => [k.code, k.key]))
const SPECIAL = keycodeData.special
const MEDIA = keycodeData.media
const MOUSE = keycodeData.mouse
const EXTRA = keycodeData.extra

const POWER_LABELS = ['', 'Power', 'Sleep', '', 'WakeUp']

/** Human name for a stored slot. Mirrors the vendor's `K()`. */
export function nameOf(key) {
  if (!key) return ''
  const { type, code1 = 0, code2 = 0 } = key

  if (type === KEY_TYPE.NORMAL) {
    const base = BASIC_BY_CODE.get(code2) ?? ''
    if (!code1) return base
    const parts = []
    for (const label of MODIFIER_ORDER) {
      const mod = MODIFIERS.find((m) => m.label === label)
      const active = (code1 & mod.bit) !== 0 || (code1 & mod.bitRight) !== 0
      if (active) parts.push(label)
    }
    if (base) parts.push(base)
    return parts.join('+')
  }

  if (type === KEY_TYPE.MACRO) return `M${code1 + 1}`
  if (type === KEY_TYPE.DKS) return 'DKS'
  if (type === KEY_TYPE.TOGGLE) return 'TGL'
  if (type === KEY_TYPE.MT) return 'MT'
  if (type === KEY_TYPE.RS) return 'RS'
  if (type === KEY_TYPE.SOCD) return 'SOCD'
  if (type === KEY_TYPE.OKS) return 'OKS'

  if (type === KEY_TYPE.POWER) return POWER_LABELS[code1] ?? ''

  if (type === KEY_TYPE.MOUSE_BUTTON || type === KEY_TYPE.MOUSE_WHEEL) {
    return MOUSE.find((m) => m.code1 === code1 && m.code2 === code2)?.name ?? ''
  }

  if (type === KEY_TYPE.FN) {
    return SPECIAL.find((s) => s.code === code1 && s.code1 === code2)?.key ?? ''
  }

  if (type === KEY_TYPE.MEDIA) {
    return MEDIA.find((m) => m.code === code1 && m.code1 === code2)?.key ?? ''
  }

  if (type === KEY_TYPE.LIGHT) {
    return EXTRA.find((e) => e.code === code1 && e.code1 === code2)?.key ?? ''
  }

  return ''
}

/**
 * Everything the picker can offer, each row already carrying the type byte it
 * would store. Grouped so the UI can render sections without re-deriving.
 *
 * `code1` for a basic key is the modifier mask (0 = unmodified) and `code2` is
 * the HID usage; that ordering is the board's, not the HID spec's.
 */
export function catalogue() {
  const basic = keycodeData.basic.map((k) => ({
    group: 'keys',
    label: k.key,
    type: KEY_TYPE.NORMAL,
    code1: 0,
    code2: k.code,
  }))

  const special = SPECIAL.map((s) => ({
    group: 'fn',
    label: s.key,
    type: KEY_TYPE.FN,
    code1: s.code,
    code2: s.code1 ?? 0,
  }))

  const media = MEDIA.map((m) => ({
    group: 'media',
    label: m.key,
    type: KEY_TYPE.MEDIA,
    code1: m.code,
    code2: m.code1 ?? 0,
  }))

  const mouse = MOUSE.map((m) => ({
    group: 'mouse',
    label: m.name,
    type: m.type,
    code1: m.code1,
    code2: m.code2,
  }))

  const macros = Array.from({ length: 16 }, (_, i) => ({
    group: 'macro',
    label: `M${i + 1}`,
    type: KEY_TYPE.MACRO,
    code1: i,
    code2: 0,
  }))

  const advanced = [
    { group: 'advanced', label: 'DKS', type: KEY_TYPE.DKS, code1: 0, code2: 0 },
    { group: 'advanced', label: 'TGL', type: KEY_TYPE.TOGGLE, code1: 0, code2: 0 },
    { group: 'advanced', label: 'MT', type: KEY_TYPE.MT, code1: 0, code2: 0 },
    { group: 'advanced', label: 'RS', type: KEY_TYPE.RS, code1: 0, code2: 0 },
    { group: 'advanced', label: 'SOCD', type: KEY_TYPE.SOCD, code1: 0, code2: 0 },
    { group: 'advanced', label: 'OKS', type: KEY_TYPE.OKS, code1: 0, code2: 0 },
  ]

  const lighting = EXTRA.map((e) => ({
    group: 'light',
    label: e.key,
    type: KEY_TYPE.LIGHT,
    code1: e.code,
    code2: e.code1 ?? 0,
  }))

  const power = [1, 2, 4].map((i) => ({
    group: 'power',
    label: POWER_LABELS[i],
    type: KEY_TYPE.POWER,
    code1: i,
    code2: 0,
  }))

  return { basic, special, media, mouse, macros, advanced, lighting, power }
}

export const GROUP_LABELS = {
  basic: 'Letters & symbols',
  special: 'Functions',
  media: 'Media',
  mouse: 'Mouse',
  macros: 'Macros',
  advanced: 'Advanced',
  lighting: 'Lighting',
  power: 'System',
}

/**
 * The factory default for a slot, straight from the bundled layout data.
 *
 * `code2` is masked to a byte. The vendor's table stores modifier entries with
 * `code2` holding the modifier's bit value as a 16-bit number (256, 512, 8192…),
 * which does not fit the single `code2` byte the board stores. The real device
 * holds that entry as `code1 = <bit>, code2 = 0`, which is also what the board's
 * own namer reads back. Masking here keeps "is this key remapped?" honest
 * instead of reporting every modifier key as changed.
 */
export function defaultKeyFor(slot) {
  const entry = LAYOUT.codes[slot]
  if (!entry) return { type: 0, code1: 0, code2: 0 }
  return {
    type: entry.type & 0xff,
    code1: (entry.code1 ?? 0) & 0xff,
    code2: (entry.code2 ?? 0) & 0xff,
  }
}

/**
 * The vendor's `I()`: stored slot triple -> the pseudo-code carried by
 * `keys[].code`. This is the only correct bridge between the two tables.
 */
const MODIFIER_PSEUDO = { 1: 224, 2: 225, 4: 226, 8: 227, 16: 228, 32: 229, 64: 230, 128: 231 }

export function pseudoCode(key) {
  const { type = 0, code1 = 0, code2 = 0 } = key
  if (type === KEY_TYPE.NORMAL) {
    if (code1 !== 0) return MODIFIER_PSEUDO[code1] ?? 0
    return code2
  }
  if (type === KEY_TYPE.FN && code1 === 255) return 255
  if (type === KEY_TYPE.LIGHT && code2 === 0 && code1 >= 1 && code1 <= 4) return 199 + code1
  return 0
}

/**
 * Pair every physical keycap with the keymap slot it controls.
 *
 * `layouts.keys` (visual) and `layouts.codes` (slot-ordered) are not
 * index-aligned; pairing them directly puts `1` on the F1 cap. The vendor
 * bridges them by matching on the pseudo-code derived above.
 */
function buildSlotMap() {
  const byPseudo = new Map()
  LAYOUT.codes.forEach((entry, slot) => {
    const code = pseudoCode(entry)
    if (!byPseudo.has(code)) byPseudo.set(code, [])
    byPseudo.get(code).push(slot)
  })

  const used = new Set()
  const physical = LAYOUT.keys.filter((k) => k.mode !== 1)
  const map = new Map()

  for (const [index, cap] of physical.entries()) {
    const candidates = (byPseudo.get(cap.code) ?? []).filter((s) => !used.has(s))
    if (candidates.length) {
      map.set(index, candidates[0])
      used.add(candidates[0])
    }
  }

  // The `Menu` cap has no counterpart in the code table; give it the lowest
  // slot nothing else claimed so the key stays editable instead of dead.
  for (let i = 0; i < physical.length; i++) {
    if (map.has(i)) continue
    const free = Array.from({ length: LAYOUT.codes.length }, (_, s) => s).find((s) => !used.has(s))
    if (free === undefined) break
    map.set(i, free)
    used.add(free)
  }

  return map
}

const SLOT_OF_VISUAL_INDEX = buildSlotMap()

/**
 * Physical keys paired with the slot they control. `mode: 1` alternates are
 * omitted: they are alternate caps for the same physical switch, not extra keys.
 */
export const PHYSICAL_KEYS = LAYOUT.keys
  .filter((k) => k.mode !== 1)
  .map((cap, visualIndex) => ({
    ...cap,
    visualIndex,
    slot: SLOT_OF_VISUAL_INDEX.get(visualIndex) ?? visualIndex,
  }))

/** The 23 lighting effects, as data. */
export const LIGHTING_EFFECTS = LAYOUT.effects
export const LOGO_EFFECTS = LAYOUT.logoEffects

/**
 * Effects are addressed by their `value`, and the logo light only supports a
 * subset, so a logo effect has to be looked up by value rather than by position.
 */
export const effectByValue = (value, { logo = false } = {}) => {
  const list = logo ? LOGO_EFFECTS : LIGHTING_EFFECTS
  return list.find((e) => e.value === value) ?? list[0]
}

/** A no-op slot, used for empty picker rows and cleared keys. */
export const BLANK_KEY = { type: 0, code1: 0, code2: 0 }
