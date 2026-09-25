{{-- Macro editor: 16 slots, each a list of key actions with delays. --}}
<div class="flex flex-col gap-4">
    <header>
        <h2 class="mx-h2">Macros</h2>
        <p class="mx-caption mt-1">16 slots, 2048 bytes each. Assign with type 0x70.</p>
    </header>

    <div class="grid grid-cols-4 gap-1" role="tablist" aria-label="Macro slots">
        <template x-for="i in 16" :key="i">
            <button
                type="button"
                class="mx-tab text-center"
                role="tab"
                :aria-selected="macroIndex === i - 1"
                @click="macroIndex = i - 1"
                x-text="`M${i}`"
            ></button>
        </template>
    </div>

    <section class="mx-inset p-3 flex flex-col gap-3">
        <div class="flex items-center justify-between">
            <p class="font-sans font-800 text-sm" x-text="`Macro M${macroIndex + 1}`"></p>
            <span class="mx-chip" x-text="`${currentMacro.actions.length} actions`"></span>
        </div>

        <template x-if="currentMacro.actions.length === 0">
            <p class="mx-body">
                Empty. Add a key action below, then assign this macro to a key from the
                Advanced group in the keycode picker.
            </p>
        </template>

        <ol class="flex flex-col gap-1">
            <template x-for="(action, i) in currentMacro.actions" :key="i">
                <li class="flex items-center gap-2 mx-chip justify-between">
                    <span class="flex items-center gap-2">
                        <span class="mx-num" x-text="i + 1"></span>
                        <span class="font-sans font-700" x-text="action.label"></span>
                        <span
                            class="text-[10px]"
                            :class="action.down ? 'text-live' : 'text-peach'"
                            x-text="action.down ? 'down' : 'up'"
                        ></span>
                    </span>
                    <span class="flex items-center gap-2">
                        <label class="flex items-center gap-1">
                            <span class="mx-label">delay</span>
                            <input
                                type="number" min="0" max="9999"
                                class="w-16 px-1 py-0.5 font-mono text-[11px] bg-base border-2 border-solid border-surface2"
                                :value="action.delay"
                                @change="setActionDelay(i, $event.target.value)"
                            >
                            <span class="mx-caption">ms</span>
                        </label>
                        <button
                            type="button"
                            class="mx-btn-ghost text-[11px] px-1"
                            @click="removeAction(i)"
                            :aria-label="`Remove action ${i + 1}`"
                        >×</button>
                    </span>
                </li>
            </template>
        </ol>

        <div class="flex flex-wrap gap-2 border-t-2 border-solid border-surface1 pt-3">
            <button type="button" class="mx-btn text-xs" @click="recordAction()">
                + Key press
            </button>
            <button
                type="button"
                class="mx-btn text-xs"
                @click="addAction('', 50, false)"
            >+ Pause</button>
            <button
                type="button"
                class="mx-btn-ghost text-xs"
                @click="clearMacro()"
                x-show="currentMacro.actions.length > 0"
            >Clear</button>
        </div>
    </section>

    {{-- Recording: the board relays real presses over the event feed, so a
         macro can capture what you actually type rather than what you pick. --}}
    <section class="mx-inset mx-pink p-3 flex flex-col gap-2">
        <div class="flex items-center justify-between">
            <h3 class="mx-h3">Record from the board</h3>
            <button
                type="button"
                class="mx-btn text-xs"
                :class="recording ? 'mx-btn-danger' : ''"
                @click="toggleRecording()"
                :disabled="!connected"
                x-text="recording ? 'Stop' : 'Record'"
            ></button>
        </div>
        <p class="mx-caption">
            Captures the keys you press while recording. Works on a real board; demo mode has no key input.
        </p>
        <p class="mx-caption text-pink" x-show="recording">
            Recording — press keys now.
        </p>
    </section>

    <button type="button" class="mx-btn-primary text-xs self-start" @click="commitMacros()">
        Write macros to board
    </button>
</div>
