<?php

namespace App\Http\Controllers\api;

use App\Data\AppointmentData;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $appointments = Appointment::query()->with(['doctor.department', 'patient'])->where('patient_id', $request->user()->id)->get();

        return response()->json(
            [
                'success' => true,
                'appointments' => AppointmentData::collect($appointments)],
            200);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'doctor_id' => 'nullable|exists:users,id',
            'appointment_date' => 'required|date',
            'appointment_time' => 'nullable',
            'status' => 'nullable|string|max:255',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
            'confirmed_at' => 'nullable|date',
            'cancelled_at' => 'nullable|date',
            'completed_at' => 'nullable|date',
            'queue_number' => 'nullable|integer',
            'room_number' => 'nullable|string|max:255',
        ]);

        // enforce patient and creator as the authenticated user
        $data = array_merge($validated, [
            'patient_id' => $request->user()->id,
            'created_by' => $request->user()->id,
        ]);

        $appointment = Appointment::create($data);

        return response()->json([
            'success' => true,
            'appointment' => AppointmentData::from($appointment),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Appointment $appointment)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Appointment $appointment)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Appointment $appointment)
    {
        //
    }
}
