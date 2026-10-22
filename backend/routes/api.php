<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\KioskController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\HealthController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Routes for the Event Tracker. Everything except login/register requires a
| Sanctum bearer token, which the frontend stores after a successful login.
|
*/

// Preflight OPTIONS requests are handled by Laravel's HandleCors middleware,
// which is registered globally - no catch-all route needed.

Route::get('/health', [HealthController::class, 'deep']);

// Public routes
Route::post("/register", [AuthController::class, "register"]);
Route::post("/login", [AuthController::class, "login"]);

// Attendance kiosk. Public by necessity - an employee scanning the QR code
// has no account - so both routes are rate limited.
Route::middleware('throttle:60,1')->group(function () {
    Route::get("kiosk/employees", [KioskController::class, "employees"]);
});
Route::middleware('throttle:20,1')->group(function () {
    Route::post("kiosk/time-in", [KioskController::class, "timeIn"]);
});

// Protected routes
Route::middleware("auth:sanctum")->group(function () {
    Route::get("/user", [AuthController::class, "user"]);
    Route::post("/logout", [AuthController::class, "logout"]);

    // Account settings
    Route::put("/profile", [ProfileController::class, "update"]);
    Route::put("/profile/password", [ProfileController::class, "updatePassword"]);

    // Event Tracker
    Route::apiResource("events", EventController::class);
    Route::patch("events/{id}/status", [EventController::class, "updateStatus"]);
    Route::get("events-statistics", [EventController::class, "statistics"]);

    // Attendance administration
    Route::get("attendances", [AttendanceController::class, "index"]);
    Route::patch("attendances/{id}/day-type", [AttendanceController::class, "updateDayType"]);
    Route::get("attendances/photo-usage", [AttendanceController::class, "photoUsage"]);
    Route::delete("attendances/photos", [AttendanceController::class, "purgePhotos"]);

    Route::apiResource("employees", EmployeeController::class)->except(['show']);
});
