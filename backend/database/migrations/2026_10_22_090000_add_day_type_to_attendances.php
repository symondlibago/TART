<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            // Plain string rather than an enum: Postgres enums need raw SQL to
            // change later, and this list may well grow (Overtime, Leave...).
            $table->string('day_type')->default('Full Day')->after('timed_in_at');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn('day_type');
        });
    }
};
