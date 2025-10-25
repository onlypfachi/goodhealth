<?php

namespace App\Data;

use App\Enums\UserTypeEnum;
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

    public function __construct(
        public int $id,
        public string $name,
        public string $email,
        public UserTypeEnum $type,
        public ?string $phoneNumber = null,
        public string $createdAt,
        public string $updatedAt,
    ) {
        // Compute the patient ID only if the user type is PATIENT
        $this->patientId = $this->type === UserTypeEnum::PATIENT
            ? sprintf('PAT-%04d', $this->id)
            : null;
    }
}

