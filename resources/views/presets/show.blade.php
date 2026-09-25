{{--
    A shared preset, rendered for download.
    The raw payload is what the configurator imports, so it is served verbatim
    inside a <pre> rather than prettified into something that no longer round-trips.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $preset->name }} — Mewxus preset</title>
    @vite(['resources/css/app.css'])
</head>
<body class="min-h-full">
    <main class="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
        <a href="{{ route('configurator') }}" class="mx-btn-ghost text-xs self-start">← Back to Mewxus</a>

        <div class="mx-panel p-5 flex flex-col gap-3">
            <h1 class="mx-h1">{{ $preset->name }}</h1>

            @if ($preset->description)
                <p class="mx-body">{{ $preset->description }}</p>
            @endif

            <dl class="grid grid-cols-3 gap-2">
                <div class="mx-chip flex-col items-start">
                    <dt class="mx-label">profile</dt>
                    <dd class="mx-num">{{ $preset->profile }}</dd>
                </div>
                <div class="mx-chip flex-col items-start">
                    <dt class="mx-label">keys</dt>
                    <dd class="mx-num">{{ $preset->key_count }}</dd>
                </div>
                <div class="mx-chip flex-col items-start">
                    <dt class="mx-label">saved</dt>
                    <dd class="mx-num">{{ $preset->created_at?->format('Y-m-d') }}</dd>
                </div>
            </dl>

            <p class="mx-caption">
                Load this in Mewxus with <strong>Setup → Presets</strong>, or save the JSON
                below and import it.
            </p>
        </div>

        <div class="mx-panel p-5">
            <h2 class="mx-h3 mb-3">Payload</h2>
            <pre class="mx-inset p-3 overflow-x-auto text-[11px] font-mono">{{
                json_encode($preset->payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
            }}</pre>
        </div>
    </main>
</body>
</html>
