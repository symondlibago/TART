<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS) Configuration
|--------------------------------------------------------------------------
|
| The frontend is served from a different domain to the API, so it has to be
| named here. FRONTEND_URL takes a comma separated list, which covers the
| deployed site plus any preview URLs.
|
| Falls back to "*" only when nothing is configured, so local development
| keeps working without setup. Never leave it unset in production.
|
*/

$origins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('FRONTEND_URL', ''))
)));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $origins ?: ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 60 * 60 * 12,

    // Auth uses bearer tokens in the Authorization header, not cookies, so
    // credentialed requests are not needed. Keeping this false also avoids the
    // browser rejecting a wildcard origin.
    'supports_credentials' => false,

];
