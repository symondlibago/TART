<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Services\AttendancePhotoStorage;
use App\Support\BusinessDate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Throwable;

class AttendanceController extends Controller
{
    /**
     * Attendance records, newest first. Defaults to today.
     *
     * ?date=YYYY-MM-DD      a single day
     * ?from=&to=            a range
     * ?search=              employee name or code
     */
    public function index(Request $request)
    {
        try {
            $query = Attendance::query()
                ->join('employees', 'employees.id', '=', 'attendances.employee_id')
                ->select([
                    'attendances.id',
                    'attendances.attendance_date',
                    'attendances.timed_in_at',
                    'attendances.photo_url',
                    'attendances.photo_path',
                    'attendances.photo_bytes',
                    'employees.name as employee_name',
                    'employees.employee_code',
                    'employees.position',
                ]);

            if ($date = $request->query('date')) {
                $query->where('attendances.attendance_date', $date);
            } elseif (($from = $request->query('from')) && ($to = $request->query('to'))) {
                $query->whereBetween('attendances.attendance_date', [$from, $to]);
            } else {
                $query->where('attendances.attendance_date', BusinessDate::today());
            }

            if ($search = $request->query('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('employees.name', 'ilike', "%{$search}%")
                        ->orWhere('employees.employee_code', 'ilike', "%{$search}%");
                });
            }

            $total = (clone $query)->getQuery()->getCountForPagination();

            $limit = min(max((int) $request->query('limit', 100), 1), 500);
            $offset = max((int) $request->query('offset', 0), 0);

            $records = $query
                ->orderByDesc('attendances.attendance_date')
                ->orderByDesc('attendances.timed_in_at')
                ->limit($limit)
                ->offset($offset)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $records,
                'server_date' => BusinessDate::today(),
                'meta' => [
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => $offset + $records->count() < $total,
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * How much space photos are using, grouped by day.
     *
     * This is what tells you which days are worth purging, without having to
     * list the bucket.
     */
    public function photoUsage()
    {
        try {
            $rows = DB::table('attendances')
                ->selectRaw('attendance_date, count(*) filter (where photo_path is not null)::int as photos')
                ->selectRaw('coalesce(sum(photo_bytes), 0)::bigint as bytes')
                ->whereNotNull('photo_path')
                ->groupBy('attendance_date')
                ->orderByDesc('attendance_date')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $rows,
                'total_bytes' => (int) $rows->sum('bytes'),
                'total_photos' => (int) $rows->sum('photos'),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to read photo usage',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete photos in bulk, by day or by range.
     *
     * The attendance rows are kept - only the images go. The record of who
     * turned up is tiny; the photos are what fill the 1GB.
     */
    public function purgePhotos(Request $request, AttendancePhotoStorage $photos)
    {
        $validator = Validator::make($request->all(), [
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $rows = Attendance::whereBetween('attendance_date', [
                $request->input('from'),
                $request->input('to'),
            ])->whereNotNull('photo_path')->get(['id', 'photo_path', 'photo_bytes']);

            if ($rows->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'No photos in that range.',
                    'deleted' => 0,
                    'freed_bytes' => 0,
                ]);
            }

            $freed = (int) $rows->sum('photo_bytes');

            // Supabase accepts the whole list at once, so this stays one call
            // no matter how many days are being cleared.
            $photos->deleteMany($rows->pluck('photo_path')->all());

            Attendance::whereIn('id', $rows->pluck('id'))->update([
                'photo_path' => null,
                'photo_url' => null,
                'photo_bytes' => null,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Deleted {$rows->count()} photo(s).",
                'deleted' => $rows->count(),
                'freed_bytes' => $freed,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete photos',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
