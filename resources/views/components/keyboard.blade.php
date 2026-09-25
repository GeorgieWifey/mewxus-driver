{{--
    The keyboard render.
    Keys are placed from the layout data's own x/y/w/h units, so the on-screen
    board is the physical board rather than a redrawn approximation. Every key is
    a real button: clickable, focusable, and operable from the keyboard.
--}}
<div
    class="keyboard mx-auto"
    role="group"
    :aria-label="`Keyboard layout, layer ${layer}`"
>
    <template x-for="cap in caps" :key="cap.slot">
        <button
            type="button"
            class="keycap"
            :style="keyStyle(cap.slot)"
            :data-selected="selectedSlot === cap.slot"
            :data-remapped="isRemapped(cap.slot)"
            :data-pressed="pressedSlots.has(cap.slot)"
            :data-live="liveSlot === cap.slot"
            :aria-label="`${cap.name}, ${keyLabel(cap.slot) || 'unassigned'}`"
            @click="selectSlot(cap.slot)"
            @keydown.enter.prevent="selectSlot(cap.slot)"
        >
            <span class="keycap-label" x-text="keyLabel(cap.slot) || cap.name"></span>
            <span class="keycap-sub" x-show="subLabel(cap.slot)" x-text="subLabel(cap.slot)"></span>
            {{-- Paint mode shows the key's programmed colour as a ground. --}}
            <span
                class="absolute inset-0 pointer-events-none"
                x-show="paintMode"
                :style="`background:${keyColor(cap.slot)};opacity:.55`"
            ></span>
        </button>
    </template>
</div>
