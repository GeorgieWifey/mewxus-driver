<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Firmware proxy.
 *
 * The board's firmware image is vendored by the manufacturer behind a host we do
 * not control. Proxying it makes the updater work when the vendor host is slow,
 * blocks a mixed-content failure on an HTTPS deployment, and gives the image a
 * checksum we can verify before it is ever written to the bootloader.
 *
 * Because the target is *our* allowlist and never client input, this endpoint
 * cannot be turned into an SSRF primitive: the URL is a constant, and the host,
 * scheme and port are asserted before the request is made. `FILTER_VALIDATE_URL`
 * and a DNS-resolution check are defence in depth for the day someone edits the
 * constant.
 */
class FirmwareController extends Controller
{
    /**
     * The only firmware this board takes. Host is asserted again at request
     * time rather than trusted from config.
     */
    private const SOURCE_URL = 'https://yodall.keybord.net.cn/YODALL61_118.bin';

    private const SOURCE_HOST = 'yodall.keybord.net.cn';

    private const CACHE_KEY = 'firmware.latest';

    private const MAX_BYTES = 1_048_576;

    /** Firmware never changes within a session; an hour is generous and cheap. */
    private const CACHE_SECONDS = 3600;

    public function latest(Request $request): StreamedResponse
    {
        $this->assertSourceIsSafe(self::SOURCE_URL);

        $image = Cache::remember(self::CACHE_KEY, self::CACHE_SECONDS, function () {
            return $this->fetch();
        });

        $request->headers->set('Accept', 'application/octet-stream');

        return response()->streamDownload(function () use ($image) {
            echo $image['body'];
        }, 'YODALL61_118.bin', [
            'Content-Type' => 'application/octet-stream',
            'Content-Length' => (string) $image['length'],
            // The client verifies this before flashing; a mismatch aborts.
            'X-Firmware-Sha256' => $image['sha256'],
            'X-Firmware-Source-Host' => self::SOURCE_HOST,
        ]);
    }

    /**
     * Metadata only, so the UI can offer an update without downloading 224 KB
     * twice. Populates the cache on a miss: a reader that only reports what some
     * earlier request happened to cache would answer "unknown" forever, which is
     * exactly when the user pressed a button labelled "check".
     */
    public function meta(): \Illuminate\Http\JsonResponse
    {
        try {
            $image = Cache::remember(self::CACHE_KEY, self::CACHE_SECONDS, function () {
                $this->assertSourceIsSafe(self::SOURCE_URL);

                return $this->fetch();
            });

            return response()->json([
                'available' => true,
                'bytes' => $image['length'],
                'sha256' => $image['sha256'],
                'source_host' => self::SOURCE_HOST,
            ]);
        } catch (\Throwable $e) {
            // An unreachable vendor host is a normal condition here, not a 500.
            report($e);

            return response()->json([
                'available' => false,
                'source_host' => self::SOURCE_HOST,
                'error' => 'The firmware host could not be reached.',
            ]);
        }
    }

    private function fetch(): array
    {
        try {
            $response = Http::withOptions([
                // A redirect that changes host would escape the allowlist, so
                // redirects are simply not followed.
                'allow_redirects' => false,
                'timeout' => 20,
                'connect_timeout' => 10,
                // Reject a body that is not the image we expect, size-wise.
                'stream' => false,
            ])->get(self::SOURCE_URL);
        } catch (ConnectionException $e) {
            throw new RuntimeException('Could not reach the firmware host.', 0, $e);
        }

        if (! $response->successful()) {
            throw new RuntimeException('Firmware host returned HTTP '.$response->status().'.');
        }

        $body = $response->body();
        $length = strlen($body);

        if ($length === 0 || $length > self::MAX_BYTES) {
            throw new RuntimeException('Firmware image has an unexpected size.');
        }

        return [
            'body' => $body,
            'length' => $length,
            'sha256' => hash('sha256', $body),
        ];
    }

    /**
     * Assert the URL is https, has no credentials, no user-supplied parts, and
     * resolves only to public addresses.
     */
    private function assertSourceIsSafe(string $url): void
    {
        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            throw new RuntimeException('Firmware source is not a valid URL.');
        }

        if (strtolower($parts['scheme']) !== 'https') {
            throw new RuntimeException('Firmware source must use https.');
        }

        if ($parts['host'] !== self::SOURCE_HOST) {
            throw new RuntimeException('Firmware source host is not allowlisted.');
        }

        if (isset($parts['user']) || isset($parts['pass'])) {
            throw new RuntimeException('Firmware source must not carry credentials.');
        }

        if (isset($parts['port']) && ! in_array((int) $parts['port'], [443], true)) {
            throw new RuntimeException('Firmware source must use the default port.');
        }

        // Defence in depth: the allowlisted name must not resolve into a private
        // range, which would happen if DNS were poisoned.
        $addresses = gethostbynamel($parts['host']) ?: [];
        foreach ($addresses as $address) {
            if (filter_var(
                $address,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
            ) === false) {
                throw new RuntimeException('Firmware source resolved to a non-public address.');
            }
        }
    }
}
