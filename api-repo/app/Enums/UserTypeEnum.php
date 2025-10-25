<?php

namespace App\Enums;

enum UserTypeEnum: string
{
    case PATIENT = 'PATIENT';

    case DOCTOR = 'DOCTOR';

    case ADMIN = 'ADMIN';

    case NURSE = 'NURSE';
}
