{{-- Lighting: keyboard RGB, per-key paint, and the logo light. --}}
<div class="flex flex-col gap-4">
    <header>
        <h2 class="mx-h2">Lighting</h2>
        <p class="mx-caption mt-1">23 effects on the keys, a smaller set on the logo.</p>
    </header>

    <section class="flex flex-col gap-3">
        <h3 class="mx-h3">Keys</h3>

        {{-- Effect grid: a picker, not a dropdown, so you can see all 23. --}}
        <div class="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto p-1 border-2 border-solid border-surface1 bg-mantle">
            <template x-for="fx in effects" :key="fx.value">
                <button
                    type="button"
                    class="text-left px-2 py-1 font-sans text-[11px] border-2 border-solid"
                    :class="config.lightEffect === fx.value
                        ? 'bg-mauve text-base border-mauve'
                        : 'bg-base border-surface1 hover:border-mauve'"
                    @click="patchConfig({ lightEffect: fx.value })"
                    :aria-pressed="config.lightEffect === fx.value"
                >
                    <span x-text="fx.name"></span>
                    <span class="block text-[9px] opacity-70" x-text="`#${fx.value}`"></span>
                </button>
            </template>
        </div>

        <label class="flex flex-col gap-1">
            <span class="mx-label">
                Brightness <span class="mx-num" x-text="config.lightBrightness"></span>
            </span>
            <input
                type="range" class="mx-range" min="0" max="100"
                x-model.number="config.lightBrightness"
                @change="patchConfig({ lightBrightness: config.lightBrightness })"
                :disabled="!currentEffect.brightness"
            >
        </label>

        <label class="flex flex-col gap-1">
            <span class="mx-label">
                Speed <span class="mx-num" x-text="config.lightSpeed"></span>
            </span>
            <input
                type="range" class="mx-range" min="0" max="4"
                x-model.number="config.lightSpeed"
                @change="patchConfig({ lightSpeed: config.lightSpeed })"
                :disabled="!currentEffect.speed"
            >
        </label>

        <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox" class="mx-check"
                    x-model="config.lightSingleColor"
                    @change="patchConfig({ lightSingleColor: config.lightSingleColor })"
                >
                <span class="mx-label">Single colour</span>
            </label>
            <input
                type="color" class="mx-color"
                x-model="config.lightColor"
                @change="patchConfig({ lightColor: config.lightColor })"
                aria-label="Keyboard base colour"
            >
        </div>

        <p class="mx-caption" x-show="!currentEffect.color">
            This effect ignores colour; the board animates its own palette.
        </p>
    </section>

    <section class="flex flex-col gap-3 border-t-2 border-solid border-surface1 pt-3">
        <h3 class="mx-h3">Logo light</h3>
        <div class="flex flex-wrap gap-1">
            <template x-for="fx in logoEffects" :key="fx.value">
                <button
                    type="button"
                    class="mx-tab"
                    :aria-selected="config.logoEffect === fx.value"
                    @click="patchConfig({ logoEffect: fx.value })"
                    x-text="fx.name"
                ></button>
            </template>
        </div>
        <div class="flex flex-wrap items-center gap-3">
            <label class="flex flex-col gap-1 flex-1 min-w-40">
                <span class="mx-label">
                    Brightness <span class="mx-num" x-text="config.logoBrightness"></span>
                </span>
                <input
                    type="range" class="mx-range" min="0" max="100"
                    x-model.number="config.logoBrightness"
                    @change="patchConfig({ logoBrightness: config.logoBrightness })"
                >
            </label>
            <input
                type="color" class="mx-color"
                x-model="config.logoColor"
                @change="patchConfig({ logoColor: config.logoColor })"
                aria-label="Logo light colour"
            >
        </div>
    </section>

    <section class="flex flex-col gap-3 border-t-2 border-solid border-surface1 pt-3">
        <div class="flex items-center justify-between">
            <h3 class="mx-h3">Per-key paint</h3>
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" class="mx-check" x-model="paintMode">
                <span class="mx-label">Paint mode</span>
            </label>
        </div>
        <p class="mx-caption" x-show="paintMode">
            Click or drag across the board to paint each key.
        </p>
        <div class="flex flex-wrap gap-1" x-show="paintMode">
            <template x-for="c in paintSwatches" :key="c">
                <button
                    type="button"
                    class="w-7 h-7 border-3 border-solid"
                    :style="`background:${c}`"
                    :class="paintColor === c ? 'border-ink shadow-[2px_2px_0_0_#4c4f69]' : 'border-surface2'"
                    @click="paintColor = c"
                    :aria-label="`Paint colour ${c}`"
                ></button>
            </template>
            <input type="color" class="mx-color" x-model="paintColor" aria-label="Custom paint colour">
        </div>
        <button
            type="button"
            class="mx-btn text-xs self-start"
            x-show="paintMode"
            @click="fillAllKeys(paintColor)"
        >Fill entire board</button>
    </section>
</div>
