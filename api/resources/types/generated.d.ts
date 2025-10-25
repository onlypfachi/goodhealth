declare namespace App.Data {
export type AppointmentData = {
id: number | null;
patient_id: number;
doctor_id: number | null;
clinic_id: number | null;
appointment_date: string;
appointment_time: string;
status: string;
reason: string;
notes: string | null;
created_by: number;
confirmed_at: string | null;
cancelled_at: string | null;
completed_at: string | null;
token_number: number | null;
room_number: string | null;
created_at: string | null;
updated_at: string | null;
};
}
declare namespace App.Enums {
export type AppointmentStatusEnum = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled';
export type UserTypeEnum = 'PATIENT' | 'DOCTOR' | 'CLINIC_MANAGER' | 'NURSE';
}
