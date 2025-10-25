<?php

namespace App\Enums;

enum AppointmentStatusEnum: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
    case NoShow = 'no_show';
    case Rescheduled = 'rescheduled';

    /**
     * Return a human-readable label for display in UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Confirmed => 'Confirmed',
            self::Cancelled => 'Cancelled',
            self::Completed => 'Completed',
            self::NoShow => 'No Show',
            self::Rescheduled => 'Rescheduled',
        };
    }

    /**
     * Define possible transitions if needed for workflow logic.
     */
    public function canTransitionTo(self $newStatus): bool
    {
        return match ($this) {
            self::Pending => in_array($newStatus, [self::Confirmed, self::Cancelled, self::Rescheduled]),
            self::Confirmed => in_array($newStatus, [self::Completed, self::Cancelled, self::NoShow, self::Rescheduled]),
            self::Completed, self::Cancelled, self::NoShow => false,
            self::Rescheduled => in_array($newStatus, [self::Confirmed, self::Cancelled]),
        };
    }

    /**
     * Commonly used helper to get all enum values as array.
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

}

