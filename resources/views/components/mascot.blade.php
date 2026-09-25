{{--
    Pixel cat mascot.
    One inline SVG, no asset pipeline, so it inherits the current palette through
    CSS variables and can shift hue with the active concern without a second
    file. `state` drives only the CSS animation class.
--}}
@props(['state' => 'idle', 'size' => 56])

<svg
    {{ $attributes->merge(['class' => 'mascot']) }}
    data-state="{{ $state }}"
    width="{{ $size }}"
    height="{{ $size }}"
    viewBox="0 0 16 16"
    shape-rendering="crispEdges"
    role="img"
    aria-label="Mewxus mascot, {{ $state }}"
>
    {{-- Ears --}}
    <rect x="3" y="2" width="2" height="2" fill="var(--ct-text)"/>
    <rect x="11" y="2" width="2" height="2" fill="var(--ct-text)"/>
    <rect x="3" y="4" width="1" height="2" fill="var(--ct-text)"/>
    <rect x="12" y="4" width="1" height="2" fill="var(--ct-text)"/>

    {{-- Head --}}
    <rect x="3" y="5" width="10" height="7" fill="var(--ct-mauve)"/>
    <rect x="2" y="6" width="1" height="5" fill="var(--ct-text)"/>
    <rect x="13" y="6" width="1" height="5" fill="var(--ct-text)"/>
    <rect x="3" y="12" width="10" height="1" fill="var(--ct-text)"/>

    {{-- Eyes: open, or a flat line when asleep --}}
    @if ($state === 'idle')
        <rect x="5" y="8" width="2" height="2" fill="var(--ct-base)"/>
        <rect x="9" y="8" width="2" height="2" fill="var(--ct-base)"/>
    @else
        <rect x="5" y="9" width="2" height="1" fill="var(--ct-base)"/>
        <rect x="9" y="9" width="2" height="1" fill="var(--ct-base)"/>
    @endif

    {{-- Nose --}}
    <rect x="7" y="10" width="2" height="1" fill="var(--ct-pink)"/>

    {{-- Tail, only when live --}}
    @if ($state === 'live')
        <rect x="13" y="13" width="2" height="1" fill="var(--ct-mauve)"/>
        <rect x="14" y="12" width="1" height="1" fill="var(--ct-mauve)"/>
    @endif
</svg>
