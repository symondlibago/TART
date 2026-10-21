<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Stores attendance selfies.
 *
 * Uses Supabase Storage over its REST API when configured (no extra composer
 * package needed), and falls back to the local public disk so the feature
 * works before the bucket exists.
 *
 * Every image is re-encoded through GD rather than being written as received.
 * That matters because the upload endpoint is public: re-encoding discards
 * everything that is not pixels, and caps the file size no matter what the
 * client sent.
 */
class AttendancePhotoStorage
{
    /** Longest edge, in pixels. Plenty to recognise a face. */
    private const MAX_EDGE = 480;

    private const JPEG_QUALITY = 72;

    /** Guard before decoding, so a huge payload is rejected cheaply. */
    private const MAX_INPUT_BYTES = 3_000_000;

    public function enabled(): bool
    {
        return (bool) config('services.supabase.url');
    }

    private function bucket(): string
    {
        return config('services.supabase.bucket', 'attendance');
    }

    /**
     * @return array{path: string, url: string, bytes: int}
     */
    public function store(string $dataUrl, string $employeeCode, string $date): array
    {
        $jpeg = $this->normalise($dataUrl);

        $path = sprintf(
            '%s/%s-%s.jpg',
            $date,                                  // one folder per day, so a
            preg_replace('/[^A-Za-z0-9_-]/', '', $employeeCode), // day can be purged
            substr(bin2hex(random_bytes(4)), 0, 8)  // in a single call
        );

        return $this->enabled()
            ? $this->putToSupabase($path, $jpeg)
            : $this->putToLocalDisk($path, $jpeg);
    }

    /**
     * Delete many photos in as few calls as possible.
     *
     * @param  array<int, string>  $paths
     */
    public function deleteMany(array $paths): int
    {
        $paths = array_values(array_filter($paths));

        if ($paths === []) {
            return 0;
        }

        if (! $this->enabled()) {
            Storage::disk('public')->delete(
                array_map(fn ($p) => "attendance/{$p}", $paths)
            );

            return count($paths);
        }

        // Supabase takes the whole list in one request
        $response = Http::withHeaders($this->headers())
            ->delete($this->endpoint("/object/{$this->bucket()}"), ['prefixes' => $paths]);

        if ($response->failed()) {
            throw new RuntimeException('Supabase delete failed: ' . $response->body());
        }

        return count($paths);
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Decode, re-encode and shrink. Returns raw JPEG bytes.
     */
    private function normalise(string $dataUrl): string
    {
        if (preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,/', $dataUrl, $m)) {
            $dataUrl = substr($dataUrl, strlen($m[0]));
        }

        if (strlen($dataUrl) > self::MAX_INPUT_BYTES) {
            throw new RuntimeException('Photo is too large.');
        }

        $binary = base64_decode($dataUrl, true);

        if ($binary === false || $binary === '') {
            throw new RuntimeException('Photo is not valid base64 data.');
        }

        $image = @imagecreatefromstring($binary);

        if ($image === false) {
            throw new RuntimeException('Photo is not a readable image.');
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $scale = min(1, self::MAX_EDGE / max($width, $height));

        if ($scale < 1) {
            $resized = imagescale($image, (int) round($width * $scale), (int) round($height * $scale));
            imagedestroy($image);
            $image = $resized;
        }

        ob_start();
        imagejpeg($image, null, self::JPEG_QUALITY);
        $jpeg = ob_get_clean();
        imagedestroy($image);

        if ($jpeg === false || $jpeg === '') {
            throw new RuntimeException('Could not encode the photo.');
        }

        return $jpeg;
    }

    private function putToSupabase(string $path, string $jpeg): array
    {
        $response = Http::withHeaders($this->headers() + [
            'Content-Type' => 'image/jpeg',
            'x-upsert' => 'true',
        ])->withBody($jpeg, 'image/jpeg')
            ->post($this->endpoint("/object/{$this->bucket()}/{$path}"));

        if ($response->failed()) {
            throw new RuntimeException('Supabase upload failed: ' . $response->body());
        }

        return [
            'path' => $path,
            'url' => $this->endpoint("/object/public/{$this->bucket()}/{$path}"),
            'bytes' => strlen($jpeg),
        ];
    }

    private function putToLocalDisk(string $path, string $jpeg): array
    {
        Storage::disk('public')->put("attendance/{$path}", $jpeg);

        return [
            'path' => $path,
            'url' => rtrim(config('app.url'), '/') . "/storage/attendance/{$path}",
            'bytes' => strlen($jpeg),
        ];
    }

    private function headers(): array
    {
        $key = config('services.supabase.key');

        return [
            'Authorization' => "Bearer {$key}",
            'apikey' => $key,
        ];
    }

    private function endpoint(string $suffix): string
    {
        return rtrim(config('services.supabase.url'), '/') . '/storage/v1' . $suffix;
    }
}
