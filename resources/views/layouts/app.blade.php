<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Mewxus — Nexus 61S configurator')</title>
    <meta name="description" content="A browser-local configurator for the Yodall Nexus 61S keyboard. No install, no driver — WebHID talks to the board directly.">
    <meta name="color-scheme" content="light">
    <meta name="theme-color" content="#eff1f5">
    {{-- Read by the preset/export fetch calls in app.js. Laravel's CSRF middleware
         rejects the POST without it, which would look like a broken save button. --}}
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-full">
    {{--
        The whole application is one Alpine component mounted at the root, so a
        panel deep in the tree can read device state without prop drilling or a
        second store. htmx is loaded for the preset library only; it never talks
        to the keyboard.
    --}}
    <div x-data="mewxus" x-init="boot()" class="min-h-full flex flex-col">
        @yield('body')
    </div>

    {{-- Confirm dialogs live outside the component tree so a browser-level
         dialog cannot be layered under a panel. --}}
    @stack('dialogs')
</body>
</html>
