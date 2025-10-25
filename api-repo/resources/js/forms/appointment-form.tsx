import React, { useState } from "react";
import { Listbox, Switch } from "@headlessui/react";

type User = { id: number; name: string };
type Clinic = { id: number; name: string };

type AppointmentFormProps = {
    patients: User[];
    doctors: User[];
    clinics: Clinic[];
    currentUserId: number;
    onSubmit: (data: any) => void;
};

const statusOptions = [
    "Pending",
    "Confirmed",
    "Cancelled",
    "Completed",
];

export default function AppointmentForm({
    patients,
    doctors,
    clinics,
    currentUserId,
    onSubmit,
}: AppointmentFormProps) {
    const [form, setForm] = useState({
        patient_id: "",
        doctor_id: "",
        clinic_id: "",
        appointment_date: "",
        appointment_time: "",
        status: statusOptions[0],
        reason: "",
        notes: "",
        created_by: currentUserId,
        token_number: "",
        room_number: "",
        confirmed_at: "",
        cancelled_at: "",
        completed_at: "",
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function handleSelect(name: string, value: any) {
        setForm({ ...form, [name]: value });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Patient */}
            <div>
                <label className="block font-medium">Patient</label>
                <Listbox value={form.patient_id} onChange={val => handleSelect("patient_id", val)}>
                    <Listbox.Button className="border px-2 py-1 w-full text-left">
                        {patients.find(p => p.id === form.patient_id)?.name || "Select patient"}
                    </Listbox.Button>
                    <Listbox.Options className="border mt-1 bg-white">
                        {patients.map(patient => (
                            <Listbox.Option key={patient.id} value={patient.id} className="px-2 py-1 cursor-pointer">
                                {patient.name}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Listbox>
            </div>

            {/* Doctor */}
            <div>
                <label className="block font-medium">Doctor</label>
                <Listbox value={form.doctor_id} onChange={val => handleSelect("doctor_id", val)}>
                    <Listbox.Button className="border px-2 py-1 w-full text-left">
                        {form.doctor_id
                            ? doctors.find(d => d.id === form.doctor_id)?.name
                            : "Select doctor"}
                    </Listbox.Button>
                    <Listbox.Options className="border mt-1 bg-white">
                        <Listbox.Option value="">None</Listbox.Option>
                        {doctors.map(doctor => (
                            <Listbox.Option key={doctor.id} value={doctor.id} className="px-2 py-1 cursor-pointer">
                                {doctor.name}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Listbox>
            </div>

            {/* Clinic */}
            <div>
                <label className="block font-medium">Clinic</label>
                <Listbox value={form.clinic_id} onChange={val => handleSelect("clinic_id", val)}>
                    <Listbox.Button className="border px-2 py-1 w-full text-left">
                        {form.clinic_id
                            ? clinics.find(c => c.id === form.clinic_id)?.name
                            : "Select clinic"}
                    </Listbox.Button>
                    <Listbox.Options className="border mt-1 bg-white">
                        <Listbox.Option value="">None</Listbox.Option>
                        {clinics.map(clinic => (
                            <Listbox.Option key={clinic.id} value={clinic.id} className="px-2 py-1 cursor-pointer">
                                {clinic.name}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Listbox>
            </div>

            {/* Date & Time */}
            <div>
                <label className="block font-medium">Date</label>
                <input
                    type="date"
                    name="appointment_date"
                    value={form.appointment_date}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full"
                    required
                />
            </div>
            <div>
                <label className="block font-medium">Time</label>
                <input
                    type="time"
                    name="appointment_time"
                    value={form.appointment_time}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full"
                    required
                />
            </div>

            {/* Reason */}
            <div>
                <label className="block font-medium">Reason</label>
                <textarea
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full"
                    required
                />
            </div>

            {/* Notes */}
            <div>
                <label className="block font-medium">Notes</label>
                <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full"
                />
            </div>

            {/* Token Number */}
            <div>
                <label className="block font-medium">Token Number</label>
                <input
                    type="number"
                    name="token_number"
                    value={form.token_number}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full"
                />
            </div>

            {/* Room Number */}
            <div>
                <label className="block font-medium">Room Number</label>
                <input
                    type="text"
                    name="room_number"
                    value={form.room_number}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full"
                />
            </div>
            <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded"
            >
                Create Appointment
            </button>
        </form>
    );
}