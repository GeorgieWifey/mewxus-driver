{{-- Keymap panel: layers, the selected key, and the picker. --}}
<div class="flex flex-col gap-4 min-h-0">
    <header class="flex items-start justify-between gap-3">
        <div>
            <h2 class="mx-h2">Keymap</h2>
            <p class="mx-caption mt-1">
                61 keys × 4 layers. Click a cap on the board, then pick what it sends.
            </p>
        </div>
        <span class="mx-chip" x-text="`${remappedCount} changed`"></span>
    </header>

    {{-- Layer tabs: the four sheets of the keymap. --}}
    <div class="flex gap-1" role="tablist" aria-label="Keymap layers">
        <template x-for="l in layers" :key="l">
            <button
                type="button"
                class="mx-tab flex-1"
                role="tab"
                :aria-selected="layer === l"
                @click="layer = l"
            >
                <span x-text="`L${l}`"></span>
                <span class="block text-[9px] opacity-70" x-text="l === 0 ? 'base' : (l === 1 ? 'fn' : '—')"></span>
            </button>
        </template>
    </div>

    {{-- Selected key, or an instruction to pick one. --}}
    <section class="mx-inset p-3" aria-live="polite">
        <template x-if="selectedSlot === null">
            <p class="mx-body">
                No key selected. Click any cap on the board to inspect and edit it —
                the board stays live, so pressing a physical key flashes its cap here.
            </p>
        </template>

        <template x-if="selectedSlot !== null">
            <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <p class="mx-label">Selected</p>
                        <p class="font-pixel text-xs mt-1" x-text="capFor(selectedSlot)?.name ?? '—'"></p>
                    </div>
                    <div class="text-right">
                        <p class="mx-label">Sends</p>
                        <p class="font-sans font-800 text-sm mt-1" x-text="selectedName"></p>
                    </div>
                </div>

                <dl class="grid grid-cols-3 gap-2 text-center">
                    <div class="mx-chip flex-col items-start">
                        <dt class="mx-label">type</dt>
                        <dd class="mx-num" x-text="`0x${(selectedKey?.type ?? 0).toString(16).padStart(2, '0')}`"></dd>
                    </div>
                    <div class="mx-chip flex-col items-start">
                        <dt class="mx-label">code1</dt>
                        <dd class="mx-num" x-text="selectedKey?.code1 ?? 0"></dd>
                    </div>
                    <div class="mx-chip flex-col items-start">
                        <dt class="mx-label">code2</dt>
                        <dd class="mx-num" x-text="selectedKey?.code2 ?? 0"></dd>
                    </div>
                </dl>

                <div class="flex flex-wrap gap-2">
                    <button type="button" class="mx-btn text-xs" @click="clearSlot()">Clear key</button>
                    <button
                        type="button"
                        class="mx-btn text-xs"
                        @click="assign(defaultKeyFor(selectedSlot))"
                    >Restore default</button>
                    <button
                        type="button"
                        class="mx-btn-ghost text-xs"
                        @click="selectedSlot = null"
                    >Deselect</button>
                </div>
            </div>
        </template>
    </section>

    @include('partials.panels._picker')

    <div class="flex items-center justify-between gap-2 pt-1 border-t-2 border-solid border-surface1">
        <span class="mx-caption" x-text="`Editing layer ${layer}`"></span>
        <button
            type="button"
            class="mx-btn-danger text-xs"
            @click="confirmReset = 'layer'"
        >Reset layer…</button>
    </div>
</div>
