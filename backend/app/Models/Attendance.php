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
        'photo_path',
        'photo_url',
        'photo_bytes',
    ];

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
