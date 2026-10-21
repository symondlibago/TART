<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Liveness endpoint for the host's health check.
 *
 * Deliberately does not touch the database on the root route: a brief Supabase
 * hiccup should not make the host think the app is dead and restart it.
 * /api/health is the deeper check, for when you want to know about the DB.
 */
class HealthController extends Controller
{
    public function __invoke()
    {
        return response()->json([
            'application' => config('app.name'),
            'status' => 'ok',
        ]);
    }

    public function deep()
    {
        try {
            DB::select('select 1');
            $database = 'ok';
        } catch (Throwable $e) {
            $database = 'unreachable';
        }

        return response()->json([
            'status' => $database === 'ok' ? 'ok' : 'degraded',
            'database' => $database,
        ], $database === 'ok' ? 200 : 503);
    }
}
