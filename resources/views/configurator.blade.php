@extends('layouts.app')

@section('title', 'Mewxus — Nexus 61S configurator')

@section('body')
    {{-- Top bar: identity, live status, and the demo switch. --}}
    <header class="border-b-3 border-b-ink bg-base">
        <div class="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3">
                {{-- The mascot's frame is chosen by Alpine, so the component is
                     rendered without a fixed state and `data-state` is bound. --}}
                <x-mascot
                    state="idle"
                    x-bind:data-state="!connected ? 'idle' : (liveSlot !== null ? 'live' : 'working')"
                    x-bind:aria-label="!connected ? 'Mewxus mascot, idle' : 'Mewxus mascot, listening'"
                />
                <div>
                    <h1 class="mx-h1">MEWXUS</h1>
                    <p class="mx-caption" x-text="productName ?? 'Nexus 61S'"></p>
                </div>
            </div>

            <div class="flex items-center gap-3 flex-wrap">
                {{-- Status pill: the one place the board's state is always true. --}}
                <div class="mx-chip gap-2">
                    <span
                        class="w-3 h-3 border-2 border-solid border-ink status-dot"
                        :class="connected ? (isDemo ? 'bg-peach' : 'bg-live') : 'bg-surface2'"
                    ></span>
                    <span
                        class="font-sans font-700 text-[11px]"
                        x-text="connected ? (isDemo ? 'DEMO' : 'LIVE') : (status === 'connecting' ? 'CONNECTING' : 'OFFLINE')"
                    ></span>
                    <span class="mx-num" x-show="firmware" x-text="`fw ${firmware}`"></span>
                </div>

                <button
                    type="button"
                    class="mx-btn-primary text-xs"
                    x-show="!connected"
                    @click="connect()"
                    :disabled="!supported || status === 'connecting'"
                >Connect board</button>

                <button
                    type="button"
                    class="mx-btn text-xs"
                    x-show="!connected"
                    @click="startDemo()"
                >Try demo</button>

                <button
                    type="button"
                    class="mx-btn text-xs"
                    x-show="connected"
                    @click="disconnect()"
                >Disconnect</button>

                <a href="{{ route('classic') }}" class="mx-btn-ghost text-xs">Classic view</a>
            </div>
        </div>
    </header>

    <main class="flex-1 max-w-[1400px] w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {{-- WebHID gate: Firefox and Safari never see a broken page. --}}
        <template x-if="!supported">
            <section class="mx-panel mx-warn p-4 flex flex-col gap-3">
                <h2 class="mx-h3">This browser cannot talk to the board</h2>
                <p class="mx-body">
                    WebHID is a Chromium feature. Chrome, Edge, and Opera can reach the
                    keyboard directly; Firefox and Safari cannot, by design.
                </p>
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="mx-btn-primary text-xs" @click="startDemo()">
                        Use demo mode instead
                    </button>
                    <a href="https://caniuse.com/webhid" target="_blank" rel="noopener noreferrer" class="mx-btn text-xs">
                        Which browsers support WebHID
                    </a>
                </div>
            </section>
        </template>

        {{-- The gate: everything below is reachable only once a board or demo exists. --}}
        <template x-if="!connected">
            <section class="mx-panel p-6 flex flex-col items-center gap-4 text-center">
                <x-mascot state="idle" :size="96" />
                <div class="max-w-lg flex flex-col gap-2">
                    <h2 class="mx-h2">Let's wake your keyboard</h2>
                    <p class="mx-body">
                        Plug the Nexus 61S in with the USB-C cable, then connect. Your browser
                        will ask which device to share — the board appears as
                        <span class="font-mono text-[11px]">0xFEED:0x5EEA</span>.
                        Nothing is sent to a server; the configurator talks to the hardware
                        from this tab.
                    </p>
                </div>
                <div class="flex flex-wrap gap-2 justify-center">
                    <button
                        type="button"
                        class="mx-btn-primary"
                        @click="connect()"
                        :disabled="!supported || status === 'connecting'"
                    >
                        <span x-text="status === 'connecting' ? 'Connecting…' : 'Connect Nexus 61S'"></span>
                    </button>
                    <button type="button" class="mx-btn" @click="startDemo()">Explore in demo mode</button>
                </div>
                <p class="mx-caption max-w-md" x-show="error">
                    <span x-text="error"></span>
                </p>
            </section>
        </template>

        {{-- The compound dial: board at the hub, six concerns on the ring. --}}
        <template x-if="connected">
            <div class="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
                <section class="flex flex-col gap-4 min-w-0 order-1">
                    {{-- Layer strip, always visible: the layer is the board's own
                         state, not a panel setting. --}}
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                        <div class="flex gap-1" role="tablist" aria-label="Layer">
                            <template x-for="l in layers" :key="l">
                                <button
                                    type="button" class="mx-tab" role="tab"
                                    :aria-selected="layer === l"
                                    @click="layer = l"
                                    x-text="`L${l}`"
                                ></button>
                            </template>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="mx-caption" x-text="`${remappedCount} keys changed on this layer`"></span>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" class="mx-check" x-model="paintMode">
                                <span class="mx-label">Paint</span>
                            </label>
                        </div>
                    </div>

                    {{-- The board. Stays visible behind every panel by design. --}}
                    <div class="mx-panel p-3 sm:p-5">
                        <div class="keyboard-scroll">
                            <x-keyboard />
                        </div>
                    </div>

                    {{-- Live readout under the board. --}}
                    <div class="flex items-center gap-4 flex-wrap mx-inset p-3">
                        <div class="flex items-center gap-2">
                            <span class="mx-label">Depth</span>
                            <div class="w-40 h-4 bg-base border-2 border-solid border-surface2 relative overflow-hidden">
                                <div
                                    class="h-full bg-teal"
                                    :style="`width:${Math.min(100, (liveDepth / 4) * 100)}%`"
                                ></div>
                            </div>
                            <span class="mx-num" x-text="liveSlot !== null ? `${liveDepth.toFixed(2)} mm` : '—'"></span>
                        </div>
                        <span class="mx-caption" x-show="isDemo">
                            Demo mode invents keypresses; connect a real board to see your own.
                        </span>
                    </div>

                </section>

                {{-- The dial. --}}
                <aside class="lg:w-[360px] w-full flex flex-col gap-4 order-2">
                    <div class="dial" :style="`--ring-angle:${ringAngle}deg`">
                        {{-- Spoke from hub to the active seat. --}}
                        <div class="dial-spoke" :style="`--ring-angle:${ringAngle}deg`"></div>

                        {{-- Hub: the currently open concern. --}}
                        <button
                            type="button"
                            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                   w-32 h-32 border-3 border-solid border-ink bg-base
                                   shadow-[4px_4px_0_0_#4c4f69] flex flex-col items-center justify-center gap-1
                                   cursor-pointer hover:bg-well"
                            @click="panelOpen = !panelOpen"
                            :aria-expanded="panelOpen"
                        >
                            <span class="text-2xl" x-text="activeConcern.glyph"></span>
                            <span class="font-pixel text-[10px]" x-text="activeConcern.label"></span>
                            <span class="mx-caption" x-text="panelOpen ? 'hide' : 'show'"></span>
                        </button>

                        {{-- Six seats on the ring. --}}
                        <template x-for="(c, i) in concerns" :key="c.id">
                            <div class="dial-seat" :style="`--seat-base:${seatAngle(i)}`">
                                <button
                                    type="button"
                                    class="border-3 border-solid border-ink flex flex-col items-center justify-center gap-1
                                           shadow-[3px_3px_0_0_#4c4f69] cursor-pointer"
                                    :class="concern === c.id ? 'bg-mauve text-base' : 'bg-base text-ink hover:bg-well'"
                                    :aria-pressed="concern === c.id"
                                    :aria-label="`Open the ${c.label} panel`"
                                    @click="openConcern(c.id)"
                                >
                                    <span class="text-lg" x-text="c.glyph"></span>
                                    <span class="font-pixel text-[8px]" x-text="c.label"></span>
                                </button>
                            </div>
                        </template>

                        {{-- Rotate the ring. --}}
                        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
                            <button
                                type="button" class="mx-btn px-2 py-1 text-xs"
                                @click="rotate(-1)" aria-label="Previous panel"
                            >◀</button>
                            <button
                                type="button" class="mx-btn px-2 py-1 text-xs"
                                @click="rotate(1)" aria-label="Next panel"
                            >▶</button>
                        </div>
                    </div>

                    {{-- Help text, keyed to the open concern. --}}
                    <div class="mx-inset p-3">
                        <p class="mx-caption" x-show="concern === 'keymap'">
                            Click a cap, pick a keycode. Changes reach the board immediately.
                        </p>
                        <p class="mx-caption" x-show="concern === 'light'">
                            23 effects on the keys; the logo light supports a smaller set.
                        </p>
                        <p class="mx-caption" x-show="concern === 'travel'">
                            Per-key actuation and rapid trigger, in millimetres.
                        </p>
                        <p class="mx-caption" x-show="concern === 'macro'">
                            Record a macro by pressing keys, then assign it from the picker.
                        </p>
                        <p class="mx-caption" x-show="concern === 'advanced'">
                            DKS, mod-tap, toggle and SOCD resolution.
                        </p>
                        <p class="mx-caption" x-show="concern === 'settings'">
                            Polling, presets, and the irreversible actions.
                        </p>
                    </div>
                </aside>

                {{-- The panel sheet: opens directly under the board, which is
                         where the eye already is after selecting a key. --}}
                    <template x-if="panelOpen">
                    <section
                            class="mx-panel p-4 lg:p-5 panel-swap lg:col-span-2 order-3"
                        role="region"
                        :aria-label="`${activeConcern.label} panel`"
                    >
                        <div class="flex items-start justify-between gap-3 mb-4">
                            <div class="flex items-center gap-2">
                                <span class="text-xl" x-text="activeConcern.glyph"></span>
                                <span class="font-pixel text-[10px]" x-text="activeConcern.label"></span>
                        </div>
                            <button
                                type="button" class="mx-btn-ghost text-xs"
                                @click="panelOpen = false"
                                aria-label="Close panel"
                            >Close ×</button>
                        </div>

                        <div class="max-w-4xl">
                            <div x-show="concern === 'keymap'">@include('partials.panels.keymap')</div>
                            <div x-show="concern === 'light'">@include('partials.panels.light')</div>
                            <div x-show="concern === 'travel'">@include('partials.panels.travel')</div>
                            <div x-show="concern === 'macro'">@include('partials.panels.macro')</div>
                            <div x-show="concern === 'advanced'">@include('partials.panels.advanced')</div>
                            <div x-show="concern === 'settings'">@include('partials.panels.settings')</div>
                        </div>
                        </section>
                    </template>
            </div>
        </template>
    </main>

    <footer class="border-t-3 border-t-ink bg-base mt-6">
        <div class="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
            <p class="mx-caption">
                Mewxus is an unofficial configurator. Device communication happens entirely in
                your browser over WebHID; no keystroke data leaves this machine.
            </p>
            <p class="mx-caption">Catppuccin Latte · built for the Nexus 61S</p>
        </div>
    </footer>

    {{-- Toasts --}}
    <div
        class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
        role="status"
        aria-live="polite"
    >
        <template x-for="t in toasts" :key="t.id">
            <div
                class="mx-panel p-3 flex items-start gap-3"
                :class="{
                    'mx-tone-live': t.tone === 'live',
                    'mx-tone-danger': t.tone === 'danger',
                    'mx-tone-warn': t.tone === 'warn',
                    'mx-tone-peach': t.tone === 'peach',
                    'mx-tone-pink': t.tone === 'pink',
                }"
            >
                <div class="flex-1">
                    <p class="font-sans font-800 text-xs" x-text="t.title"></p>
                    <p class="mx-caption mt-1" x-text="t.message"></p>
                </div>
                <button
                    type="button" class="mx-btn-ghost text-xs px-1"
                    @click="dismiss(t.id)" aria-label="Dismiss"
                >×</button>
            </div>
        </template>
    </div>
@endsection

@push('dialogs')
    {{-- Reset confirmations. Native <dialog> so focus trapping and Esc come free. --}}
    <template x-teleport="body">
        <div x-data="{ get open() { return confirmReset !== false } }" x-show="open" x-cloak>
            <div class="fixed inset-0 bg-crust/80 z-40" @click="confirmReset = false"></div>
            <div
                class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 mx-panel p-5 max-w-md w-full"
                role="alertdialog"
                aria-modal="true"
            >
                <h2 class="mx-h3 text-danger" x-text="confirmReset === 'factory' ? 'Factory reset the board?' : (confirmReset === 'layer' ? 'Reset this layer?' : 'Soft reset?')"></h2>

                <p class="mx-body mt-2" x-show="confirmReset === 'factory'">
                    Every layer, macro, lighting setting and per-key value on the board is
                    erased and replaced with defaults. This cannot be undone.
                </p>
                <p class="mx-body mt-2" x-show="confirmReset === 'layer'">
                    Every key on layer <strong x-text="layer"></strong> returns to its default.
                    Other layers are untouched.
                </p>
                <p class="mx-body mt-2" x-show="confirmReset === 'soft'">
                    The board restarts and its configuration is re-read. Nothing is erased.
                </p>

                <div class="flex gap-2 mt-4">
                    <button
                        type="button"
                        class="mx-btn text-xs"
                        @click="confirmReset = false"
                    >Cancel</button>
                    <button
                        type="button"
                        class="mx-btn-danger text-xs"
                        @click="doReset(confirmReset)"
                    >Yes, reset</button>
                </div>
            </div>
        </div>
    </template>

    {{-- Flash confirmation: requires the typed phrase, not just a click. --}}
    <template x-teleport="body">
        <div x-show="confirmFlash" @keydown.escape.window="confirmFlash = false">
            <div class="fixed inset-0 bg-crust/80 z-40" @click="confirmFlash = false"></div>
            <div
                class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 mx-panel mx-danger p-5 max-w-lg w-full"
                role="alertdialog"
                aria-modal="true"
            >
                <h2 class="mx-h3 text-danger">Flash firmware</h2>

                <div class="flex flex-col gap-3 mt-3">
                    <p class="mx-body">
                        The board will be put into bootloader mode and its system image
                        replaced. If this is interrupted the board will not boot.
                    </p>
                    <ol class="mx-body list-decimal pl-5 flex flex-col gap-1">
                        <li>Keep the USB cable connected the whole time.</li>
                        <li>Do not close this tab or let the machine sleep.</li>
                        <li>Do not touch the keyboard while the progress bar moves.</li>
                    </ol>
                    <p class="mx-body">
                        The image is downloaded from the manufacturer and its SHA-256 is
                        verified before anything is written.
                    </p>

                    <label class="flex flex-col gap-1">
                        <span class="mx-label">
                            Type <span class="font-mono text-danger">flash nexus 61s</span> to confirm
                        </span>
                        <input type="text" class="mx-field font-mono" x-model="flashPhrase" placeholder="flash nexus 61s">
                    </label>

                    <div class="flex gap-2 mt-1">
                        <button type="button" class="mx-btn text-xs" @click="confirmFlash = false; flashPhrase = ''">
                            Cancel
                        </button>
                        <button
                            type="button"
                            class="mx-btn-danger text-xs"
                            :disabled="flashPhrase !== 'flash nexus 61s'"
                            @click="doFlash()"
                        >Flash now</button>
                    </div>
                </div>
            </div>
        </div>
    </template>
@endpush
