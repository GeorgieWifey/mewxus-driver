<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presets', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            // Public identifier. Slugged from the name, never from user input
            // verbatim, so no traversal or encoding reaches the path.
            $table->string('slug', 64)->unique();
            $table->string('description', 280)->nullable();
            // Whole configuration as decoded arrays: keymap, travel, lighting,
            // advanced modes, macros. Stored structurally so a preset stays
            // inspectable without the board attached.
            $table->json('payload');
            $table->unsignedTinyInteger('profile')->default(0);
            $table->unsignedSmallInteger('key_count')->default(0);
            $table->boolean('is_public')->default(false);
            $table->timestamps();

            $table->index(['is_public', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presets');
    }
};
