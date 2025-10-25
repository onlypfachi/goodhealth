<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapInputName(SnakeCaseMapper::class)]
class AppointmentData extends Data
{
    public function __construct(
        public ?int $id,
        public int $patientId,
        public ?int $doctorId,
        public ?int $clinicId,
        public string $appointmentDate,
        public string $appointmentTime,
        public string $status,
        public string $reason,
        public ?string $notes,
        public int $createdBy,
        public ?string $confirmedAt,
        public ?string $cancelledAt,
        public ?string $completedAt,
        public ?int $tokenNumber,
        public ?string $roomNumber,
        public ?string $createdAt = null,
        public ?string $updatedAt = null,
    ) {}
}
