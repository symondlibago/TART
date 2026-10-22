<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'attendance_date',
        'timed_in_at',
        'day_type',
        'photo_path',
        'photo_url',
        'photo_bytes',
    ];

    public const FULL_DAY = 'Full Day';

    public const HALF_DAY = 'Half Day';

    public const DAY_TYPES = [self::FULL_DAY, self::HALF_DAY];

    protected $casts = [
        'attendance_date' => 'date:Y-m-d',
        'timed_in_at' => 'datetime',
        'photo_bytes' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
