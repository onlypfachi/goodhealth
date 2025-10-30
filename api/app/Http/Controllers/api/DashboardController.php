<?php

namespace App\Http\Controllers\api;

use App\Enums\AppointmentStatusEnum;
use App\Enums\UserTypeEnum;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'totalPatients' => User::where('type', UserTypeEnum::PATIENT->value)->count(), // Example static data
            'activeDoctors' => User::where('type', UserTypeEnum::DOCTOR->value)->count(),   // Example static data
            'todaysAppointments' => 10,
            'avgWaitTime' => 15, // Example static data
            'message' => 'Dashboard stats endpoint',
        ], 200);
    }

    public function queueStatus(): JsonResponse
    {
        $departments = Department::with('doctors')->get();

        $data = $departments->map(function (Department $dept) {
            // Get all doctor IDs in this department
            $doctorIds = $dept->doctors()->pluck('id');

            // Count waiting (Pending) and in-progress (Confirmed) appointments
            $waiting = Appointment::whereIn('doctor_id', $doctorIds)
                ->where('status', AppointmentStatusEnum::Pending)
                ->count();

            $inProgress = Appointment::whereIn('doctor_id', $doctorIds)
                ->where('status', AppointmentStatusEnum::Confirmed)
                ->count();

            // Compute status level
            $status = 'low';
            if ($waiting >= 10) {
                $status = 'high';
            } elseif ($waiting >= 5) {
                $status = 'medium';
            }

            return [
                'department' => $dept->name,
                'waiting' => $waiting,
                'inProgress' => $inProgress,
                'status' => $status,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Department queue status data retrieved successfully.',
        ], 200);
    }

    public function alerts(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'totalPatients' => 120, // Example static data
            'activeDoctors' => 25,   // Example static data
            'todayAppointments' => 300, // Example static data
            'avgWaitingTime' => 15, // Example static data
            'message' => 'Dashboard stats endpoint',
        ], 200);
    }

    public function recentActivities(): JsonResponse
    {
        $activities = collect();

        // Fetch latest appointments
        $appointments = Appointment::latest()->take(5)->get()->map(function ($appointment) {
            return [
                'type' => 'appointment',
                'action' => strtolower($appointment->status->value),
                'description' => sprintf(
                    'Appointment %s for %s with Dr. %s',
                    strtolower($appointment->status->value),
                    $appointment->patient?->name ?? 'Unknown Patient',
                    $appointment->doctor?->name ?? 'Unknown Doctor'
                ),
                'time' => $appointment->updated_at,
            ];
        });

        // Fetch recently registered users
        $users = User::latest()->take(5)->get()->map(function ($user) {
            return [
                'type' => 'user',
                'action' => 'created',
                'description' => sprintf('New %s added: %s', ucfirst($user->type), $user->name),
                'time' => $user->created_at,
            ];
        });

        $activities = $activities->merge($appointments)->merge($users)
            ->sortByDesc('time')
            ->values();

        return response()->json([
            'success' => true,
            'data' => $activities,
            'message' => 'Recent activities fetched successfully',
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
