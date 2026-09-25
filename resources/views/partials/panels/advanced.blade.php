{{--
    Advanced key modes: DKS, mod-tap, toggle, SOCD, OKS.
    These are configured per-slot, and the slot must already carry the matching
    key type before the mode data has anywhere to live — so the panel says so
    rather than silently writing orphaned data.
--}}
<div class="flex flex-col gap-4">
    <header>
        <h2 class="mx-h2">Advanced modes</h2>
        <p class="mx-caption mt-1">
            Per-key behaviours beyond a single keycode. Assign the mode from the picker first.
        </p>
    </header>

    <div class="flex gap-1 flex-wrap" role="tablist" aria-label="Advanced mode">
        <template x-for="mode in advancedModes" :key="mode.id">
            <button
                type="button"
                class="mx-tab"
                role="tab"
                :aria-selected="advancedMode === mode.id"
                @click="advancedMode = mode.id"
                x-text="mode.label"
            ></button>
        </template>
    </div>

    <section class="mx-inset p-3">
        <template x-for="mode in advancedModes.filter(m => m.id === advancedMode)" :key="mode.id">
            <p class="mx-body" x-text="mode.blurb"></p>
        </template>
    </section>

    {{-- DKS: up to four actions on one key, each firing at a travel point. --}}
    <template x-if="advancedMode === 'dks'">
        <section class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
                <h3 class="mx-h3">DKS actions</h3>
                <span class="mx-chip" x-text="`${dks.length} slots`"></span>
            </div>

            <template x-for="(entry, i) in dks.slice(0, 8)" :key="i">
                <div class="mx-chip flex-col items-stretch gap-2 p-2">
                    <div class="flex items-center justify-between">
                        <span class="mx-label" x-text="`DKS ${i}`"></span>
                        <span class="mx-num">
                            <span x-text="entry.actions.map(a => a.code1 !== undefined ? '·' : '').join('')"></span>
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <template x-for="(point, p) in entry.status" :key="p">
                            <div class="flex flex-col gap-1">
                                <span class="mx-caption" x-text="`action ${p}`"></span>
                                <div class="flex gap-1">
                                    <input
                                        type="number" min="0" max="3"
                                        class="w-12 px-1 font-mono text-[11px] bg-base border-2 border-solid border-surface2"
                                        :value="point.downStart"
                                        @change="setDks(i, 'status', entry.status.map((s, j) => j === p ? {...s, downStart: Number($event.target.value)} : s))"
                                        aria-label="Trigger point"
                                    >
                                    <span class="mx-caption self-center">of 3</span>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </template>
        </section>
    </template>

    {{-- Mod-tap: one action on hold, another on tap. --}}
    <template x-if="advancedMode === 'mt'">
        <section class="flex flex-col gap-3">
            <h3 class="mx-h3">Mod-tap &amp; SOCD</h3>
            <p class="mx-caption">
                Each entry pairs a tap action with a hold action. Select a key on the board
                and assign MT or SOCD to it, then edit the pair here.
            </p>
            <div class="mx-table-wrap overflow-x-auto">
                <table class="mx-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>tap / click</th>
                            <th>hold / down</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template x-for="(pair, i) in mt.slice(0, 16)" :key="i">
                            <tr>
                                <td x-text="i"></td>
                                <td x-text="labelFor(pair.clickKey)"></td>
                                <td x-text="labelFor(pair.downKey)"></td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </section>
    </template>

    {{-- Toggle: a key that latches. --}}
    <template x-if="advancedMode === 'tgl'">
        <section class="flex flex-col gap-3">
            <h3 class="mx-h3">Toggle keys</h3>
            <p class="mx-caption">
                A toggled key stays down until pressed again — useful for sprint or crouch.
            </p>
            <div class="mx-table-wrap overflow-x-auto">
                <table class="mx-table">
                    <thead>
                        <tr><th>#</th><th>latches</th></tr>
                    </thead>
                    <tbody>
                        <template x-for="(entry, i) in tgl.slice(0, 16)" :key="i">
                            <tr>
                                <td x-text="i"></td>
                                <td x-text="labelFor(entry)"></td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </section>
    </template>

    {{-- SOCD/OKS: paired-key resolution, explained rather than configured here. --}}
    <template x-if="advancedMode === 'socd'">
        <section class="flex flex-col gap-3">
            <h3 class="mx-h3">SOCD resolution</h3>
            <p class="mx-body">
                When two opposite keys are held, SOCD decides which one the board reports.
                This board configures it through the mod-tap table: assign SOCD to the first
                key of the pair and OKS to the second, then set the pair's two actions above.
            </p>
            <p class="mx-caption">
                Common choice for movement keys: <strong>last input wins</strong> (neutral
                cancel feels wrong under a counter-strafe).
            </p>
        </section>
    </template>

    <button
        type="button"
        class="mx-btn-primary text-xs self-start"
        @click="commitAdvanced()"
        :disabled="!connected"
    >Write advanced modes</button>

    <p class="mx-caption" x-show="!connected">Connect a board to write these settings.</p>
</div>
