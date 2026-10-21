<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Nullable first so existing rows survive, then backfilled below.
            $table->string('username')->nullable()->after('name');
        });

        // Give everyone a username derived from their email, keeping it unique.
        $taken = [];

        foreach (DB::table('users')->select('id', 'email')->get() as $user) {
            $base = strtolower(preg_replace('/[^a-z0-9_-]/i', '', strstr($user->email, '@', true)));
            $base = $base !== '' ? $base : 'user';

            $candidate = $base;
            $n = 1;
            while (in_array($candidate, $taken, true)
                || DB::table('users')->where('username', $candidate)->exists()) {
                $candidate = $base . (++$n);
            }
            $taken[] = $candidate;

            DB::table('users')->where('id', $user->id)->update(['username' => $candidate]);
        }

        // Raw SQL rather than ->change(), which would need doctrine/dbal.
        DB::statement('alter table users alter column username set not null');

        Schema::table('users', function (Blueprint $table) {
            $table->unique('username');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};
