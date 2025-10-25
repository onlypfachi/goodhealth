<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Enums\AppointmentStatusEnum;
use Illuminate\Validation\Rule;

class UpdateAppointmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Only allow the patient who created the appointment OR an admin/doctor to update.
        $user = auth()->user();
        $appointment = $this->route('appointment');

        if (!$user) {
            return false;
        }

        // Example role-based logic (optional)
        if ($user->type === 'ADMIN' || $user->type === 'DOCTOR') {
            return true;
        }

        return $appointment && $appointment->patient_id === $user->id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'doctor_id' => ['nullable', 'exists:users,id'],
            'clinic_id' => ['nullable', 'exists:clinics,id'],
            'appointment_date' => ['required', 'date', 'after_or_equal:today'],
            'appointment_time' => ['required', 'date_format:H:i'],
            'reason' => ['required', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'status' => [
                'nullable',
                Rule::in(AppointmentStatusEnum::values()),
            ],
        ];
    }

    /**
     * Prepare the data before validation.
     */
    protected function prepareForValidation(): void
    {
        // Prevent changing status to invalid ones automatically (optional safeguard)
        $appointment = $this->route('appointment');

        if ($appointment && in_array($appointment->status, [
            AppointmentStatusEnum::Cancelled->value,
            AppointmentStatusEnum::Completed->value,
        ])) {
            // If appointment is completed or cancelled, restrict most updates
            $this->merge([
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'doctor_id' => $appointment->doctor_id,
            ]);
        }
    }

    /**
     * Custom error messages.
     */
    public function messages(): array
    {
        return [
            'appointment_date.after_or_equal' => 'The appointment date must be today or a future date.',
            'appointment_time.date_format' => 'Please provide a valid time in HH:MM format.',
            'status.in' => 'Invalid appointment status provided.',
        ];
    }
}

