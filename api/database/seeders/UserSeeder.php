<?php

namespace Database\Seeders;

use App\Models\User;
use App\Enums\UserTypeEnum;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Common password for easy login in development
        $password = Hash::make('password123');

        // ✅ Admin user
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => $password,
            'type' => UserTypeEnum::ADMIN,
            'phone_number' => '0712000000',
            'gender' => 'Male',
            'date_of_birth' => '1990-01-01',
            'is_online' => false,
        ]);

        // ✅ Doctors
        $doctors = [
            ['name' => 'Dr. Sarah Moyo', 'email' => 'sarah@example.com', 'gender' => 'Female'],
            ['name' => 'Dr. John Dube', 'email' => 'john@example.com', 'gender' => 'Male'],
            ['name' => 'Dr. Lisa Chirwa', 'email' => 'lisa@example.com', 'gender' => 'Female'],
        ];

        foreach ($doctors as $index => $doctor) {
            User::create([
                'name' => $doctor['name'],
                'email' => $doctor['email'],
                'password' => $password,
                'type' => UserTypeEnum::DOCTOR,
                'phone_number' => '07720000' . ($index + 1),
                'department_id' => rand(1, 3), // assumes departments are seeded
                'gender' => $doctor['gender'],
                'date_of_birth' => '1985-05-10',
                'is_online' => false,
            ]);
        }

        // ✅ Patients
        $patients = [
            ['name' => 'Tendai Nyathi', 'email' => 'tendai@example.com', 'gender' => 'Male'],
            ['name' => 'Rudo Ncube', 'email' => 'rudo@example.com', 'gender' => 'Female'],
            ['name' => 'Blessing Moyo', 'email' => 'blessing@example.com', 'gender' => 'Male'],
        ];

        foreach ($patients as $index => $patient) {
            User::create([
                'name' => $patient['name'],
                'email' => $patient['email'],
                'password' => $password,
                'type' => UserTypeEnum::PATIENT,
                'phone_number' => '07880000' . ($index + 1),
                'gender' => $patient['gender'],
                'date_of_birth' => '2000-10-10',
                'is_online' => false,
            ]);
        }
    }
}
