<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DesignerUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create designer@benoya.com
        User::create([
            'name' => 'Designer User',
            'email' => 'designer@benoya.com',
            'password' => Hash::make('designer123'),
            'role' => 'designer',
        ]);
    }
}

