<?php

/**
 * Router for PHP's built-in server.
 *
 * `php -S` needs a router script because it has no rewrite engine: every request
 * that is not an existing file is handed to this script, which forwards it to
 * Laravel's front controller. This is the same arrangement `artisan serve` uses,
 * written out here so the container does not reach into vendor internals for a
 * file that may move between framework versions.
 *
 * Serving an existing file directly matters: Vite's build output under public/build
 * has to be returned verbatim (with its own content type), not run through PHP.
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');

// Reject traversal outright. The built-in server already normalises the path,
// but a router script that trusts its input is how static-file bugs happen.
if (str_contains($uri, '..')) {
    http_response_code(400);
    echo 'Bad request';
    return true;
}

$publicPath = realpath(__DIR__.'/../public');
$requested = realpath($publicPath.$uri);

if ($uri !== '/' && $requested !== false && str_starts_with($requested, $publicPath) && is_file($requested)) {
    // Let the server handle known static types itself so it sets the right
    // Content-Type and sends an efficient response.
    if (str_ends_with($requested, '.php')) {
        require $requested;
        return true;
    }

    return false;
}

require $publicPath.'/index.php';

return true;
