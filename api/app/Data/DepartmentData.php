<?php

namespace App\Data;

use Illuminate\Support\Collection;
use Spatie\LaravelData\Data;

class DepartmentData extends Data
{
    public function __construct(
        public string $id,
        public string $name,
        public string $description,
        /** @var Collection<int, UserData> */
        public ?Collection $doctors= null,
    ) {}
}
