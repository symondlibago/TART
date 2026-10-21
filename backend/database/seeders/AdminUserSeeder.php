<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create admin1@benoya.com
        User::create([
            'name' => 'Admin One',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        // Create admin2@benoya.com
        User::create([
            'name' => 'Admin Two',
            'email' => 'admin2@benoya.com',
            'password' => Hash::make('adminpasswordbenoya2'),
            'role' => 'admin',
        ]);

        // Create admin3@benoya.com
        User::create([
            'name' => 'Admin Three',
            'email' => 'admin3@benoya.com',
            'password' => Hash::make('adminpasswordbenoya2'),
            'role' => 'admin',
        ]);
    }
}

