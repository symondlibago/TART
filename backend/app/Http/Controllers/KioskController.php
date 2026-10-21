<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use App\Services\AttendancePhotoStorage;
use App\Support\BusinessDate;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Throwable;

/**
 * The endpoints the QR code leads to. These are deliberately public: an
 * employee scanning the code cannot be expected to log in.
 *
 * Nothing here trusts the client for the date or the time. "Today" always
 * comes from the server, which is what makes changing a phone clock pointless.
 */
class KioskController extends Controller
{
    /**
     * Everyone who can clock in, and whether they already have today.
     *
     * One query, one round trip: the left join against today's attendance is
     * what greys a name out, so no second request is needed to find out who
     * has already timed in.
     */
    public function employees()
    {
        try {
            $today = BusinessDate::sql();

            $employees = DB::select(<<<SQL
                select
                    e.id,
                    e.employee_code,
                    e.name,
                    e.position,
                    (a.id is not null)                        as timed_in,
                    to_char(
                        a.timed_in_at at time zone '{$this->tz()}',
                        'HH12:MI AM'
                    )                                         as timed_in_at
                from employees e
                left join attendances a
                    on a.employee_id = e.id
                   and a.attendance_date = {$today}
                where e.is_active
                order by e.name
            SQL);

            return response()->json([
                'success' => true,
                'data' => array_map(fn ($row) => [
                    'id' => (int) $row->id,
                    'employee_code' => $row->employee_code,
                    'name' => $row->name,
                    'position' => $row->position,
                    'timed_in' => (bool) $row->timed_in,
                    'timed_in_at' => $row->timed_in_at,
                ], $employees),
                'server_date' => BusinessDate::today(),
                'server_time' => BusinessDate::now()->format('g:i A'),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load employees',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Record a time in, with the photo that proves who showed up.
     */
    public function timeIn(Request $request, AttendancePhotoStorage $photos)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|integer|exists:employees,id',
            // A data URL from the camera canvas. Re-encoded before it is stored.
            'photo' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $employee = Employee::where('id', $request->input('employee_id'))
            ->where('is_active', true)
            ->first();

        if (! $employee) {
            return response()->json([
                'success' => false,
                'message' => 'That employee is no longer active.',
            ], 404);
        }

        $today = BusinessDate::today();

        // Cheap pre-check for a friendly message. The unique index below is
        // what actually enforces this.
        if (Attendance::where('employee_id', $employee->id)->where('attendance_date', $today)->exists()) {
            return response()->json([
                'success' => false,
                'already' => true,
                'message' => "{$employee->name} has already timed in today.",
            ], 409);
        }

        try {
            $stored = $photos->store($request->input('photo'), $employee->employee_code, $today);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Could not save the photo. Please try again.',
                'error' => $e->getMessage(),
            ], 422);
        }

        try {
            $attendance = Attendance::create([
                'employee_id' => $employee->id,
                'attendance_date' => $today,
                'timed_in_at' => now(),
                'photo_path' => $stored['path'],
                'photo_url' => $stored['url'],
                'photo_bytes' => $stored['bytes'],
            ]);
        } catch (QueryException $e) {
            // 23505 = unique violation: two taps landed at the same moment.
            if ($e->getCode() === '23505') {
                $photos->deleteMany([$stored['path']]);

                return response()->json([
                    'success' => false,
                    'already' => true,
                    'message' => "{$employee->name} has already timed in today.",
                ], 409);
            }

            throw $e;
        }

        return response()->json([
            'success' => true,
            'message' => "Welcome, {$employee->name}!",
            'data' => [
                'employee' => $employee->name,
                'date' => $today,
                'timed_in_at' => BusinessDate::now()->format('g:i A'),
                'attendance_id' => $attendance->id,
            ],
        ], 201);
    }

    private function tz(): string
    {
        return str_replace("'", '', BusinessDate::timezone());
    }
}
