import {
  defineConfig,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

/**
 * Mewxus design tokens.
 *
 * The visual world is pinned by the product brief: pastel pixel art on the
 * Catppuccin Latte palette. Two rules follow from "pixel art" and are enforced
 * by the rules below rather than left to discipline:
 *
 *   1. Nothing is rounded. Every corner is a hard step.
 *   2. Depth is drawn, never blurred. Elevation is a stack of solid offsets,
 *      which is what a 1x sprite actually looks like; a soft drop shadow would
 *      be a different, non-pixel medium.
 *
 * Latte is a *light* palette, so the surface colour is base/mantle, and the
 * pastel accents (mauve, pink, teal, peach, lavender) are the ink. The palette's
 * own softest tones — overlay0/1/2, surface2 — are too low-contrast to carry
 * text on light ground; they are registered for chrome and separators only.
 */
const latte = {
  rosewater: '#dc8a78',
  flamingo: '#dd7878',
  pink: '#ea76cb',
  mauve: '#8839ef',
  red: '#d20f39',
  maroon: '#e64553',
  peach: '#fe640b',
  yellow: '#df8e1d',
  green: '#40a02b',
  teal: '#179299',
  sky: '#04a5e5',
  sapphire: '#209fb5',
  blue: '#1e66f5',
  lavender: '#7287fd',

  text: '#4c4f69',
  subtext1: '#5c5f77',
  subtext0: '#6c6f85',
  overlay2: '#7c7f93',
  overlay1: '#8c8fa1',
  overlay0: '#9ca0b0',
  surface2: '#acb0be',
  surface1: '#bcc0cc',
  surface0: '#ccd0da',
  base: '#eff1f5',
  mantle: '#e6e9ef',
  crust: '#dce0e8',
}

// Sprite-block shadows: hard offsets only, no blur, no spread.
const step = (n) => `${n}px ${n}px 0 0`

export default defineConfig({
  presets: [presetWind3()],

  transformers: [transformerDirectives(), transformerVariantGroup()],

  theme: {
    colors: {
      ...latte,
      // Semantic aliases so components read by role, not by hue name.
      ink: latte.text,
      'ink-soft': latte.subtext0,
      'ink-faint': latte.overlay0,
      ground: latte.base,
      well: latte.mantle,
      edge: latte.surface0,
      accent: latte.mauve,
      live: latte.green,
      warn: latte.peach,
      danger: latte.red,
    },
    fontFamily: {
      // Chunky pixel face: chrome, headings, the mascot. Never body copy —
      // it is legible at 8px but exhausting in paragraphs.
      pixel: ['"Press Start 2P"', '"Silkscreen"', 'monospace'],
      // Readable rounded sans: labels, values, help text, data.
      sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
      // Tabular data: keycodes, byte values, addresses.
      mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
    },
    spacing: {
      // Pixel grid unit. Every gap and pad is a multiple of 4.
      px: '4px',
    },
  },

  shortcuts: {
    // ---- surfaces -------------------------------------------------------
    'mx-panel':
      'bg-base border-3 border-solid border-ink shadow-[4px_4px_0_0_var(--un-shadow-color)] shadow-edge',
    'mx-well': 'bg-well border-2 border-solid border-surface1 inset-shadow-[2px_2px_0_0_#ccd0da]',
    'mx-inset': 'bg-crust border-2 border-solid border-surface2 shadow-[inset_2px_2px_0_0_#ccd0da]',

    // ---- controls -------------------------------------------------------
    // Press states translate into the shadow, which is the whole point of a
    // stepped shadow: the button physically moves down onto its own edge.
    'mx-btn':
      'inline-flex items-center justify-center gap-2 font-sans font-700 text-sm leading-none px-3 py-2 ' +
      'bg-surface0 text-ink border-3 border-solid border-ink cursor-pointer select-none ' +
      'shadow-[3px_3px_0_0_var(--un-shadow-color)] shadow-ink ' +
      'transition-[transform,box-shadow,background-color] duration-75 ' +
      'hover:bg-surface1 ' +
      'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ' +
      'focus-visible:outline-none focus-visible:bg-lavender/25 focus-visible:border-mauve ' +
      'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-surface0',

    'mx-btn-primary':
      'mx-btn bg-mauve text-base border-mauve shadow-[3px_3px_0_0_#5b21b6] hover:bg-[#7c2fd6]',

    'mx-btn-danger':
      'mx-btn bg-red text-base border-[#8f0a27] shadow-[3px_3px_0_0_#8f0a27] hover:bg-[#c00e34]',

    'mx-btn-ghost': 'mx-btn bg-transparent border-transparent shadow-none hover:bg-surface0',

    'mx-tab':
      'font-sans font-700 text-xs px-3 py-2 border-3 border-solid border-ink cursor-pointer ' +
      'bg-well text-ink-soft select-none transition-colors duration-75 hover:bg-surface0 ' +
      'aria-selected:bg-mauve aria-selected:text-base aria-selected:shadow-[inset_0_-3px_0_0_#5b21b6]',

    'mx-chip':
      'inline-flex items-center gap-1 font-mono text-[11px] px-2 py-1 bg-mantle border-2 border-solid border-surface1 text-ink-soft',

    // ---- form -----------------------------------------------------------
    'mx-field':
      'font-sans text-sm px-3 py-2 bg-base text-ink border-3 border-solid border-ink ' +
      'shadow-[inset_2px_2px_0_0_#ccd0da] outline-none placeholder:text-overlay0 ' +
      'focus:border-mauve focus:shadow-[inset_2px_2px_0_0_#e9d5ff]',

    'mx-label': 'font-sans font-700 text-[11px] uppercase tracking-[0.08em] text-ink-soft',

    'mx-num': 'font-mono text-xs tabular-nums text-ink',

    // ---- type -----------------------------------------------------------
    'mx-h1': 'font-pixel text-lg leading-relaxed text-ink',
    'mx-h2': 'font-pixel text-sm leading-relaxed text-ink',
    'mx-h3': 'font-sans font-800 text-sm text-ink tracking-tight',
    'mx-body': 'font-sans text-sm leading-relaxed text-ink-soft',
    'mx-caption': 'font-sans text-xs text-ink-faint',
  },

  rules: [
    // Pixel-art geometry: a 3px border plus a hard stepped shadow reads as a
    // 1x sprite edge. Both are generated, not hand-written per component.
    [/^mx-shadow-(\d)$/, ([, n]) => ({ 'box-shadow': `${step(n)} var(--un-shadow-color, #4c4f69)` })],
    // Checkerboard ground used behind transparent/keyless regions.
    [
      'mx-checker',
      {
        'background-image':
          'linear-gradient(45deg, #ccd0da 25%, transparent 25%, transparent 75%, #ccd0da 75%),' +
          'linear-gradient(45deg, #ccd0da 25%, transparent 25%, transparent 75%, #ccd0da 75%)',
        'background-size': '8px 8px',
        'background-position': '0 0, 4px 4px',
      },
    ],
    [
      'mx-dither',
      {
        'background-image':
          'radial-gradient(#bcc0cc 1px, transparent 1px)',
        'background-size': '4px 4px',
      },
    ],
    // Scanline wash for the "screen" surfaces. Static, so it costs nothing.
    [
      'mx-scan',
      {
        'background-image':
          'repeating-linear-gradient(0deg, rgba(76,79,105,.04) 0 1px, transparent 1px 3px)',
      },
    ],
    [/^mx-step-(\d+)$/, ([, n]) => ({ transition: `all ${n}ms steps(${Math.max(2, +n / 30)})` })],
  ],

  safelist: [
    // Keycap states are applied from JS by class name, so they must exist in
    // the built stylesheet regardless of what the templates happen to contain.
    'bg-mauve', 'text-base', 'bg-lavender', 'bg-peach', 'bg-teal', 'bg-pink', 'bg-sky',
    'bg-surface0', 'bg-surface1', 'bg-base', 'bg-well', 'bg-mantle',
    'border-ink', 'border-mauve', 'border-danger', 'border-live',
    'text-ink', 'text-ink-soft', 'text-ink-faint',
    'shadow-[3px_3px_0_0_#4c4f69]', 'shadow-none',
  ],

  /**
   * Blade templates are not part of Vite's module graph, so UnoCSS never sees
   * them through normal scanning: the plugin only extracts from modules it is
   * asked to transform. `content.filesystem` is what makes it read them off
   * disk. Without this the build succeeds, preflight ships, and every `mx-*`
   * shortcut and utility class silently vanishes.
   */
  content: {
    filesystem: [
      'resources/views/**/*.blade.php',
      'resources/js/**/*.js',
      'app/**/*.php',
    ],
    pipeline: {
      include: [
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
        /\.blade\.php$/,
      ],
    },
  },
})
