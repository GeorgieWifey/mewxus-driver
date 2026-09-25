<?php

namespace App\Http\Controllers;

use App\Models\Preset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Preset library.
 *
 * Serves both the htmx partial swaps (HTML) and the JSON API (used by the
 * configurator's own import/export, which never reloads the page). The response
 * shape follows the request's `Accept` header rather than living on two routes.
 */
class PresetController extends Controller
{
    /** Largest accepted preset body. A full 4-layer config is ~40 KB. */
    private const MAX_PAYLOAD_BYTES = 262_144;

    public function index(Request $request): View|JsonResponse
    {
        // There is no account system: every preset in the library is visible to
        // everyone with the link, and `is_public` marks the ones surfaced in the
        // browsable list rather than being an access-control flag.
        $presets = Preset::query()
            ->where('is_public', true)
            ->latest('updated_at')
            ->limit(60)
            ->get();

        if ($request->expectsJson()) {
            return response()->json(['presets' => $presets->map->toClient()]);
        }

        return view('presets._list', ['presets' => $presets]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:280'],
            'profile' => ['nullable', 'integer', 'min:0', 'max:3'],
            'payload' => ['required', 'array'],
            'is_public' => ['nullable', 'boolean'],
        ]);

        $encoded = json_encode($data['payload']);
        if ($encoded === false || strlen($encoded) > self::MAX_PAYLOAD_BYTES) {
            return response()->json(['error' => 'Preset payload is too large.'], 422);
        }

        // Count assigned slots on the base layer, not slot capacity. The keymap
        // array is 128 long but the board has 61 keys, so `count()` reports a
        // number that means nothing to the person reading the library.
        $baseLayer = $data['payload']['keymap'][0] ?? [];
        $assigned = count(array_filter(
            $baseLayer,
            static fn ($slot) => is_array($slot) && ($slot['type'] ?? 0) !== 0,
        ));

        $preset = Preset::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'profile' => $data['profile'] ?? 0,
            'payload' => $data['payload'],
            'is_public' => $request->boolean('is_public'),
            'key_count' => $assigned,
        ]);

        return response()->json(['preset' => $preset->toClient()], 201);
    }

    public function show(Request $request, Preset $preset): View|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json(['preset' => $preset->toClient()]);
        }

        return view('presets.show', ['preset' => $preset]);
    }

    public function update(Request $request, Preset $preset): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string', 'max:280'],
            'payload' => ['sometimes', 'array'],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['payload'])) {
            $encoded = json_encode($data['payload']);
            if ($encoded === false || strlen($encoded) > self::MAX_PAYLOAD_BYTES) {
                return response()->json(['error' => 'Preset payload is too large.'], 422);
            }
        }

        $preset->update($data);

        return response()->json(['preset' => $preset->fresh()->toClient()]);
    }

    public function destroy(Preset $preset): JsonResponse
    {
        $preset->delete();

        return response()->json(['deleted' => true]);
    }
}
