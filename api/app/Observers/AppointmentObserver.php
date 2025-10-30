<?php

namespace App\Observers;

use App\Enums\AppointmentStatusEnum;
use App\Models\Appointment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class AppointmentObserver
{
    /**
     * Handle the Appointment "created" event.
     */
public function created(Appointment $appointment): void
{
    // Always set Pending
    $appointment->updateQuietly([
        'status' => AppointmentStatusEnum::Pending->value,
    ]);

    // Only proceed if doctor and date exist
    if (!$appointment->doctor_id || !$appointment->appointment_date) {
        return;
    }
Log::info('Assigning appointment time for appointment ID: ' . $appointment->id);

    // Get existing appointments for the same doctor & date
    $existingAppointments = Appointment::where('doctor_id', $appointment->doctor_id)
        ->whereDate('appointment_date', $appointment->appointment_date)
        ->whereNotNull('appointment_time')
        ->orderBy('appointment_time', 'desc')
        ->get();
        Log::info('Found ' . $existingAppointments->count() . ' existing appointments for doctor ID: ' . $appointment->doctor_id . ' on date: ' . $appointment->appointment_date);

    // ✅ Always use appointment_date for time anchors
    $baseStartTime = Carbon::parse($appointment->appointment_date)->setTime(8, 0, 0);
Log::info('Base start time set to: ' . $baseStartTime->toDateTimeString());
    if ($existingAppointments->isEmpty()) {
        $nextAvailableTime = $baseStartTime;
    } else {
        $lastAppointment = $existingAppointments->first();
        $lastTime = Carbon::parse($appointment->appointment_date . ' ' . $lastAppointment->appointment_time);
        $nextAvailableTime = $lastTime->copy()->addMinutes(25);
    }

    // Optional: cap day at 4PM
    $endOfDay = Carbon::parse($appointment->appointment_date)->setTime(16, 0, 0);
    if ($nextAvailableTime->greaterThan($endOfDay)) {
        $appointment->updateQuietly([
            'appointment_time' => null,
        ]);
        return;
    }

    Log::info('Next available time for appointment ID ' . $appointment->id . ' is ' . $nextAvailableTime->toDateTimeString());

    // ✅ Update correctly anchored time
    $appointment->updateQuietly([
        'appointment_time' => $nextAvailableTime->format('Y-m-d H:i:s'),
    ]);
}


    public function updated(Appointment $appointment): void {}
    public function deleted(Appointment $appointment): void {}
    public function restored(Appointment $appointment): void {}
    public function forceDeleted(Appointment $appointment): void {}
}
