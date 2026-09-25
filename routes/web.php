<?php

use App\Http\Controllers\FirmwareController;
use App\Http\Controllers\PresetController;
use Illuminate\Support\Facades\Route;

/*
 * Mewxus routing.
 *
 * There is exactly one interactive surface (`/`) and one deliberately plain
 * variant (`/classic`). Both render the same configurator; the difference is
 * only how the panels are arranged, so no route carries behaviour of its own.
 */

Route::view('/', 'configurator')->name('configurator');

// The familiar split-desk arrangement, kept for anyone who prefers the
// conventional layout the rolled composition deliberately avoids.
Route::view('/classic', 'classic')->name('classic');

Route::prefix('presets')->name('presets.')->group(function () {
    Route::get('/', [PresetController::class, 'index'])->name('index');
    Route::post('/', [PresetController::class, 'store'])->name('store');
    Route::get('{preset}', [PresetController::class, 'show'])->name('show');
    Route::patch('{preset}', [PresetController::class, 'update'])->name('update');
    Route::delete('{preset}', [PresetController::class, 'destroy'])->name('destroy');
});

Route::prefix('firmware')->name('firmware.')->group(function () {
    // Metadata only: safe to poll from the UI.
    Route::get('meta', [FirmwareController::class, 'meta'])->name('meta');
    // The image itself. The URL is a server-side constant, never client input.
    Route::get('latest', [FirmwareController::class, 'latest'])->name('latest');
});

