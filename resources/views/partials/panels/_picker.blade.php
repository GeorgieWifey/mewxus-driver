{{--
    Keycode picker.
    Rendered as a flat list rather than a virtualised one: the largest group is
    113 entries, which is cheaper to render than to virtualise, and it keeps the
    whole thing keyboard-navigable without a roving-focus implementation.
--}}
<div class="flex flex-col gap-3">
    <div class="flex flex-wrap gap-1" role="tablist" aria-label="Keycode groups">
        <template x-for="g in pickerGroups" :key="g">
            <button
                type="button"
                class="mx-tab"
                role="tab"
                :aria-selected="pickerGroup === g"
                @click="pickerGroup = g"
                x-text="groupLabels[g]"
            ></button>
        </template>
    </div>

    <input
        type="search"
        class="mx-field"
        placeholder="Search keys…"
        x-model="pickerQuery"
        aria-label="Search keycodes"
    >

    {{--
        Explicit height cap, not flex-1: the ancestor chain has no fixed height,
        so a flexible child grows to its 113-row content and drags the page with it.
    --}}
    <div class="overflow-y-auto h-72 shrink-0 border-3 border-solid border-surface1 bg-mantle p-2">
        <template x-for="item in pickerItems" :key="`${item.group}-${item.type}-${item.code1}-${item.code2}`">
            <button
                type="button"
                class="w-full text-left px-2 py-1 font-sans text-xs border-2 border-transparent hover:border-mauve hover:bg-surface0 flex items-center justify-between gap-2"
                @click="assign(item)"
            >
                <span x-text="item.label" class="truncate"></span>
                <span
                    class="mx-chip shrink-0"
                    x-text="`0x${item.type.toString(16)}`"
                ></span>
            </button>
        </template>

        <p class="mx-caption p-2" x-show="pickerItems.length === 0">
            Nothing matches that search.
        </p>
    </div>

    <div class="flex items-center gap-2">
        <span class="mx-label">Modifiers</span>
        <span class="mx-caption">Held modifiers are encoded in the keycode itself, not as separate keys.</span>
    </div>

    <div class="flex flex-wrap gap-1">
        <template x-for="mod in ['CTRL', 'SHIFT', 'ALT', 'WIN']" :key="mod">
            <label class="mx-chip cursor-pointer gap-2">
                <input type="checkbox" class="mx-check" :value="mod" x-model="pendingModifiers">
                <span x-text="mod"></span>
            </label>
        </template>
        <button type="button" class="mx-btn-ghost text-[11px]" @click="pendingModifiers = []">
            clear
        </button>
    </div>

    <p class="mx-caption">
        With modifiers selected, pick a base key and the board stores
        <span class="font-mono" x-text="modifierPreview"></span>.
    </p>
</div>
