@extends('layouts.app')

@section('title', 'Mewxus — classic view')

{{--
    The conventional arrangement: keyboard on the left, tabbed control column on
    the right. This is the same application, same state, same components — only
    the shell differs. It exists because the rolled composition is a strong
    opinion, and a strong opinion should always ship with a way around it.
--}}
@section('body')
    <header class="border-b-3 border-b-ink bg-base">
        <div class="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3">
                <x-mascot
                    state="idle"
                    :size="40"
                    x-bind:data-state="!connected ? 'idle' : (liveSlot !== null ? 'live' : 'working')"
                />
                <div>
                    <h1 class="mx-h2">MEWXUS</h1>
                    <p class="mx-caption">Classic view</p>
                </div>
            </div>

            <div class="flex items-center gap-3 flex-wrap">
                <div class="mx-chip gap-2">
                    <span
                        class="w-3 h-3 border-2 border-solid border-ink status-dot"
                        :class="connected ? (isDemo ? 'bg-peach' : 'bg-live') : 'bg-surface2'"
                    ></span>
                    <span
                        class="font-sans font-700 text-[11px]"
                        x-text="connected ? (isDemo ? 'DEMO' : 'LIVE') : 'OFFLINE'"
                    ></span>
                </div>
                <button type="button" class="mx-btn-primary text-xs" x-show="!connected" @click="connect()" :disabled="!supported">
                    Connect
                </button>
                <button type="button" class="mx-btn text-xs" x-show="!connected" @click="startDemo()">Demo</button>
                <button type="button" class="mx-btn text-xs" x-show="connected" @click="disconnect()">Disconnect</button>
                <a href="{{ route('configurator') }}" class="mx-btn-ghost text-xs">Dial view</a>
            </div>
        </div>
    </header>

    <main class="flex-1 max-w-[1400px] w-full mx-auto px-4 py-6">
        <template x-if="!connected">
            <section class="mx-panel p-6 flex flex-col items-center gap-4 text-center">
                <x-mascot state="idle" :size="80" />
                <h2 class="mx-h2">No board connected</h2>
                <p class="mx-body max-w-lg">
                    Plug in the Nexus 61S and connect, or explore every panel in demo mode
                    with no hardware at all.
                </p>
                <div class="flex gap-2">
                    <button type="button" class="mx-btn-primary" @click="connect()" :disabled="!supported">
                        Connect board
                    </button>
                    <button type="button" class="mx-btn" @click="startDemo()">Demo mode</button>
                </div>
                <p class="mx-caption" x-show="!supported">
                    This browser has no WebHID; demo mode is the only option here.
                </p>
            </section>
        </template>

        <template x-if="connected">
            <div class="grid lg:grid-cols-[1fr_480px] gap-6 items-start">
                <section class="flex flex-col gap-4 min-w-0">
                    <div class="flex items-center gap-3 flex-wrap">
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
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" class="mx-check" x-model="paintMode">
                            <span class="mx-label">Paint</span>
                        </label>
                    </div>

                    <div class="mx-panel p-4">
                        <div class="keyboard-scroll">
                            <x-keyboard />
                        </div>
                    </div>

                    <div class="mx-inset p-3 flex items-center gap-4 flex-wrap">
                        <span class="mx-label">Depth</span>
                        <div class="w-40 h-4 bg-base border-2 border-solid border-surface2 relative overflow-hidden">
                            <div class="h-full bg-teal" :style="`width:${Math.min(100, (liveDepth / 4) * 100)}%`"></div>
                        </div>
                        <span class="mx-num" x-text="liveSlot !== null ? `${liveDepth.toFixed(2)} mm` : '—'"></span>
                    </div>
                </section>

                <aside class="mx-panel p-4 flex flex-col gap-4 lg:max-h-[85vh] lg:overflow-y-auto">
                    <div class="flex flex-wrap gap-1" role="tablist" aria-label="Sections">
                        <template x-for="c in concerns" :key="c.id">
                            <button
                                type="button" class="mx-tab"
                                role="tab"
                                :aria-selected="concern === c.id"
                                @click="concern = c.id"
                                x-text="c.label"
                            ></button>
                        </template>
                    </div>

                    <div x-show="concern === 'keymap'">@include('partials.panels.keymap')</div>
                    <div x-show="concern === 'light'">@include('partials.panels.light')</div>
                    <div x-show="concern === 'travel'">@include('partials.panels.travel')</div>
                    <div x-show="concern === 'macro'">@include('partials.panels.macro')</div>
                    <div x-show="concern === 'advanced'">@include('partials.panels.advanced')</div>
                    <div x-show="concern === 'settings'">@include('partials.panels.settings')</div>
                </aside>
            </div>
        </template>
    </main>

    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
        <template x-for="t in toasts" :key="t.id">
            <div class="mx-panel p-3 flex items-start gap-3">
                <div class="flex-1">
                    <p class="font-sans font-800 text-xs" x-text="t.title"></p>
                    <p class="mx-caption mt-1" x-text="t.message"></p>
                </div>
                <button type="button" class="mx-btn-ghost text-xs px-1" @click="dismiss(t.id)" aria-label="Dismiss">×</button>
            </div>
        </template>
    </div>
@endsection
