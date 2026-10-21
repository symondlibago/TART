<?php

namespace App\Providers;

use App\Database\SafeBooleanPostgresConnection;
use Illuminate\Database\Connection;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Required because emulated prepares write PHP booleans as bare
        // integers, which PostgreSQL rejects. See the connection class.
        Connection::resolverFor('pgsql', function ($connection, $database, $prefix, $config) {
            return new SafeBooleanPostgresConnection($connection, $database, $prefix, $config);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
