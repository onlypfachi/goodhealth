<?php

namespace App\Data;

use App\Enums\UserTypeEnum;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapInputName(SnakeCaseMapper::class)]
class UserData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public string $email,
        public UserTypeEnum $type,
        public string $createdAt,
        public string $updatedAt,
    ) {}
}
