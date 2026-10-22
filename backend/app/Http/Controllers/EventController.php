<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Support\BusinessDate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class EventController extends Controller
{
    /**
     * Display a listing of events.
     *
     * Query params:
     *   ?search=   name / contact person / location
     *   ?status=   one exact status (matched against the computed status)
     *   ?date=     a single day
     *   ?scope=    active (default) hides Completed/Cancelled, archived shows only those
     *   ?limit=    page size (default 100, max 500)
     *   ?offset=   rows to skip
     */
    public function index(Request $request)
    {
        try {
            $effective = Event::effectiveStatusSql();
            $today = BusinessDate::sql();

            $query = Event::query()
                ->select(Event::COLUMNS)
                ->selectRaw("({$effective}) as status");

            if ($search = $request->query('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('event_name', 'ilike', "%{$search}%")
                        ->orWhere('contact_person', 'ilike', "%{$search}%")
                        ->orWhere('location', 'ilike', "%{$search}%");
                });
            }

            if ($status = $request->query('status')) {
                $query->whereRaw("({$effective}) = ?", [$status]);
            } elseif ($request->query('scope') === 'archived') {
                $query->whereIn('status', Event::TERMINAL_STATUSES);
            } else {
                $query->whereNotIn('status', Event::TERMINAL_STATUSES);
            }

            if ($date = $request->query('date')) {
                $query->whereDate('event_date', $date);
            }

            // Counted before the limit so the UI can say "showing 100 of 1,430".
            $total = (clone $query)->getQuery()->getCountForPagination();

            $limit = min(max((int) $request->query('limit', 100), 1), 500);
            $offset = max((int) $request->query('offset', 0), 0);

            // Nearest first: upcoming events ascending (soonest at the top),
            // then past events with the most recent first.
            $events = $query
                ->orderByRaw("case when event_date >= {$today} then 0 else 1 end")
                ->orderByRaw("case when event_date >= {$today} then (event_date + event_time) end asc")
                ->orderByRaw("case when event_date <  {$today} then (event_date + event_time) end desc")
                ->limit($limit)
                ->offset($offset)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $events,
                'meta' => [
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => $offset + $events->count() < $total,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch events',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created event.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), $this->rules());

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $data = $validator->validated();
            $data['status'] = Event::resolveStatus($data['status'] ?? null, $data['event_date']);

            $event = Event::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Event created successfully',
                'data' => $event,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create event',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display a single event.
     */
    public function show($id)
    {
        $event = Event::find($id);

        if (! $event) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $event,
        ]);
    }

    /**
     * Update an existing event.
     */
    public function update(Request $request, $id)
    {
        $event = Event::find($id);

        if (! $event) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), $this->rules(true));

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $data = $validator->validated();

            // The date may have moved, so the automatic status is recomputed
            // unless the event was explicitly marked Completed or Cancelled.
            if (array_key_exists('status', $data) || array_key_exists('event_date', $data)) {
                $data['status'] = Event::resolveStatus(
                    $data['status'] ?? $event->status,
                    $data['event_date'] ?? $event->event_date->toDateString()
                );
            }

            $event->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Event updated successfully',
                'data' => $event->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update event',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove an event.
     */
    public function destroy($id)
    {
        $event = Event::find($id);

        if (! $event) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
            ], 404);
        }

        try {
            $event->delete();

            return response()->json([
                'success' => true,
                'message' => 'Event deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete event',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update only the status of an event.
     */
    public function updateStatus(Request $request, $id)
    {
        $event = Event::find($id);

        if (! $event) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:' . implode(',', [...Event::STATUSES, Event::AUTO]),
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Sending "Auto" (or any automatic status) hands the event back to the
        // calendar, which is how "undo complete" works.
        $event->update([
            'status' => Event::resolveStatus(
                $request->input('status'),
                $event->event_date->toDateString()
            ),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status updated successfully',
            'data' => $event->fresh(),
        ]);
    }

    /**
     * Aggregate numbers for the dashboard.
     *
     * Supabase is remote and every round trip costs ~300ms, so this is
     * deliberately a single query: Postgres computes the totals, the monthly
     * series and the next events, then returns them as one JSON document.
     */
    public function statistics()
    {
        try {
            $today = now()->toDateString();

            $effective = Event::effectiveStatusSql();

            $sql = <<<SQL
                with scoped as (
                    select *, ({$effective}) as effective_status
                    from events
                ),
                totals as (
                    select
                        count(*)::int                                            as total_events,
                        coalesce(sum(pax), 0)::int                               as total_pax,
                        count(*) filter (where event_date >= :today)::int        as upcoming_events,
                        count(*) filter (
                            where date_trunc('month', event_date)
                                = date_trunc('month', :today::date)
                        )::int                                                   as events_this_month,
                        count(*) filter (where effective_status = 'Not Yet Started')::int as not_yet_started,
                        count(*) filter (where effective_status = 'Ongoing')::int         as ongoing,
                        count(*) filter (where effective_status = 'Pending')::int         as pending,
                        count(*) filter (where effective_status = 'Completed')::int       as completed,
                        count(*) filter (where effective_status = 'Cancelled')::int       as cancelled
                    from scoped
                ),
                -- generate_series keeps months with zero events in the chart
                months as (
                    select generate_series(
                        date_trunc('month', :today::date) - interval '5 months',
                        date_trunc('month', :today::date),
                        interval '1 month'
                    ) as bucket
                ),
                monthly as (
                    select
                        to_char(m.bucket, 'Mon YYYY')     as month,
                        count(e.id)::int                  as events,
                        coalesce(sum(e.pax), 0)::int      as pax
                    from months m
                    left join events e
                        on date_trunc('month', e.event_date) = m.bucket
                    group by m.bucket
                    order by m.bucket
                ),
                upcoming as (
                    select id, event_name, event_date, event_time, pax,
                           contact_person, location, remarks,
                           effective_status as status
                    from scoped
                    where event_date >= :today
                      and effective_status not in ('Completed', 'Cancelled')
                    order by event_date, event_time
                    limit 5
                )
                select json_build_object(
                    'totals',      (select row_to_json(t) from totals t),
                    'monthly',     (select coalesce(json_agg(row_to_json(m)), '[]'::json) from monthly m),
                    'next_events', (select coalesce(json_agg(row_to_json(u)), '[]'::json) from upcoming u)
                )::text as payload
            SQL;

            $raw = DB::selectOne($sql, ['today' => $today]);
            $result = json_decode($raw->payload, true);
            $totals = $result['totals'];

            return response()->json([
                'success' => true,
                'data' => [
                    'total_events' => $totals['total_events'],
                    'upcoming_events' => $totals['upcoming_events'],
                    'events_this_month' => $totals['events_this_month'],
                    'total_pax' => $totals['total_pax'],
                    'by_status' => [
                        'Not Yet Started' => $totals['not_yet_started'],
                        'Ongoing' => $totals['ongoing'],
                        'Pending' => $totals['pending'],
                        'Completed' => $totals['completed'],
                        'Cancelled' => $totals['cancelled'],
                    ],
                    'monthly' => $result['monthly'],
                    'next_events' => $result['next_events'],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to build statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Validation rules shared by store() and update().
     * On update every field is optional, so only what is sent gets changed.
     */
    private function rules(bool $isUpdate = false): array
    {
        $required = $isUpdate ? 'sometimes' : 'required';

        return [
            'event_name' => "{$required}|string|max:255",
            'event_date' => "{$required}|date",
            // Accept both "14:30" (from <input type="time">) and "14:30:00" (what Postgres returns)
            'event_time' => "{$required}|date_format:H:i,H:i:s",
            'pax' => "{$required}|integer|min:0",
            'contact_person' => "{$required}|string|max:255",
            'location' => "{$required}|string|max:255",
            // "Auto" is what the form sends for "let the date decide";
            // resolveStatus() turns it into a real status before saving.
            'status' => 'sometimes|in:' . implode(',', [...Event::STATUSES, Event::AUTO]),
            'remarks' => 'nullable|string',
        ];
    }
}
