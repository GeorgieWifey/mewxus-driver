{{--
    Rapid Trigger / actuation.
    The board stores travel in tenths of a millimetre; the UI divides by 10 and
    shows mm, because nobody thinks in device units.
--}}
<div class="flex flex-col gap-4">
    <header>
        <h2 class="mx-h2">Rapid Trigger</h2>
        <p class="mx-caption mt-1">
            Per-key actuation and release points. Applied in one block write when you let go of a slider.
        </p>
    </header>

    <section class="mx-inset p-3 flex flex-col gap-1">
        <p class="mx-label">Editing</p>
        <p class="font-sans font-800 text-sm">
            <span x-text="selectedSlot !== null ? (capFor(selectedSlot)?.name ?? '—') : 'no key selected'"></span>
        </p>
        <p class="mx-caption">
            Select a cap on the board to edit it. Changes land on the board as you drag.
        </p>
    </section>

    <template x-if="selectedSlot !== null">
        <section class="flex flex-col gap-4">
            <label class="flex flex-col gap-1">
                <span class="mx-label">
                    Actuation point
                    <span class="mx-num" x-text="`${(travelFor(selectedSlot).actuation / 10).toFixed(1)} mm`"></span>
                </span>
                <input
                    type="range" class="mx-range" min="1" max="40"
                    :value="travelFor(selectedSlot).actuation"
                    @input="setTravel(selectedSlot, 'actuation', $event.target.value)"
                >
            </label>

            <label class="flex flex-col gap-1">
                <span class="mx-label">
                    Rapid trigger — press
                    <span class="mx-num" x-text="`${(travelFor(selectedSlot).rtPress / 10).toFixed(1)} mm`"></span>
                </span>
                <input
                    type="range" class="mx-range" min="1" max="20"
                    :value="travelFor(selectedSlot).rtPress"
                    @input="setTravel(selectedSlot, 'rtPress', $event.target.value)"
                >
            </label>

            <label class="flex flex-col gap-1">
                <span class="mx-label">
                    Rapid trigger — release
                    <span class="mx-num" x-text="`${(travelFor(selectedSlot).rtRelease / 10).toFixed(1)} mm`"></span>
                </span>
                <input
                    type="range" class="mx-range" min="1" max="20"
                    :value="travelFor(selectedSlot).rtRelease"
                    @input="setTravel(selectedSlot, 'rtRelease', $event.target.value)"
                >
            </label>
        </section>
    </template>

    {{-- Depth meter: the live 0xA0 feed, drawn as a bar. --}}
    <section class="mx-inset p-3">
        <p class="mx-label">Live depth</p>
        <div class="mt-2 h-6 bg-base border-2 border-solid border-surface2 relative overflow-hidden">
            <div
                class="h-full bg-teal transition-[width] duration-75"
                :style="`width:${Math.min(100, (liveDepth / 4) * 100)}%`"
            ></div>
            <span
                class="absolute inset-0 flex items-center justify-center mx-num"
                x-text="liveSlot !== null ? `${liveDepth.toFixed(2)} mm` : '—'"
            ></span>
        </div>
        <p class="mx-caption mt-2" x-show="liveSlot === null">
            Press a key on the board to see its travel.
        </p>
    </section>

    <section class="border-t-2 border-solid border-surface1 pt-3 flex flex-col gap-2">
        <h3 class="mx-h3">Whole board</h3>
        <div class="flex flex-wrap gap-2">
            <button type="button" class="mx-btn text-xs" @click="applyTravelPreset('fast')">
                Fast (0.5 mm)
            </button>
            <button type="button" class="mx-btn text-xs" @click="applyTravelPreset('mid')">
                Balanced (2.0 mm)
            </button>
            <button type="button" class="mx-btn text-xs" @click="applyTravelPreset('deep')">
                Deep (3.0 mm)
            </button>
        </div>
        <p class="mx-caption">
            Applies to every key in the current profile, then writes the whole block.
        </p>
    </section>
</div>
