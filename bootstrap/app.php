<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        /*
         * Railway terminates TLS at its edge and forwards plain HTTP to this
         * container, so Laravel sees http:// for a site users reach over https://.
         * Without this, generated URLs point at http and — because the session
         * cookie is marked secure in production — the browser refuses to store it,
         * which looks like "the save button does nothing".
         *
         * The platform's proxy is trusted rather than `*`: `*` would also trust a
         * spoofable client-supplied X-Forwarded-For, letting a caller forge their
         * own address in the logs.
         */
        $middleware->trustProxies(
            at: env('TRUSTED_PROXIES', '127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16'),
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
