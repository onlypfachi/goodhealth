<?php

namespace App\Data;

use App\Enums\UserTypeEnum;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapInputName(SnakeCaseMapper::class)]
class UserData extends Data
{
    #[Computed]
    public ?string $patientId;

    #[Computed]
    public ?string $staffId;

    #[Computed]
    public ?string $empId;

    public function __construct(
        public int $id,
        public string $name,
        public string $email,
        public UserTypeEnum $type,
        public ?string $phoneNumber,
        public ?Carbon $lastLoginAt,
        public bool $isOnline,
        public ?string $gender,
        public ?string $dateOfBirth,
        public string $createdAt,
        public string $updatedAt,
        public ?DepartmentData $department = null,
        /** @var Collection<int, AppointmentData> */
        public ?Collection $patientAppointments = null,
        /** @var Collection<int, AppointmentData> */
        public ?Collection $doctorAppointments = null
    ) {
        // Compute the patient ID only if the user type is PATIENT
        $this->patientId = $this->type === UserTypeEnum::PATIENT
            ? sprintf('PAT-%04d', $this->id)
            : null;

        // Compute the staff ID for DOCTOR type
        $this->staffId = $this->type === UserTypeEnum::ADMIN
            ? sprintf('STF-%04d', $this->id)
            : null;

        // Compute the employee ID for DOCTOR type
        $this->empId = $this->type === UserTypeEnum::DOCTOR
            ? sprintf('EMP-%04d', $this->id)
            : null;
    }
}
