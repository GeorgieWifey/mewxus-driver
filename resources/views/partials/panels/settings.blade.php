{{-- Settings: the config block, presets, and the danger zone. --}}
<div class="flex flex-col gap-5">
    <header>
        <h2 class="mx-h2">Setup</h2>
        <p class="mx-caption mt-1">Board behaviour, the preset library, and the irreversible bits.</p>
    </header>

    <section class="flex flex-col gap-3">
        <h3 class="mx-h3">Polling &amp; debounce</h3>

        <label class="flex flex-col gap-1">
            <span class="mx-label">Report rate</span>
            <select
                class="mx-field"
                x-model.number="config.reportRate"
                @change="patchConfig({ reportRate: config.reportRate })"
            >
                <template x-for="r in reportRates" :key="r.value">
                    <option :value="r.value" x-text="r.label"></option>
                </template>
            </select>
        </label>

        <label class="flex flex-col gap-1">
            <span class="mx-label">Debounce</span>
            <select
                class="mx-field"
                x-model.number="config.debounce"
                @change="patchConfig({ debounce: config.debounce })"
            >
                <template x-for="d in debounceOptions" :key="d.value">
                    <option :value="d.value" x-text="d.label"></option>
                </template>
            </select>
        </label>
    </section>

    <section class="flex flex-col gap-3 border-t-2 border-solid border-surface1 pt-3">
        <h3 class="mx-h3">System</h3>

        <div class="flex flex-wrap gap-1" role="radiogroup" aria-label="System mode">
            <button
                type="button" class="mx-tab" role="radio"
                :aria-checked="config.macMode === 0"
                @click="patchConfig({ macMode: 0 })"
            >Windows</button>
            <button
                type="button" class="mx-tab" role="radio"
                :aria-checked="config.macMode === 1"
                @click="patchConfig({ macMode: 1 })"
            >macOS</button>
        </div>

        <label class="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox" class="mx-check"
                :checked="config.lockWin === 1"
                @change="patchConfig({ lockWin: $event.target.checked ? 1 : 0 })"
            >
            <span class="mx-label">Lock the Windows key</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox" class="mx-check"
                :checked="config.lockAltF4 === 1"
                @change="patchConfig({ lockAltF4: $event.target.checked ? 1 : 0 })"
            >
            <span class="mx-label">Lock Alt+F4</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox" class="mx-check"
                :checked="config.tachyon === 1"
                @change="patchConfig({ tachyon: $event.target.checked ? 1 : 0 })"
            >
            <span class="mx-label">Tachyon mode</span>
        </label>

        <p class="mx-caption">
            Tachyon raises the sampling floor so very light taps are not missed, at some
            power cost. Leave it off unless the board drops fast inputs.
        </p>
    </section>

    {{-- Presets: saved to Laravel over htmx/JSON, shared by link. --}}
    <section class="flex flex-col gap-3 border-t-2 border-solid border-surface1 pt-3">
        <h3 class="mx-h3">Presets</h3>

        <label class="flex flex-col gap-1">
            <span class="mx-label">Name this configuration</span>
            <input type="text" class="mx-field" maxlength="80" placeholder="e.g. Silent office" x-model="presetName">
        </label>

        <label class="flex flex-col gap-1">
            <span class="mx-label">Note (optional)</span>
            <input type="text" class="mx-field" maxlength="280" placeholder="What this preset is for" x-model="presetDescription">
        </label>

        <div class="flex flex-wrap gap-2">
            <button type="button" class="mx-btn-primary text-xs" @click="savePreset()">
                Save to library
            </button>
            <button type="button" class="mx-btn text-xs" @click="exportPreset()">
                Export file
            </button>
        </div>

        <div
            id="preset-library"
            hx-get="{{ route('presets.index') }}"
            hx-trigger="load, refresh from:body"
            hx-swap="innerHTML"
        >
            <p class="mx-caption">Loading the library…</p>
        </div>
    </section>

    {{-- Firmware: the one thing that can brick the board. --}}
    <section class="flex flex-col gap-3 border-t-3 border-solid border-danger pt-3">
        <h3 class="mx-h3 text-danger">Firmware</h3>

        <dl class="grid grid-cols-2 gap-2">
            <div class="mx-chip flex-col items-start">
                <dt class="mx-label">On the board</dt>
                <dd class="mx-num" x-text="firmware ?? '—'"></dd>
            </div>
            <div class="mx-chip flex-col items-start">
                <dt class="mx-label">Available</dt>
                <dd class="mx-num" x-text="firmwareMeta?.available ? `${formatBytes(firmwareMeta.bytes)}` : 'unknown'"></dd>
            </div>
        </dl>

        <button type="button" class="mx-btn text-xs self-start" @click="checkFirmware()">
            Check for firmware
        </button>

        <div class="mx-inset mx-danger p-3 flex flex-col gap-2">
            <p class="font-sans font-800 text-xs text-danger">Flashing can brick this board</p>
            <p class="mx-body">
                Writing firmware replaces the whole system image. If power is lost or the
                cable is pulled mid-flash, the board will not boot and needs a hardware
                recovery. Keep it plugged in, and do not close this tab.
            </p>
            <label class="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" class="mx-check" x-model="brickAck">
                <span class="mx-label">I understand the risk</span>
            </label>
            <button
                type="button"
                class="mx-btn-danger text-xs self-start"
                :disabled="!brickAck || !connected"
                @click="confirmFlash = true"
            >Flash firmware…</button>
        </div>
    </section>

    {{-- Danger zone --}}
    <section class="flex flex-col gap-3 border-t-2 border-solid border-surface1 pt-3">
        <h3 class="mx-h3">Reset</h3>
        <div class="flex flex-wrap gap-2">
            <button type="button" class="mx-btn text-xs" @click="confirmReset = 'soft'">
                Soft reset board
            </button>
            <button type="button" class="mx-btn-danger text-xs" @click="confirmReset = 'factory'">
                Factory reset…
            </button>
        </div>
        <p class="mx-caption">
            A soft reset re-reads the configuration. A factory reset erases every layer,
            macro, and lighting setting on the board and cannot be undone.
        </p>
    </section>
</div>
