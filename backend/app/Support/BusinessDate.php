<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * "Today" according to the business, not according to the database server.
 *
 * Supabase runs in UTC. Using current_date would roll the day over at 08:00
 * Manila time, so an employee clocking in at 7am would be writing to the
 * previous day. Every date decision goes through here instead.
 *
 * Nothing here ever reads a date from the client, which is what stops someone
 * changing their phone clock to clock in twice.
 */
class BusinessDate
{
    public static function timezone(): string
    {
        return config('app.business_timezone', 'Asia/Manila');
    }

    /** Today's date in the business timezone, as 'YYYY-MM-DD'. */
    public static function today(): string
    {
        return Carbon::now(self::timezone())->toDateString();
    }

    public static function now(): Carbon
    {
        return Carbon::now(self::timezone());
    }

    /**
     * SQL expression for today's date, for use inside raw queries.
     *
     * The timezone comes from config, never from a request, so interpolating
     * it is safe.
     */
    public static function sql(): string
    {
        $tz = str_replace("'", '', self::timezone());

        return "((now() at time zone '{$tz}')::date)";
    }
}
