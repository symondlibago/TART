<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("events", function (Blueprint $table) {
            $table->id();

            $table->string("event_name");
            $table->date("event_date");
            $table->time("event_time");

            $table->unsignedInteger("pax")->default(0);
            $table->string("contact_person");
            $table->string("location");

            // Plain string instead of enum: on PostgreSQL an enum column is painful
            // to change later. Allowed values are enforced in EventController.
            $table->string("status")->default("Pending");

            $table->text("remarks")->nullable();

            $table->timestamps();

            $table->index("event_date");
            $table->index("status");
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("events");
    }
};
