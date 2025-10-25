<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            [ 'name' => 'General Medicine', 'description' => 'General medical consultations and treatment' ],
            [ 'name' => 'Cardiology', 'description' => 'Heart and cardiovascular system care' ],
            [ 'name' => 'Pediatrics', 'description' => 'Medical care for infants, children, and adolescents' ],
            [ 'name' => 'Orthopedics', 'description' => 'Musculoskeletal system treatment' ],
            [ 'name' => 'Dermatology', 'description' => 'Skin, hair, and nail care' ],
            [ 'name' => 'Neurology', 'description' => 'Nervous system disorders treatment' ],
            [ 'name' => 'Obstetrics & Gynecology', 'description' => 'Women\'s health and pregnancy care' ],
            [ 'name' => 'Emergency Medicine', 'description' => 'Emergency and urgent care services' ],
            [ 'name' => 'Internal Medicine', 'description' => 'Adult disease prevention and treatment' ],
            [ 'name' => 'Surgery', 'description' => 'Surgical procedures and interventions' ],
        ];

        foreach ($departments as $deptData) {
            $department = Department::create($deptData);

            // Create 3 doctors for each department
            for ($i = 1; $i <= 3; $i++) {
                User::factory()->create([
                    'name' => fake()->name(),
                    'email' => fake()->unique()->safeEmail(),
                    'password' => Hash::make('password'),
                    'phone_number' => fake('zw')->phoneNumber(),
                    'type' => 'DOCTOR',
                    'department_id' => $department->id,
                ]);
            }
        }
    }
}

