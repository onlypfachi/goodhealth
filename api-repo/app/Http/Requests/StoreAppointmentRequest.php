<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Enums\AppointmentStatusEnum;

class StoreAppointmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Usually patients can create appointments, so we return true.
        // You can add role-based logic if needed (e.g., only PATIENT users).
        return auth()->check();
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
            'status' => ['nullable', 'in:' . implode(',', AppointmentStatusEnum::values())],
        ];
    }

    /**
     * Modify or merge additional data before validation if needed.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'status' => $this->status ?? AppointmentStatusEnum::Pending->value,
            'patient_id' => auth()->id(), // Automatically set the current user as patient
        ]);
    }

    /**
     * Custom messages (optional, improves UX).
     */
    public function messages(): array
    {
        return [
            'appointment_date.after_or_equal' => 'The appointment date must be today or a future date.',
            'appointment_time.date_format' => 'Please provide a valid time in HH:MM format.',
            'reason.required' => 'Please explain why you are making this appointment.',
        ];
    }
}

