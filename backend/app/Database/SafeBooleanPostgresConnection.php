<?php

namespace App\Database;

use Illuminate\Database\PostgresConnection;

/**
 * Makes boolean bindings survive emulated prepared statements.
 *
 * We run PDO with ATTR_EMULATE_PREPARES on (see config/database.php) because
 * it turns every query from three round trips into one, which matters a lot
 * against a database in another country. The cost is that PDO interpolates
 * the bindings itself, and it writes PHP's `true` as a bare `1`. PostgreSQL
 * will not implicitly cast integer 1 to boolean, so any insert or where
 * clause touching a boolean column fails with:
 *
 *   column "is_active" is of type boolean but expression is of type integer
 *
 * Quoted 'true'/'false' are valid boolean literals, so converting here fixes
 * it everywhere - Eloquent, the query builder and raw bindings alike - rather
 * than needing a mutator on every model that has a boolean.
 */
class SafeBooleanPostgresConnection extends PostgresConnection
{
    public function prepareBindings(array $bindings)
    {
        foreach ($bindings as $key => $value) {
            if (is_bool($value)) {
                $bindings[$key] = $value ? 'true' : 'false';
            }
        }

        return parent::prepareBindings($bindings);
    }
}
