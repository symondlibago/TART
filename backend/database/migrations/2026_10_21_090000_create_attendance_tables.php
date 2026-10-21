<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_code')->unique();
            $table->string('name');
            $table->string('position')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('name');
            $table->index('is_active');
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();

            // The business date (Asia/Manila), decided by the server. Never
            // taken from the device, so changing a phone clock achieves nothing.
            $table->date('attendance_date');
            $table->timestampTz('timed_in_at');

            // Where the selfie lives. Nullable so photos can be purged in bulk
            // without losing the attendance record itself.
            $table->string('photo_path')->nullable();
            $table->string('photo_url')->nullable();
            $table->unsignedInteger('photo_bytes')->nullable();

            $table->timestamps();

            // The actual guarantee of "once per day". Two taps at the same
            // instant cannot both win: the second hits this constraint.
            $table->unique(['employee_id', 'attendance_date']);
            $table->index('attendance_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('employees');
    }
};
