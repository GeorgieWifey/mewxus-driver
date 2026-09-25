{{--
    Preset library list. Swapped in by htmx, so it must be self-contained and
    must not rely on the Alpine component's scope.
--}}
@if ($presets->isEmpty())
    <p class="mx-caption mt-2">
        No presets saved yet. Configure the board, name it above, and save —
        it will appear here with a link you can share.
    </p>
@else
    <ul class="flex flex-col gap-2 mt-2">
        @foreach ($presets as $preset)
            <li class="mx-chip flex-col items-stretch gap-1">
                <div class="flex items-center justify-between gap-2">
                    <span class="font-sans font-700 text-xs">{{ $preset->name }}</span>
                    <span class="font-mono text-[10px] text-ink-faint">
                        {{ $preset->updated_at?->diffForHumans() }}
                    </span>
                </div>
                @if ($preset->description)
                    <p class="mx-caption">{{ $preset->description }}</p>
                @endif
                <div class="flex items-center gap-2 mt-1">
                    <a
                        href="{{ route('presets.show', $preset) }}"
                        class="mx-btn-ghost text-[11px] px-1"
                        target="_blank"
                        rel="noopener"
                    >open</a>
                    <a
                        href="{{ route('presets.show', $preset) }}"
                        class="mx-btn-ghost text-[11px] px-1"
                        download="{{ $preset->slug }}.json"
                    >download</a>
                    <span class="mx-caption">{{ $preset->key_count }} keys</span>
                </div>
            </li>
        @endforeach
    </ul>
@endif
