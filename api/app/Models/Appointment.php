<?php

namespace App\Models;

use App\Enums\AppointmentStatusEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Appointment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'clinic_id',
        'appointment_date',
        'appointment_time',
        'status',
        'reason',
        'notes',
        'created_by',
        'confirmed_at',
        'cancelled_at',
        'completed_at',
        'token_number',
        'room_number',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'appointment_date' => 'date',
        'appointment_time' => 'datetime:H:i',
        'status' => AppointmentStatusEnum::class,
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    /* public function clinic(): BelongsTo */
    /* { */
    /*     return $this->belongsTo(Clinic::class); */
    /* } */

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }


    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', AppointmentStatusEnum::Pending);
    }

    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', AppointmentStatusEnum::Confirmed);
    }

    public function scopeForPatient(Builder $query, int $patientId): Builder
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeForDoctor(Builder $query, int $doctorId): Builder
    {
        return $query->where('doctor_id', $doctorId);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function isUpcoming(): bool
    {
        return $this->appointment_date->isFuture() &&
               $this->status === AppointmentStatusEnum::Confirmed;
    }

    public function markCompleted(): void
    {
        $this->update([
            'status' => AppointmentStatusEnum::Completed,
            'completed_at' => now(),
        ]);
    }

    public function markCancelled(): void
    {
        $this->update([
            'status' => AppointmentStatusEnum::Cancelled,
            'cancelled_at' => now(),
        ]);
    }
}

