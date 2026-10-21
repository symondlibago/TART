<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HealthController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| This app is API only - the UI is the separate React frontend. The root
| route reports that the service is up, which is what the host polls.
|
| An invokable controller rather than a closure, so `route:cache` works.
|
*/

Route::get('/', HealthController::class);
