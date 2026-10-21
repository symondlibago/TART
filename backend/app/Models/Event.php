<?php

namespace App\Models;

use App\Support\BusinessDate;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Event extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'event_name',
        'event_date',
        'event_time',
        'pax',
        'contact_person',
        'location',
        'status',
        'remarks',
    ];

    protected $casts = [
        'event_date' => 'date:Y-m-d',
        'pax' => 'integer',
    ];

    /** Statuses the calendar decides for us. */
    public const AUTO_STATUSES = ['Not Yet Started', 'Ongoing', 'Pending'];

    /** Statuses a person decides, which the calendar must never overwrite. */
    public const TERMINAL_STATUSES = ['Completed', 'Cancelled'];

    public const STATUSES = [
        'Not Yet Started',
        'Ongoing',
        'Pending',
        'Completed',
        'Cancelled',
    ];

    /** Accepted as input to mean "let the date decide". */
    public const AUTO = 'Auto';

    /**
     * The status as it should be seen right now.
     *
     * Kept as SQL so a listing never needs a follow-up write to stay current:
     * a stored 'Ongoing' from yesterday reads back as 'Pending' today without
     * anything having to run in the background.
     *
     * Compared against the business date, not current_date, because the
     * database runs in UTC and would flip the day over at 08:00 Manila time.
     */
    public static function effectiveStatusSql(): string
    {
        $today = BusinessDate::sql();

        return <<<SQL
            case
                when status in ('Completed', 'Cancelled') then status
                when event_date = {$today} then 'Ongoing'
                when event_date <  {$today} then 'Pending'
                else 'Not Yet Started'
            end
        SQL;
    }

    /** Columns to select alongside the computed status. */
    public const COLUMNS = [
        'id', 'event_name', 'event_date', 'event_time', 'pax',
        'contact_person', 'location', 'remarks', 'created_at', 'updated_at',
    ];

    /**
     * What the date alone implies for an event on $date.
     */
    public static function autoStatusFor(string $date): string
    {
        $eventDay = Carbon::parse($date)->startOfDay();
        $today = BusinessDate::now()->startOfDay();

        if ($eventDay->equalTo($today)) {
            return 'Ongoing';
        }

        return $eventDay->lessThan($today) ? 'Pending' : 'Not Yet Started';
    }

    /**
     * Decide what to store: a person's choice wins, otherwise the date does.
     */
    public static function resolveStatus(?string $input, string $date): string
    {
        if (in_array($input, self::TERMINAL_STATUSES, true)) {
            return $input;
        }

        return self::autoStatusFor($date);
    }
}
