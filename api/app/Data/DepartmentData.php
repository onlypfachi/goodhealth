<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class DepartmentData extends Data
{
    public function __construct(
        public string $id,
        public string $name,
    ) {}
}
