<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * A saved board configuration.
 *
 * `payload` holds the whole configuration as decoded arrays rather than a blob
 * of device bytes. Two reasons: a preset has to be inspectable and diffable
 * without the board attached, and slot ordering differs between firmware
 * revisions, so storing raw bytes would silently misapply after an update.
 */
class Preset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'payload',
        'profile',
        'key_count',
        'is_public',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'is_public' => 'boolean',
            'profile' => 'integer',
            'key_count' => 'integer',
        ];
    }

    /**
     * Publicly reachable presets only. Private presets are addressed by slug
     * and never listed.
     */
    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected static function booted(): void
    {
        static::creating(function (self $preset) {
            if (blank($preset->slug)) {
                $preset->slug = static::uniqueSlug($preset->name);
            }
        });
    }

    /** Short, readable, collision-free slug. No user input reaches the path. */
    public static function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'preset';
        $base = Str::limit($base, 48, '');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = $attempt === 0
                ? $base
                : $base.'-'.Str::lower(Str::random(6));

            if (! static::where('slug', $candidate)->exists()) {
                return $candidate;
            }
        }

        return $base.'-'.Str::lower(Str::random(12));
    }

    /** Shape sent to the browser. Keeps the JSON contract in one place. */
    public function toClient(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'profile' => $this->profile,
            'key_count' => $this->key_count,
            'is_public' => $this->is_public,
            'payload' => $this->payload,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
